---
title: Git 使用指南
link: 'git-usage-guide'
description: Git 安装配置、基础工作流、分支管理、常用技巧速查
date: 2025-11-14T00:00:00.000Z
updated: 2025-11-14T00:00:00.000Z
tags: [Git, SSH]
categories: [[笔记, 工具]]
---

## 安装与配置

### 安装

- Windows：[git-scm.com](https://git-scm.com/download/win) 下载安装包，按向导完成
- macOS：`brew install git` 或安装 Xcode Command Line Tools

### 用户信息配置

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

### SSH Key 配置

```bash
# 生成密钥对
ssh-keygen -t ed25519 -C "你的邮箱"

# 查看公钥，复制到 GitHub/GitLab 的 SSH Keys 设置中
cat ~/.ssh/id_ed25519.pub

# 测试连接
ssh -T git@github.com
```

## 基础工作流

```bash
# 初始化仓库
git init

# 克隆远程仓库
git clone git@github.com:user/repo.git

# 查看状态
git status

# 添加到暂存区
git add .                # 所有文件
git add file.txt         # 指定文件

# 提交
git commit -m "提交说明"

# 推送到远程
git push origin main

# 拉取远程更新
git pull origin main

# 查看提交历史
git log --oneline
```

## 分支管理

```bash
# 查看分支
git branch

# 创建并切换分支
git checkout -b feature/xxx
# 或用新版命令
git switch -c feature/xxx

# 切换分支
git checkout main

# 合并分支（在 main 上合并 feature）
git merge feature/xxx

# 删除分支
git branch -d feature/xxx
```

### 解决合并冲突

合并时如果出现冲突，手动编辑冲突文件，保留需要的内容，然后：

```bash
git add .
git commit -m "解决合并冲突"
```

## 常用技巧

### .gitignore

在仓库根目录创建 `.gitignore` 文件，列出不需要跟踪的文件：

```plain
# 依赖目录
node_modules/
__pycache__/

# 编辑器配置
.vscode/
.idea/

# 系统文件
.DS_Store
Thumbs.db

# 构建产物
dist/
build/
```

### 移除跟踪但保留本地文件

```bash
# 从 Git 跟踪中移除（不会删除本地文件）
git rm --cached .obsidian/app.json

# 或移除整个目录
git rm --cached -r .obsidian/

# 加入 .gitignore 防止再次跟踪
echo ".obsidian/" >> .gitignore
git add .gitignore
git commit -m "移除配置文件跟踪"
```

### stash 暂存工作区

```bash
# 暂存当前修改
git stash

# 恢复暂存
git stash pop

# 查看暂存列表
git stash list
```

### 撤销操作

```bash
# 撤销工作区修改（未 add）
git checkout -- file.txt

# 撤销暂存（已 add 未 commit）
git reset HEAD file.txt

# 撤销最近一次提交（保留修改）
git reset --soft HEAD~1
```

## 图形化工具

- **PyCharm 集成**：内置 Git 支持，VCS 菜单直接操作
- **VSCode 集成**：左侧源代码管理面板，支持 diff、提交、推送
