# 部署 SOP（Blog → 生产服务器）

> 部署 = 推 main 触发 CI 构建 + **CI 自动 SSH 部署（含健康门禁与自动回滚）**。Agent 部署前必读本页，禁止跳步或自行猜测。
> 本目录改动不触发 CI（workflow 里 `paths-ignore: docs/**`）。

## 架构链路（已验证）

```plain
本地 commit → push origin main
  → GitHub Actions (.github/workflows/docker-image.yml)
  → build-and-push job：构建 dynamic target 镜像 → 推 GHCR（ghcr.io/youki258/astro-koharu:latest + :<sha>）
  → deploy job：SSH 到服务器 → compose pull → up -d → 健康门禁（120s 内不 healthy 自动回滚上一镜像并 fail）
```

- **博客跑在 `az` 主机**（Azure 13.75.72.66:2233，见 `~/.ssh/config`），容器名 `astro-koharu`，compose 目录 `/opt/blog`，compose 固定引用 `:latest`。
- **`youki` 主机（阿里云）上没有博客**，别去那台找。
- 站点地址：`https://blog.youki.fun`（youki.fun 301 跳转过来）。
- CI 部署用的 SSH 凭据存在仓库 secrets：`DEPLOY_HOST / DEPLOY_PORT / DEPLOY_USER / DEPLOY_SSH_KEY`。

## 标准部署步骤

### 1. 本地验证与推送

```bash
pnpm check            # 必跑；改了 lint 范围内的文件再跑 pnpm lint
git add <改动文件>     # 只加本次相关文件，不带未跟踪杂物（如 PLAN.md）
git commit -m "<type>: <subject>"
git push origin main
```

### 2. 盯 CI 到结束（含自动部署）

```bash
gh run list --repo youki258/astro-koharu --limit 3   # 拿本次 run id
gh run watch <run-id> --repo youki258/astro-koharu --exit-status --interval 15
```

- `build-and-push` 失败 → 修代码重新推，不要碰服务器。
- `deploy` 失败 → 服务器上已自动回滚到旧镜像（deploy job 内置），查 job 日志定位原因。

### 3. 线上验证（没有证据不说完成）

```bash
curl -sL -o /dev/null -w '%{http_code} %{size_download} %{url_effective}\n' https://youki.fun/favicon.ico
```

状态 200 + 字节数与改动资源一致才算完成。浏览器侧看效果需 Ctrl+F5 强刷，favicon 缓存极顽固，可开无痕窗口。

## 手动部署（fallback：CI deploy job 失败或紧急时）

```bash
ssh az "cd /opt/blog && sudo docker compose pull astro-koharu && sudo docker compose up -d astro-koharu"
ssh az "sudo docker ps --filter name=astro-koharu --format '{{.Image}}\t{{.Status}}'"
```

容器必须显示新镜像 ID + healthy。`pull` 只下载不换容器，**必须再执行 `up -d`**。

## 回滚（可执行版）

旧镜像在 pull 后仍留在服务器本地。把本地旧镜像重新打上 `:latest` 标签并重建即可：

```bash
ssh az "sudo docker images --format '{{.ID}}\t{{.CreatedSince}}' ghcr.io/youki258/astro-koharu   # 找旧镜像 ID"
ssh az "cd /opt/blog && sudo docker tag <旧镜像ID> ghcr.io/youki258/astro-koharu:latest && sudo docker compose up -d astro-koharu"
```

CI deploy job 的自动回滚用的就是这个机制（`docker tag <prev> …:latest` + `up -d`），下一次成功构建的 pull 会把 `:latest` 标签重新指向新镜像。

## 已踩过的坑

1. **docker pull 卡死**：`Pulling fs layer` 超过 5 分钟无进度，但 `curl` 测 GHCR 下载速度正常 → docker 并发层下载连接挂死。**已于 2026-09-20 根治**：az 写入 `/etc/docker/daemon.json` 设 `max-concurrent-downloads: 2` 并重启 docker。若复发再按 kill+重试处理：`sudo pkill -f "docker pull ghcr.io/youki258/astro-koharu"` 后重试，已下载层不丢。
2. **判断进度看 `sudo docker images` 的镜像 ID 和创建时间，不要只信 pull 日志 tail（有输出缓冲，会骗人）。**
3. **长任务放服务器后台跑**：`nohup … > /tmp/blog-pull.log 2>&1 &` 后轮询；本地 ssh 超时不影响服务器上的进程。
4. **compose 目录认准 `/opt/blog/docker-compose.yml`**：仓库里的 `docker/docker-compose*.yml` 是本地开发用的，别拿到服务器上用。
5. **"之前都快这次慢"**：动态阶段 237MB 依赖层只在 `pnpm-lock.yaml` 或基础镜像变化时重建，平时只拉 ~110MB dist 增量；依赖层恰好变更时全量重拉属正常波动。
6. **改 `/etc/docker/daemon.json` 需重启 docker**：会短暂重启所有容器（均有 unless-stopped 策略会自动拉起），选低峰时段。
