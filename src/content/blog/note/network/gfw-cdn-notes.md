---
title: GFW 识别 CDN 相关笔记
link: 'gfw-cdn-notes'
description: GFW 识别 Cloudflare CDN 代理的多重手段：SNI 明文、DNS 情报、流量指纹
date: 2025-07-27T00:00:00.000Z
updated: 2025-07-27T00:00:00.000Z
tags: [GFW, CDN, 计算机网络]
categories: [[笔记, 网络与架构]]
---

参考讨论：[GFW 大战 Cloudflare，以及积至公司推荐的火爆翻墙项目](https://github.com/XTLS/BBS/issues/23)

## 1. SNI（服务器名称指示）—— 明文的"门牌号"

### 什么是 SNI？

当你访问一个 HTTPS 网站时，在加密连接建立之前，你会明文发送一个字段叫 **SNI**，告诉服务器你要访问哪个域名。

比如访问 `worker-demo.yourname.workers.dev`，这个域名会以**明文**形式在网络上传输。

### GFW 如何利用 SNI？

```text
正常用户访问的 SNI：
- www.baidu.com
- www.bilibili.com
- api.github.com

翻墙用户访问的 SNI：
- proxy123.username.workers.dev  ← Workers 默认域名
- tunnel.abcd.pages.dev          ← Pages 域名
- *.trycloudflare.com            ← Tunnel 临时域名
```

**识别逻辑：**

- GFW 可以维护一个"Workers 子域名黑名单"
  
- 只要检测到 SNI 包含 `workers.dev`、`pages.dev` 等特征，或匹配已知的翻墙 Worker 子域名，就直接阻断
  
- 即使你用自定义域名（如 `my-proxy.com`），如果 GFW 发现这个域名指向 Cloudflare Workers IP 且有异常流量模式，也会被标记

**长时间连接检测：**

- 正常 HTTPS 连接平均持续 30-60 秒
  
- 代理连接可能持续 30 分钟以上，且期间一直有数据传输
  
- GFW 标记"持续活跃的 HTTPS 长连接"为可疑
  

**流量指纹（Packet Size & Timing）：**

- 你的代理工具（如 Clash、V2Ray）在加密数据时，会产生特定大小的数据包
  
- 比如每 2 秒发送一个 1400 字节的心跳包
  
- GFW 通过机器学习识别这种"机械式"的流量模式


## 2. 综合举例：GFW 如何判定你在用 edgetunnel

假设你在用 edgetunnel（一个基于 Workers 的代理）：

1. **DNS 阶段**：你的电脑查询 `edgetunnel.yourname.workers.dev` → **可疑**
   
2. **TLS 握手阶段**：SNI 明文显示 `yourname.workers.dev` → **确认是 Workers**
   
3. **指纹检测**：JA3 显示这不是浏览器，是代理客户端 → **确认是代理**
   
4. **流量分析**：连接持续 2 小时，上下行流量对称，心跳包规律 → **确认是代理隧道**
   
5. **IP 分析**：你连接的 Cloudflare IP 是 `104.16.x.x`，不是最优节点 → **确认使用了优选 IP**
   

**结论：阻断该连接，或限速，或记录你的 IP 进行重点监控。**

```plain
GFW 识别 Workers 代理的多重手段：

1. SNI 明文检查（第一层）
   workers.dev / pages.dev → 直接标记

2. 自定义域名（第二层）
   yourdomain.com → 指向 104.16.x.x 
                 → 流量特征异常 
                 → 回溯发现是 Workers IP 
                 → 标记

3. DNS 情报收集（第三层）
   监控全国 DNS 查询日志
   → 发现大量 .workers.dev 查询来自特定用户群
   → 分析这些域名
   → 发现是代理工具
   → 加入黑名单

4. IP + 流量指纹（第四层）
   无论域名是什么
   → 只要连接到 Workers IP 段
   → 且 JA3/流量模式匹配代理特征
   → 精准识别
```

## 3. 补充：为什么机场较少用 Hysteria

一个常见疑问：Hysteria 协议出来挺久了，为什么少见机场采用？大致原因：

1. **迁移成本**：Hysteria 较新，原有机场既有协议用得好，没必要冒风险换。
2. **QUIC 被限流**：Hysteria 基于 QUIC（UDP），运营商对 UDP 的 QoS 限流比较狠，高峰期尤其明显，自己建一个对比测速就能感受到。
3. **替代方案够强**：目前抗审查能力很强的组合是 **VLESS + Reality**——VLESS 开销小，Reality 伪装到位，对机场来说够用且稳定。

所以选型不是"新就一定好"，而是在抗审查、稳定性、带宽开销之间权衡。
