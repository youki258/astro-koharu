---
title: Cloudflare 边缘应用：一个 IP 承载数千网站
link: 'cloudflare-ip-edge-apps'
description: Cloudflare 一个 IP 承载数千网站的原理：SNI/Host 路由、Anycast、边缘计算
date: 2026-04-10T00:00:00.000Z
updated: 2026-04-21T00:00:00.000Z
tags: [Cloudflare, CDN]
categories: [[笔记, 网络与架构]]
---

参考讨论：[XTLS/BBS#23](https://github.com/XTLS/BBS/issues/23)

Cloudflare 一个 IP（如 `104.16.x.x`）能同时承载数千甚至上万个网站，背后是 CDN 的几项核心技术叠加：反向代理 + SNI/Host 路由、Anycast、边缘计算。

## 1. 反向代理（Reverse Proxy）+ SNI 路由

```text
用户访问 site1.com ──┐
用户访问 site2.com ──┼──→ Cloudflare IP (104.16.x.x) ──→ 根据信息分发到不同源站
用户访问 site3.com ──┘
```

**关键技术：SNI + Host 头双重路由。**

### 第一步：TLS 握手（SNI 决定证书）

```text
你的浏览器 → Cloudflare:443

Client Hello:
  - SNI: "site1.com"  ← 明文传输

Cloudflare 根据 SNI：
  - 找到 site1.com 的证书
  - 返回 site1.com 的 TLS 证书
```

### 第二步：HTTP 请求（Host 头决定源站）

```text
HTTP GET / HTTP/1.1
Host: site1.com  ← 决定请求转发给哪个源服务器
```

**结果：** 同一个 IP，根据 SNI 和 Host 头的不同，可以服务无限个域名。

## 2. Anycast 技术（全球共享 IP）

这是 Cloudflare 的独特之处：

```text
传统 DNS：
- site.com → 1.2.3.4（美国服务器）
- 中国用户访问慢

Cloudflare Anycast：
- 104.16.249.249 同时在全球广播：
  - 北京用户访问 → 被路由到北京机房
  - 纽约用户访问 → 被路由到纽约机房
  - 伦敦用户访问 → 被路由到伦敦机房
```

**同一个 IP 地址，物理上对应全球数百个数据中心。**

## 3. 边缘计算（Edge Computing）

对于 Workers/Pages：

```text
用户请求 example.worker.dev
           ↓
到达最近的 Cloudflare 边缘节点
           ↓
不转发到源站，直接在边缘节点执行 JavaScript 代码
           ↓
返回结果
```

**一个 IP 既是反向代理入口，又是代码执行环境。**

## 4. 边缘应用为什么几乎不占资源

边缘应用（Worker）是 **Serverless 无服务器架构**，特点是：

- 不是一直开着一台服务器等请求
- 来一个请求，临时启动一段代码
- 执行完（通常几毫秒～几十毫秒）直接销毁
- 不请求时，**完全不占资源**

一个节点上可以同时跑几万个用户的边缘函数，资源是**极度共享、极度轻量化**的。对 Cloudflare 来说，这点算力几乎可以忽略不计。

## 5. 写 API、鉴权、查数据库会不会很耗资源？

并不会，而且架构是这样的：

- 边缘节点：只做**轻逻辑**（校验、路由、拼接、简单计算）
- 数据库：依然放在**中心服务器 / 云数据库**（比如阿里云、腾讯云、PlanetScale）
- 边缘节点 → 发请求 → 中心数据库拿数据

不是每个边缘节点都装数据库。只是**用户到边缘近**，边缘到数据库那一步是厂商优化过的内网专线，整体依然很快。

## 6. 对比传统后端

- **传统后端**：买 1 台 / 3 台 / 10 台服务器，自己扛所有流量，崩了要自己重启扩容
- **边缘后端**：厂商全球几百个节点自动兜底，流量再大也自动分配，不用管服务器数量
