---
title: VSCode + SSH + Docker 完整配置流程
link: 'vscode-ssh-docker'
description: 从全新 Linux 机器到 VSCode 免密管理 Docker 的完整可复用配置流程
date: 2026-04-25T00:00:00.000Z
updated: 2026-04-25T00:00:00.000Z
tags: [VSCode, SSH, Docker]
categories: [[笔记, 工具]]
---

以下是一份**完整的、可复用的配置流程**，从一台全新的 Linux 机器到 VSCode 免密管理 Docker，按顺序执行即可。

---

## 1. Linux 端准备

### 1.1 开启 SSH 服务

**Kali Linux：**
```bash
# 启动 SSH
sudo /etc/init.d/ssh start

# 开机自启
sudo systemctl enable ssh.service
```

**Ubuntu/Debian：**
```bash
# 安装并启动
sudo apt-get update
sudo apt-get install -y openssh-server
sudo service ssh start
```

### 1.2 查看 IP 地址
```bash
ip a
```
记下 `inet` 后面的局域网 IP（如 `192.168.17.129`）。

---

## 2. Windows 端准备

### 2.1 安装 VSCode 插件
打开 VSCode，安装以下扩展：
- **Remote - SSH**
- **Docker**

### 2.2 生成 SSH 密钥对
打开 **PowerShell**，执行：
```powershell
ssh-keygen -t ed25519
```
- 保存路径：直接回车（默认 `C:\Users\你的用户名\.ssh\id_ed25519`）
- 密码：直接回车（不设密码，实现完全免密）

生成后确认文件存在：
```powershell
ls $env:USERPROFILE\.ssh\
```
应看到：
- `id_ed25519` —— **私钥**（留在 Windows）
- `id_ed25519.pub` —— **公钥**（放到 Linux）

---

## 3. 配置免密登录（公私钥）

### 3.1 将公钥上传到 Linux

**方法一：命令自动上传（推荐）**
在 Windows PowerShell 执行（替换 IP 和用户名）：
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh kali@192.168.17.129 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
```
输入一次密码后，公钥即上传完成。

**方法二：手动复制**
1. 用记事本打开 `C:\Users\你的用户名\.ssh\id_ed25519.pub`，复制全部内容
2. 在 VSCode 连上的 Linux 终端中：
   ```bash
   nano ~/.ssh/authorized_keys
   ```
3. 粘贴 → `Ctrl+O` 回车保存 → `Ctrl+X` 退出
4. 设置权限：
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

### 3.2 配置 VSCode SSH 使用私钥

按 `Ctrl+Shift+P` → `Remote-SSH: Open SSH Configuration File` → 选择第一个。

添加或修改配置：

```plain
Host kali
    HostName 192.168.17.129
    User kali
    IdentityFile C:\Users\你的用户名\.ssh\id_ed25519
```

> **注意**：`IdentityFile` 指向的是**私钥**（`id_ed25519`），不是 `.pub`。

### 3.3 修复 Windows 私钥权限（关键！）

在 PowerShell 执行：
```powershell
cd $env:USERPROFILE\.ssh

# 移除继承权限，仅保留当前用户读取
icacls id_ed25519 /inheritance:r
icacls id_ed25519 /grant:r "$($env:USERNAME):(R)"
```

### 3.4 测试免密连接

在 PowerShell 测试：
```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519 kali@192.168.17.129
```
如果直接连上，说明配置成功。

然后在 VSCode 中：
1. 点击左下角绿色 `><` 图标
2. 选择 `Connect to Host...` → `kali`
3. 应直接连上，不再提示密码

---

## 4. Linux 端安装 Docker

### 4.1 安装 Docker

**推荐方式（Ubuntu/Debian）：**
```bash
wget -qO- https://get.docker.com/ | sh
```

**Kali Linux（Docker 官方不支持 Kali，需手动）：**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 添加 GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 使用 Debian 源（Kali 基于 Debian）
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian buster stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### 4.2 验证安装
```bash
sudo docker run hello-world
```
看到 `Hello from Docker!` 即成功。

---

## 5. 解决 Docker 权限问题

VSCode 连上后，Docker 插件可能提示无法访问 `/var/run/docker.sock`。

**一劳永逸的解法：**

在 Linux 终端执行：
```bash
# 将当前用户加入 docker 组
sudo usermod -aG docker $USER

# 重启 Docker 服务
sudo systemctl restart docker
```

然后**断开 VSCode SSH 连接，重新连接**（或重启 Linux）。

验证：
```bash
docker ps
```
不再提示权限错误即成功。

---

## 6. VSCode Docker 插件使用

连接成功后，左侧边栏出现 Docker 图标，常用功能：

| 功能 | 操作 |
|---|---|
| **拉取镜像** | Images → 右键 `Pull` 或终端执行 `docker pull` |
| **运行容器** | 镜像右键 → `Run`（后台）/ `Run Interactive`（带日志） |
| **进入容器终端** | 容器右键 → `Attach Shell` |
| **查看日志** | 容器右键 → `View Logs` |
| **编辑容器文件** | 展开容器 `Files` 树，直接双击修改 |
| **端口转发** | 容器右键 → `Forward Port`，自动映射到 Windows 本地 |
| **浏览器打开** | 端口转发后，右键 `Open in Browser` |

---

## 7. 快速检查清单

每次复用或排查问题时，按以下顺序检查：

| 检查项 | 命令/操作 |
|---|---|
| Linux SSH 是否运行 | `sudo service ssh status` |
| Windows 私钥权限 | `icacls C:\Users\用户名\.ssh\id_ed25519`（应只有当前用户） |
| Linux 公钥是否正确 | `cat ~/.ssh/authorized_keys` |
| Linux .ssh 权限 | `ls -la ~/.ssh`（700 + 600） |
| 用户是否在 docker 组 | `groups`（应看到 `docker`） |
| VSCode 配置路径 | `IdentityFile` 指向私钥，不是 `.pub` |

---

## 8. 配置文件模板

**Windows SSH 配置**（`C:\Users\用户名\.ssh\config`）：

```plain
Host kali
    HostName 192.168.17.129
    User kali
    IdentityFile C:\Users\你的用户名\.ssh\id_ed25519
    ForwardAgent yes
```

**Linux SSH 配置**（`/etc/ssh/sshd_config`，可选加固）：

```plain
PubkeyAuthentication yes
PasswordAuthentication no    # 确认密钥可用后再开启，禁用密码登录
```

修改后重启 SSH：
```bash
sudo service ssh restart
```

---

按这个流程走，任何新的 Kali/Ubuntu/Debian 机器都可以在 5 分钟内配置好完整的远程 Docker 开发环境。
