---
title: Maven 项目构建与依赖管理笔记
link: 'maven'
description: 整理 Maven 的项目结构、坐标、依赖配置、仓库模型和构建生命周期。
date: 2025-05-01T00:00:00.000Z
updated: 2025-05-01T00:00:00.000Z
tags: [Maven, Java]
categories: [[笔记, Java 全栈]]
---

这篇笔记记录 Maven 的基础使用方式，重点是理解 Maven 如何统一 Java 项目的结构、依赖和构建流程。后续精修时，可以把命令示例和 POM 配置拆成更清晰的实践小节。

## 本文要点

- Maven 用来管理 Java 项目的依赖、构建流程和标准目录结构。
- POM 是 Maven 项目的核心描述文件，坐标由 `groupId`、`artifactId`、`version` 组成。
- Maven 仓库分为本地仓库、中央仓库和远程私服。
- 生命周期命令可以串联完成编译、测试、打包和发布。

### 1. maven 介绍

#### 1.1. 介绍
Maven 是一款用于管理和构建 Java 项目的工具，是 Apache 旗下的一个开源项目。

#### 1.2. 作用
1. 管理项目依赖：方便快捷的管理项目依赖的资源(jar 包)，避免版本冲突问题。
2. 管理项目构建：通过 Maven 中的命令，就可以很方便的完成项目的编译(compile)、测试(test)、打包(package)、发布(deploy) 等操作。
而且这些操作都是跨平台的，也就是说无论你是 Windows 系统，还是 Linux 系统，还是 Mac 系统，这些命令都是支持的。
3. Maven 还提供了标准、统一的项目结构。

### 2. Maven 概述
#### 2.1. Maven 的作用 
   1. 方便的依赖管理
   2. 统一的项目结构
   3. 标准的项目构建流程

#### 2.2. Maven 模型



- 项目对象模型 (Project Object Model)

- 依赖管理模型(Dependency)

- 构建生命周期/阶段(Build lifecycle & phases)

	


#### 2.3. Maven 仓库
仓库：用于存储资源，管理各种 jar 包
仓库的本质就是一个目录(文件夹)，这个目录被用来存储开发中所有依赖(就是 jar 包)和插件

Maven 仓库分为：
- 本地仓库：自己计算机上的一个目录(用来存储 jar 包)
- 中央仓库：由 Maven 团队维护的全球唯一的。仓库地址：https://repo1.maven.org/maven2/
- 远程仓库(私服)：一般由公司团队搭建的私有仓库
### 3. IDEA 集成 Maven
**Maven 项目的目录结构:**
Maven 项目的目录结构:
```plain
maven-project01

        |---  src  (源代码目录和测试代码目录)
               |---  main (源代码目录)
                        |--- java (源代码java文件目录)
                        |--- resources (源代码配置文件目录)
              |---  test (测试代码目录)
                        |--- java (测试代码java目录)
                        |--- resources (测试代码配置文件目录)
        |--- target (编译、打包生成文件存放目录)
	
```

#### 3.1. pom 文件详解
**POM (Project Object Model)：项目对象模型，用来描述当前的 maven 项目。**
pom 文件详解：
```plain
- <project> ：pom文件的根标签，表示当前maven项目
- <modelVersion>：声明项目描述遵循哪一个POM模型版本
  - 虽然模型本身的版本很少改变，但它仍然是必不可少的。目前POM模型版本是4.0.0
- 坐标 ：
  - <groupId> <artifactId> <version>
  - 定位项目在本地仓库中的位置，由以上三个标签组成一个坐标
- <maven.compiler.source> ：编译JDK的版本
- <maven.compiler.target> ：运行JDK的版本
- <project.build.sourceEncoding> : 设置项目的字符集
```


#### 3.2. Maven 坐标

什么是坐标？

- Maven 中的坐标是**资源的唯一标识** , 通过该坐标可以唯一定位资源位置
- 使用坐标来定义项目或引入项目中需要的依赖

Maven 坐标主要组成：

- groupId：定义当前 Maven 项目隶属组织名称（通常是域名反写，例如：com.itheima）
- artifactId：定义当前 Maven 项目名称（通常是模块名称，例如 order-service、goods-service）
- version：定义当前项目版本号
	- SNAPSHOT: 功能不稳定、尚处于开发中的版本，即快照版本
	- RELEASE: 功能趋于稳定、当前更新停止，可以用于发行的版本



### 4. 依赖配置

#### 4.1. 基本配置

依赖：指当前项目运行所需要的 jar 包。一个项目中可以引入多个依赖：

例如：在当前工程中，我们需要用到 logback 来记录日志，此时就可以在 maven 工程的 pom.xml 文件中，引入 logback 的依赖。具体步骤如下：

1. 在 pom.xml 中编写`<dependencies>`标签
2. 在`<dependencies>`标签中使用`<dependency>`引入坐标
3. 定义坐标的 `groupId`、`artifactId`、`version`

### 5. 生命周期
#### 5.1. 生命周期介绍
- clean：清理工作。
- default：核心工作。如：编译、测试、打包、安装、部署等。
- site：生成报告、发布站点等。

---

每套生命周期包含一些阶段（phase），阶段是有顺序的，后面的阶段依赖于前面的阶段。
我们看到这三套生命周期，里面有很多很多的阶段，这么多生命周期阶段，其实我们常用的并不多，主要关注以下几个：
- clean：移除上一次构建生成的文件
- compile：编译项目源代码
- test：使用合适的单元测试框架运行测试(junit)
- package：将编译后的文件打包，如：jar、war 等
- install：安装项目到本地仓库

> Maven 的生命周期是抽象的，这意味着生命周期本身不做任何实际工作。在 Maven 的设计中，实际任务（如源代码编译）都交由插件来完成。
---
- 生命周期的顺序是：clean --> validate --> compile --> test --> package --> verify --> install --> site --> deploy
- 我们需要关注的就是：clean -->  compile --> test --> package  --> install
#### 5.2. 执行
在日常开发中，当我们要执行指定的生命周期时，有两种执行方式：
1. 在 idea 工具右侧的 maven 工具栏中，选择对应的生命周期，双击执行
2. 在 DOS 命令行中，通过 maven 命令执行

## 小结

Maven 的核心价值是把 Java 项目的依赖、目录结构和构建步骤标准化。先理解 POM、坐标、仓库和生命周期，再记常用命令，会比单独背配置更容易串起来。
