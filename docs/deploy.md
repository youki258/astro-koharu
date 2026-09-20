# 部署 SOP（Blog → 生产服务器）

> 部署生产 = 推 main 触发 CI 构建镜像 + 服务器拉镜像重建容器。**Agent 部署前必读本页，禁止跳步或自行猜测。**
> 本目录改动不会触发 CI（workflow 里 `paths-ignore: docs/**`）。

## 架构链路（已验证）

```plain
本地 commit → push origin main
  → GitHub Actions (.github/workflows/docker-image.yml)
  → 构建 dynamic target 镜像 → 推 GHCR（ghcr.io/youki258/astro-koharu:latest + :<sha>）
  → 服务器拉镜像 → docker compose up -d 重建容器
```

- **博客跑在 `az` 主机**（Azure，见 `~/.ssh/config`），容器名 `astro-koharu`，compose 目录 `/opt/blog`。
- **`youki` 主机（阿里云）上没有博客**，别去那台找。
- 站点地址：`https://blog.youki.fun`（youki.fun 301 跳转过来）。

## 标准部署步骤

### 1. 本地验证与推送

```bash
pnpm check            # 必跑；改了 lint 范围内的文件再跑 pnpm lint
git add <改动文件>     # 只加本次相关文件，不带未跟踪杂物（如 PLAN.md）
git commit -m "<type>: <subject>"
git push origin main
```

### 2. 盯 CI

```bash
gh run list --repo youki258/astro-koharu --limit 3   # 拿到本次 run id
gh run watch <run-id> --repo youki258/astro-koharu --exit-status --interval 15
gh run view <run-id> --repo youki258/astro-koharu --json status,conclusion -q '.status+" / "+(.conclusion//"-")'
```

必须等到 `completed / success` 才能进第 3 步。失败先看日志，别去服务器拉旧镜像瞎试。

### 3. 服务器拉镜像 + 重建容器

```bash
ssh az "cd /opt/blog && sudo docker compose pull astro-koharu && sudo docker compose up -d astro-koharu"
ssh az "sudo docker ps --filter name=astro-koharu --format '{{.Image}}\t{{.Status}}'"
```

容器必须显示 **新镜像 ID + healthy**。`pull` 只下载不换容器，**必须再执行 `up -d`**。

### 4. 线上验证（三件套，缺一不可）

```bash
# 服务器本机端口
ssh az "curl -s -o /dev/null -w '%{http_code} %{size_download}\n' http://127.0.0.1:4321/favicon.ico"
# 公网链路
curl -sL -o /dev/null -w '%{http_code} %{size_download} %{url_effective}\n' https://youki.fun/favicon.ico
```

- 状态 200 + 字节数与改动资源一致才算完成；没有证据不说完成。
- 浏览器侧验证需 Ctrl+F5 强刷，favicon 缓存极顽固，可开无痕窗口。

## 已踩过的坑（按症状对症处理）

1. **docker pull 卡死**（最常见）：`Pulling fs layer` 超过 5 分钟无进度行，但 `curl` 测 GHCR 下载速度正常（~9 MB/s）→ 是 docker 并发层下载连接挂死，不是网速问题。
   - 处理：`sudo pkill -f "docker pull ghcr.io/youki258/astro-koharu"` 后重试；已下载的层不会丢。
   - **判断进度看 `sudo docker images` 的镜像 ID 和创建时间，不要只信 pull 日志 tail（有缓冲，会骗人）。**
2. **"之前都很快，这次怎么慢"**：以前快 = 1GB 依赖层缓存命中，只拉几十 MB 增量；CI 缓存没对上时整张 ~350MB 全量重拉，加上坑 1 的挂死，会显得极慢。这是正常波动，按上面处理即可。
3. **超时不要盲目重试整机命令**：长任务放服务器后台 `nohup … > /tmp/blog-pull.log 2>&1 &`，然后轮询日志 + `docker images`；本地 ssh 命令超时被打断不影响服务器上的进程。
4. **compose 目录认准 `/opt/blog/docker-compose.yml`**：仓库里的 `docker/docker-compose*.yml` 是本地开发用的，别拿到服务器上用。

## 回滚

```bash
ssh az "cd /opt/blog && sudo docker compose down && \
  sudo docker run --rm ghcr.io/youki258/astro-koharu:<旧sha> true 2>/dev/null; \
  # 把 docker-compose.yml 里 image 临时改成 :<旧sha>，再 up -d；或直接等下一次修复推送"
```

优先方式是推修复提交走同一条链路；按 sha 回滚仅用于紧急止血。
