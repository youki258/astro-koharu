---
title: 虚拟机网络配置
link: 'vm-network-config'
description: 从 IP 规划到故障修复，一文搞定 VMware 虚拟机固定 IP，覆盖 nmcli 与 network.service 两种方案
date: 2026-03-07T00:00:00.000Z
updated: 2026-06-25T00:00:00.000Z
tags: [虚拟机, VMware]
categories: [[笔记, 网络与架构]]
---

## 1. 为什么需要固定 IP？最稳妥的规划策略

VMware NAT 默认通过 DHCP 分配 IP，地址会浮动，多台虚拟机同时开机还可能撞 IP，导致 SSH 频繁断连。最彻底的解决办法是：**设置静态 IP，并故意选在 DHCP 分配池之外**。

以常见的 NAT 网段 `192.168.17.0/24` 为例，VMware 的 DHCP 通常分配 `128-254` 这个区间。因此安全可用的静态 IP 范围为 **`192.168.17.3` ~ `192.168.17.127`**。

规划示例：
- 宿主机：`192.168.17.1`（系统固定）
- NAT 网关：`192.168.17.2`（系统固定）
- 虚拟机 A：`192.168.17.10`
- 虚拟机 B：`192.168.17.11`
- ……

这样无论 DHCP 怎么分配，都不会跟你手动的地址冲突。

> 本文示例均以目标 IP `192.168.17.10`、网卡名 `ens160` 为例。**请务必将命令中的 IP 和网卡名替换为你实际规划的值。**
> 不确定网卡名？执行 `ip addr` 或 `nmcli connection show` 查看，常见名有 `ens33`、`eth0` 等。

---

## 2. 前置检查：确保虚拟链路与 VMware 服务正常

很多“配置完不通”的问题，根源不在 Linux 配置，而在虚拟机硬件或 Windows 服务。正式配 IP 之前，先过一遍下面几点。

**1. 虚拟机网卡硬件设置**（所有方案通用）

- 关闭虚拟机（不是暂停），打开「虚拟机设置」→「网络适配器」。
- **必须勾选** ✅「已连接」、✅「启动时连接」。
- 确认网络连接方式为 **「NAT 模式」**。

**2. 检查宿主机 VMware 核心服务**

在 Windows 中 `Win+R` 输入 `services.msc`，找到下面两个服务：

- `VMware NAT Service`
- `VMware DHCP Service`

确保它们都是「正在运行」状态。如有异常，右键重新启动。  
如果之前修改过虚拟网络编辑器（如恢复了默认设置），可能需要重启这两个服务甚至宿主机。

**3. 启动虚拟机，快速确认网卡链路**

```bash
ip addr show ens160   # 记得替换网卡名
```

如果输出中包含 `state UP`，说明链路已通，可以进入下一步。  
如果始终是 `state DOWN`，回第一步重新确认 VMware 设置与服务。

---

## 3. 方案 A：NetworkManager 正常时的推荐做法（nmcli 一键搞定）

大多数现代 Linux 发行版（CentOS 7+、Fedora、Ubuntu 等）默认使用 NetworkManager 管理网络。这种情况下 `nmcli` 是最安全、最不容易产生配置冲突的方式。

直接把下面命令里的 `192.168.17.10` 和 `ens160` 替换成你的实际值，整个复制执行即可：

```bash
CONN="ens160"  # 先确认网卡名

# 1. 绑定静态 IP 和子网掩码
sudo nmcli connection modify "$CONN" ipv4.addresses 192.168.17.10/24

# 2. 设置网关
sudo nmcli connection modify "$CONN" ipv4.gateway 192.168.17.2

# 3. 设置 DNS（推荐公共 DNS）
sudo nmcli connection modify "$CONN" ipv4.dns "8.8.8.8,114.114.114.114"

# 4. 改获取方式为手动
sudo nmcli connection modify "$CONN" ipv4.method manual

# 5. 可选：禁用 IPv6，避免其干扰连通性测试
sudo nmcli connection modify "$CONN" ipv6.method disabled

# 6. 重启网卡
sudo nmcli connection down "$CONN" && sudo nmcli connection up "$CONN"
```

执行后验证：

```bash
ip addr show ens160 | grep 192.168.17.10   # 确认 IP 已绑定
ping -c 3 baidu.com                        # 确认外网域名解析正常
```

此后即便重启虚拟机，IP 也不会变，MobaXterm 之类的工具直接用 `192.168.17.10` 连接即可。

---

## 4. 方案 B：当 NetworkManager 罢工时（未托管、device not found）

有时候系统会出现以下症状：

- `nmcli device status` 显示 `ens160` 为 `unmanaged`；
- 尝试 `nmcli connection up` 提示 `No suitable device found`；
- 修改 `/etc/NetworkManager/...` 的托管配置无效；
- 甚至 VMware 中「已连接」都勾不上，网卡始终 `DOWN`。

这就是典型的 **NetworkManager 未托管 + 虚拟链路异常**，二合一故障。此时最直接的办法是**跳过 NetworkManager，用传统 `network.service` 接管**。

