---
title: HTML、CSS 基础与页面布局笔记
link: 'html-basics'
description: 整理 CSS 引入方式、颜色写法、选择器、路径、盒子模型、Flex 布局和表单标签。
date: 2025-04-11T00:00:00.000Z
updated: 2025-04-11T00:00:00.000Z
tags: [HTML, CSS]
categories: [[笔记, 前端]]
---

这篇笔记整理 HTML 与 CSS 入门阶段的常用知识点，重点是页面样式引入、选择器、路径写法和基础布局。

## 1. css 引入方式

- 行内样式：`<h1 style="...">`
- 内部样式：`<style>...</style>`
- 外部样式：在 `xxx.css` 中编写样式，并通过 `<link href="...">` 引入

## 2. 颜色表示

- 关键字：red
- rgb 表示法
- rgba 表示法: rgba(255,0,0,0.5)
- 十六进制

## 3. 常见选择器写法

- 元素选择器：`标签名 { ... }`
- 类选择器：`.class属性值 { ... }`
- id 选择器：`#id属性值 { ... }`

## 4. 路径的书写形式

- 绝对路径:
  - 绝对磁盘路径：`<img src="C:\Users\Administrator\Desktop\HTML\img\logo.png">`（不要使用）
  - 绝对网络路径：`<img src="https://i2.sinaimg.cn/dy/deco/2012/0613/yocc20120613img01/news_logo.png">`
- 相对路径:

 ​        ./ : 当前目录 , ./ 可以省略的

 ​        ../: 上一级目录

### 盒子模型

#### 1. 布局标签

- 标签：`<div>` `<span>`

- 特点：

- `<div>`标签：

  - 一行只显示一个（独占一行）
  - 宽度默认是父元素的宽度，高度默认由内容撑开
  - 可以设置宽高（width、height）

- `<span>`标签：

  - 一行可以显示多个
  - 宽度和高度默认由内容撑开
  - 不可以设置宽高（width、height）

- `<hr>` 标签：水平分割线
- `<br>` 标签：换行

#### 2. flex 布局  

- 父元素：`display: flex;` 弹性布局
- `flex-direction: row;`：默认为 row 水平布局，设置主轴
- `flex-start`：从头开始排列
- `flex-end`：从尾部开始排列
- `center`：在主轴上居中对齐
- `space-around`：平分剩余空间
- `space-between`：先两边贴边，再平分剩余空间
- `justify-content: space-around;`

#### 3. 表单标签：`<form>`

表单属性：

- action:表单数据提交的 url 地址
- method:表单提交方式
- get：表单数据拼接在 url 后面，?username=java
- post:表单数据在请求体中携带/大小没有限制
。注意：表单项必须有 name 属性才可以提交。

#### 4. 表单项标签

- `<input>` 的 `type` 属性：`text`、`password`、`radio`、`checkbox`、`file`、`date`、`datetime-local`、`time`、`hidden`、`button`、`submit`
- `<select>` 定义下拉列表
- `<textarea>` 定义文本域

## 小结

HTML 与 CSS 入门的重点是先建立页面结构和样式规则的基本认识。选择器、盒子模型、Flex 布局和表单标签是后续做页面开发时最常反复使用的部分。
