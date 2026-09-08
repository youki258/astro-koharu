---
title: 初识 Kubernetes：从 Service 与 CoreDNS 理解服务发现
link: 'intro-to-k8s'
description: 从 Service、CoreDNS 到完整调用链，理解 K8s 服务发现的核心机制与单机部署的本质区别
date: 2026-05-27T00:00:00.000Z
updated: 2026-06-16T00:00:00.000Z
tags: [Kubernetes]
categories: [[笔记, 工具]]
---

最近在 K8s 集群里部署多服务时，最让人意外的是**服务之间居然可以不写 IP、不改代码地互相找到对方**。这篇笔记拆解这套机制是怎么实现的：Service 如何当稳定的"门牌号"、CoreDNS 怎么当集群内的"黄页"、以及这套设计与单机 `localhost` 部署的本质区别。

## 1. 先理清 K8s 的几个基本对象

讲服务发现之前，先把几个会反复出现的对象过一遍，避免后面混在一起。

| 对象 | 一句话解释 |
|---|---|
| **Pod** | K8s 调度的最小单位，里面跑着一个或多个容器。每个 Pod 有自己的 IP，但这个 IP **不稳定**——重启就换。 |
| **Deployment** | 用来声明"我要跑 N 个相同的 Pod"，K8s 会自动维护这个数量（挂了会重启）。 |
| **Service** | 一组 Pod 的**稳定访问入口**。给它一个名字 + ClusterIP，后面所有 Pod 都通过这个名字访问它。 |
| **NodePort / Ingress** | 把 Service 暴露到集群外部的两种方式（前者用节点端口，后者用 HTTP 路由）。 |

记住一句话：**Pod 是临时的，Service 是稳定的。** 后面所有机制都围绕这个差异展开。

---

## 2. Service：一个虚拟的、稳定的"门牌号"

创建 `Service` 时，Kubernetes 会在集群内部为它分配一个**固定的虚拟 IP**（ClusterIP）。这个 IP 永远不会变——只要 Service 存在，它就在那里。

假设后端被部署成 3 份 Pod：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3   # 3 个相同的 Pod
  template:
    spec:
      containers:
        - name: backend
          image: my-backend:1.0
```

每个 Pod 启动后会被分到自己的随机 IP，比如 `10.244.1.5`、`10.244.2.3`、`10.244.3.8`。如果前端直接写这些 IP，**任何一个 Pod 重启，IP 就变了，前端就找不到了**。

解决办法是再创建一个 `Service`：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend         # 选中上面那 3 个 Pod
  ports:
    - port: 80
      targetPort: 8080
```

K8s 会做两件事：

1. 给这个 Service 分一个**固定 ClusterIP**（比如 `10.96.100.1`）。
2. 在背后维护一个**负载均衡器**，把发往 `10.96.100.1:80` 的请求，均匀转发到那 3 个 Pod 上。

于是前端只需要记住 `backend:80`（或者 `10.96.100.1:80`）这一个地址，就能访问到后端的任意副本。**后端 Pod 增减、重启、IP 变化，前端完全不感知。**

---

## 3. CoreDNS：一个内置的"黄页"

让前端去记 `10.96.100.1` 这种纯数字地址不现实。Kubernetes 内建了一个 DNS 服务（CoreDNS），相当于**集群内部的电话本**：

- 创建一个叫 `backend` 的 Service 后，CoreDNS 会自动注册一条记录：`backend` → `10.96.100.1`。
- 前端 Pod 里的应用发起 `http://backend:80` 请求时，容器里的 DNS 解析器会自动把 `backend` 翻译成 `10.96.100.1`，流量就精准抵达了后端的 Service。

```text
前端 Pod 里的应用：GET http://backend:80/api
   ↓ DNS 解析
CoreDNS：backend → 10.96.100.1
   ↓ 流量转发
backend Service (10.96.100.1) → 负载均衡到某个后端 Pod
```