> ⚠️ **兼容性警告**  
> 方案 B 依赖传统 `network-scripts` 包，在 **CentOS 7.x** 上适用。  
>
> - 如果你的系统是**最小化安装**，可能未包含此包，需先执行 `sudo yum install network-scripts`。  
> - 如果你使用的是 **RHEL 9 / Rocky Linux 9 / CentOS Stream 9** 及更新版本，该包已被官方移除，方案 B 不可用。请返回方案 A 排查 NM 的配置问题。

### 4.1 确保链路恢复（若仍 DOWN）

如果第一节的前置检查已通过，网卡已是 `UP` 状态可略过。否则先在虚拟机设置中确认「已连接」已勾，并重启 VMware NAT/DHCP 服务，直至 `ip addr show` 看到 `state UP`。

### 4.2 停用 NetworkManager，手动固定 IP

```bash
# 1. 彻底停用 NetworkManager
sudo systemctl stop NetworkManager
sudo systemctl disable NetworkManager

# 2. 临时配通 IP（立即生效）
sudo ip addr add 192.168.17.10/24 dev ens160
sudo ip link set ens160 up
sudo ip route add default via 192.168.17.2 dev ens160
echo -e "nameserver 8.8.8.8\nnameserver 114.114.114.114" | sudo tee /etc/resolv.conf

# 3. 排除 IPv6 干扰：若 ping 外网失败，先临时禁用 IPv6 再测
sudo sysctl -w net.ipv6.conf.ens160.disable_ipv6=1
```

现在测试 `ping 192.168.17.2` 和 `ping baidu.com`，应该都能通。

### 4.3 让配置永久生效（重启后 IP 依旧）

停止 NetworkManager 后，系统会转而使用传统 `network` 服务读取 `/etc/sysconfig/network-scripts/ifcfg-*` 文件。我们直接写入正确配置：

```bash
sudo tee /etc/sysconfig/network-scripts/ifcfg-ens160 <<'EOF'
TYPE=Ethernet
BOOTPROTO=static
NAME=ens160
DEVICE=ens160
ONBOOT=yes
IPADDR=192.168.17.10
PREFIX=24
GATEWAY=192.168.17.2
DNS1=8.8.8.8
DNS2=114.114.114.114
IPV6INIT=no
PEERDNS=no
EOF
```

> **关于 `PEERDNS=no` 的说明**  
> 加上此参数后，网络服务启动时不会自动修改 `/etc/resolv.conf`，DNS 将严格使用此文件中定义的 `DNS1` 和 `DNS2`。这能确保你手动设定的 DNS 不被其他服务覆盖。

然后启用并启动传统网络服务：

```bash
sudo systemctl enable network
sudo systemctl restart network
```

最后，如果之前禁用了 IPv6，可将其设为永久生效：

```bash
sudo sysctl -w net.ipv6.conf.ens160.disable_ipv6=1 | sudo tee -a /etc/sysctl.conf
```

至此，无论是否重启，虚拟机都会固定使用 `192.168.17.10`，且不会再被 NetworkManager 干扰。

---

## 5. 快速验证清单

无论用哪个方案，最后都跑一遍：

```bash
ip addr show ens160          # 看到 192.168.17.10/24
ping 192.168.17.2 -c 2       # 网关通
ping www.baidu.com -c 4      # 外网域名解析通
```

全通则成功。然后就可以打开 MobaXterm，新建 SSH Session，Host 填入 `192.168.17.10`，享受稳定的连接。

---

## 6. 故障速查表

| 现象                        | 可能原因                                         | 快速处置                                                     |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| 网卡始终 `DOWN`             | 虚拟机设置中未勾选「已连接」或 VMware 服务未运行 | 重启 VMware NAT/DHCP 服务，确认勾选已打                      |
| `nmcli` 报 `unmanaged`      | NetworkManager 配置禁止管理该网卡                | 若系统版本支持，直接用方案 B；否则排查 NM 配置文件           |
| `ping` 网关通但域名解析失败 | DNS 配置错误或被覆盖                             | 确认 `/etc/resolv.conf` 内容；使用方案 B 时检查 `ifcfg` 中 `PEERDNS` 设置 |
| `ping` IP 通但域名不通      | IPv6 路由异常，请求优先走了无响应的 IPv6         | 尝试 `ping -4 baidu.com` 确认，然后禁用 IPv6                 |
| 重启后 IP 丢失              | 配置未持久化或 NM 重新接管                       | 检查 `/etc/sysconfig/network-scripts/ifcfg-ens160` 是否存在且内容正确；若用方案 A，确保 `ipv4.method` 为 `manual` |
| 多虚拟机互相抢 IP           | 静态 IP 落在了 DHCP 池内                         | 将静态 IP 调整至 DHCP 池外（如 `3~127`）；除非所有虚拟机均已手工配置静态 IP，否则不要关闭 VMware DHCP 服务 |