**这就是"服务发现"的本质：调用方只需要知道服务名，不需要知道它有几个副本、IP 是什么、跑在哪台机器上。**

---

## 4. 一个完整的调用链路

假设集群里有 3 个服务：数据库、后端、前端。完整通信过程是这样的：

```yaml
# 1. 数据库
apiVersion: v1
kind: Service
metadata:
  name: db
spec:
  selector:
    app: mysql
  ports:
    - port: 3306

---
# 2. 后端（3 副本）
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - port: 80
      targetPort: 8080

---
# 3. 前端（NodePort 暴露给外部）
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - port: 80
      nodePort: 30080
```

后端代码里，**数据库连接地址直接写成 `db:3306`**，不用关心 MySQL 的 Pod IP：

```python
# 后端代码示例
import mysql.connector
conn = mysql.connector.connect(
    host="db",       # 直接用 Service 名
    port=3306,
    user="app",
    password="xxx",
    database="app_db"
)
```

前端代码里，**API 请求地址直接写成 `backend:80`**，也不用关心后端有几个副本：

```javascript
// 前端代码示例
fetch("http://backend:80/api/users")
  .then(res => res.json())
  .then(data => console.log(data));
```

用户从浏览器访问 `http://Master节点IP:30080` 时，完整的链路是：

```text
用户浏览器
  ↓ http://MasterIP:30080
前端 Service (NodePort)
  ↓ 负载均衡到某个前端 Pod
前端 Pod 发起 GET http://backend:80/api
  ↓ CoreDNS 解析 backend → 10.96.100.1
后端 Service
  ↓ 负载均衡到某个后端 Pod
后端 Pod 连接 mysql -h db
  ↓ CoreDNS 解析 db → 10.96.x.x
数据库 Service
  ↓ 连上 MySQL Pod
```

**整个过程中，没有一个地方出现了具体的 Pod IP 或节点 IP。** 服务之间完全通过 Service 名称通信，K8s 自动处理负载均衡、高可用和故障恢复。

---

## 5. 和单机 `localhost` 部署的本质区别

单机上跑多服务时，连接地址通常是这样写的：

```python
# 单机部署：写死 localhost
conn = mysql.connector.connect(
    host="localhost",  # 必须是本机
    port=3306,
    ...
)
```

要把后端拆到另一台机器上，要改的东西很多：IP 地址、端口、可能还有防火墙、配置中心……

| 维度 | 单机 `localhost` 方式 | Kubernetes Service 方式 |
|---|---|---|
| **服务地址** | 固定写死 IP/端口 | 通过虚拟 IP + DNS 动态发现 |
| **扩展性** | 无法横向扩展（端口冲突） | 随时增减副本，前端无感知 |
| **故障恢复** | 进程挂了就断了 | 副本自动重新调度，Service 自动转发到健康实例 |
| **部署灵活性** | 所有服务绑死在同一台机器 | 服务可以分布在集群的任何节点上 |
| **代码改动** | 迁移机器要改 IP/配置 | 一行不用改，Service 名不变即可 |

用一句话总结这个差异：

> **单机部署是"我告诉你地址"，Kubernetes 是"告诉我你叫什么，我帮你找到地址"。**

后者让服务之间的通信变得松耦合、高可用，也更符合微服务架构的理念。

---

## 6. 写给自己的小结

这次在集群里做多服务部署实验，**最关键的认知升级不是"我会写 yaml 了"，而是理解了"为什么 Pod IP 不重要"**。

只要 Service 还在、名字没变，Pod 怎么重建、IP 怎么换、节点怎么调度，对调用方来说都是透明的。这种"调用方不关心被调用方物理位置"的设计，是分布式系统能横向扩展的基石。

K8s 把这套机制内化到了平台层——**调用方一行代码不用改，平台就把寻址、负载均衡、故障恢复全做了**。这在单台服务器上根本无法做到：单机部署时，进程地址是写死的、端口是冲突的、机器是绑死的，**这套"靠名字找服务"的能力在单台服务器上根本无从发挥**。
