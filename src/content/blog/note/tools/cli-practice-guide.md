---
title: CLI Agent 实践指南：从 Claude Code 到通用方法论
link: 'cli-practice-guide'
description: 以 Claude Code 为主例，对比 Codex CLI / GitHub Copilot CLI，提炼 CLI Agent 编程助手的通用方法：Plan 模式、必学命令、上下文管理、安全权限、实践经验
date: 2026-04-25T00:00:00.000Z
updated: 2026-05-16T00:00:00.000Z
tags: [CLI]
categories: [[笔记, 工具]]
---

这一两年里 CLI Agent 编程助手换了好几轮——从 Claude Code 到 Codex ，中间还试过 Copilot CLI——但用久之后发现，三家的"骨架"几乎一样：plan 模式、文件注入、shell、压缩、恢复、回退、模型切换、权限管控。基本是通用的，差异只在命令名。

这篇以 Claude Code 为主线，对照 Codex CLI 和 GitHub Copilot CLI，把用得上的方法整理成 5 节：Plan 模式、命令、上下文管理、安全权限、实践经验。读完之后应该能在任何一个 CLI Agent 上快速上手。

## 0. 三家命令速查

先把骨架放在一起。下面的表格在三家之间通用，命令名差异不大。

| 能力 | Claude Code | Codex CLI | Copilot CLI |
|---|---|---|---|
| **进入 Plan 模式** | `Shift+Tab` → `plan` | `Shift+Tab` → `Read-only`（Approval mode）| `Shift+Tab` 或 `/plan <描述>` |
| **外置编辑器写计划** | `Ctrl+G` | `Ctrl+G`（`$EDITOR`/`$VISUAL`） | `Ctrl+Y`（Markdown 编辑器） |
| **注入文件** | `@文件路径` | `@` + `Tab` 模糊搜索 | `@路径` 或 `@图片.png` |
| **会话内跑 shell** | `!命令` + `Ctrl+B` 后台 | `!命令`（受 Approval mode 约束） | 通过 `shell(...)` 权限调用 |
| **清空上下文** | `/clear` | `/clear` | `/clear` 或 `/new` |
| **侧边问（不污染主历史）** | `/btw` | — | — |
| **摘要压缩** | `/compact [focus...]` | API 层自动 | `/compact`（手动）/ 默认自动 |
| **恢复会话** | `/resume`、`claude -c`、`claude -r` | `codex resume` / `codex resume --last` / `codex resume <id>` / `codex exec resume` | `/session` |
| **回退 checkpoint** | `/rewind` + `Esc+Esc` | `Esc`×2 编辑上一条消息（=fork 入口）| `/session checkpoints` + `双 Esc` |
| **切换模型** | `/model` + `Alt+P` + `--effort` | `/model` | `/model`（含 Auto / Opus 4.5 / Sonnet 4.5 / GPT-5.2 Codex） |
| **看上下文用量** | `/statusline` 自定义 | `/status` | `/context` + `/session files` |
| **权限管理** | `/permissions` + `settings.json` | `/permissions` 切 Approval mode + `config.toml` | `--allow-tool/--deny-tool/--available-tools` |
| **跳过所有权限** | `--dangerously-skip-permissions` | `--yolo` | `--yolo` / `--allow-all` |
| **多仓库/多目录** | `--add-dir` | `codex --cd` + `--add-dir` | `/add-dir` + `/list-dirs` |
| **并行子代理** | `claude agents` + agent teams | `codex agents` + `/fork` | `/fleet` + `/task` |
| **会话存档位置** | `~/.claude/projects/<project>/` | `~/.codex/sessions/` | `~/.copilot/session-state/{id}/` |

后面所有方法论都围绕这张表展开。

---

## 1. Plan 模式：所有工作的起点

### 1.1 决策树：能用一句话描述 diff 吗？

**能** → 不用进 Plan，直接让 Agent 改。例：修 typo、加日志、改变量名、调整一个 import。

**不能**（涉及多文件、跨模块、不熟悉的代码、不确定的方案）→ **必须进 Plan 模式**让 Agent 先只读、不写。

Plan 模式的核心价值是**把"问题理解"和"动手"在时间上分开**——这两件事分得越开，返工率越低。

```bash
# Claude Code
Shift+Tab  # 在 default / acceptEdits / plan / auto / dontAsk / bypassPermissions 之间循环

# Codex
Shift+Tab  # 在 Read-only / Auto / Full Access 之间循环，选 Read-only = Plan 模式

# Copilot
Shift+Tab  # 或 /plan Implement password reset flow with email link
```

### 1.2 Plan 阶段的 3 个高阶玩法

#### 1）用外置编辑器把计划当合同

三家都能在 Plan 阶段用外置编辑器写计划。意义在于：把"硬约束"直接写进计划文件里，让计划成为可审查的合同。

```bash
# Claude Code / Codex
Ctrl+G  # 打开 $EDITOR 编辑当前 plan

# Copilot
Ctrl+Y  # 在 Markdown 编辑器中打开 plan.md
```

典型约束写法：

```markdown
## Plan: 实现密码重置流程

### 涉及文件
- src/api/auth.ts
- src/services/email.ts
- tests/auth/test_reset.py

### 约束（必须遵守）
- 保留向后兼容（旧的 /login 流程不能动）
- 先写测试再写实现
- 不要改数据库 schema
- 使用项目里现成的 token-manager.ts，不要引入 passport.js

### 验证
- `pytest tests/auth/ -k reset` 全部通过
- `mypy src/auth/` 无错误
```

写完之后保存退出，Agent 会按"合同"实现。

#### 2）计划里显式列验证步骤

没写验收标准的计划 = 100% 会变成"看起来做完了"。

```markdown
### 验证
1. Run `pytest tests/auth/ -k reset` and ensure all 3 new cases pass.
2. Run `mypy src/auth/` to confirm no type errors.
3. Open a PR with title "feat(auth): password reset flow".
```

Agent 擅长"对照 plan 自检"——前提是把验证步骤写进去。

### 1.3 三家 Plan 命令对照

| 步骤 | Claude Code | Codex | Copilot |
|---|---|---|---|
| 进 Plan | `Shift+Tab` → `plan` | `Shift+Tab` → `Read-only` | `Shift+Tab` 或 `/plan <描述>` |
| 写计划 | `Ctrl+G` | `Ctrl+G` | `Ctrl+Y` |
| 让 Agent 继续 | "Proceed with the plan" | "proceed" / "go" | "Proceed with the plan" |
| 中止 Plan | 再按 `Shift+Tab` 退出 | 切到 `Auto` 或 `Full Access` | 再按 `Shift+Tab` 退出 |

---

## 2. 需要掌握的 7 个命令

按使用频率排序。这 7 个命令覆盖 90% 的日常使用，其余命令是"知道有就行，需要时查 `/help`"。

### 2.1 `@文件` / `@路径/` — 精准注入上下文

```bash
@src/api/auth.ts       # 单文件
@src/api/auth/         # 整个目录
@../docs/spec.md       # 项目外的文件
```

也可以直接拖进 cli，都支持得不错

**核心原则：让 Agent 按需读相关部分。**

CLAUDE.md / AGENTS.md 里也支持 `@docs/git-instructions.md` 语法引用其他文件，最多 4 层引用。三家都有这个特性，行为一致。

### 2.2 `!命令` — 会话内跑 shell

```bash
! npm test              # Claude Code
! git status
! ls -la src/

# 进阶
! long-running-task     # 长任务
Ctrl+B                  # 转后台（Claude Code 特有），不阻塞主对话
```

- **上下文行为**：输出会回到主对话——只在确实需要 Agent 看到结果时用；纯查看用 `!` 更顺手。
- 粘贴以 `!` 开头的内容会自动进入 shell 模式（Claude Code 行为）。

Codex 和 Copilot 都有 shell 工具，能用 `!git diff`、`!cat file` 直接验证。

### 2.3 `/clear` — 切任务时清空上下文

```bash
/clear                  # 清空 + 当前对话进 /resume 选择器
/clear feature-auth-work   # 给被清掉的对话打标签（Claude Code 特有）
```

**使用节奏：每完成一个独立任务 → `/clear`。一次会话只做一件事。**

官方原话警告过一种反模式——"kitchen sink session"：一个会话混入不相关任务，等要清理 context 时已经一团糟。

### 2.4 `/compact [focus...]` — 长会话摘要压缩

```bash
/compact                            # 压缩整个对话
/compact focus on the API design    # 带方向压缩
```

**关键事实**（Claude Code 文档原话）："Project-root CLAUDE.md survives compaction: after `/compact`, Claude re-reads it from disk and re-inject it." —— 项目根的 `CLAUDE.md` **不会**因压缩丢失；但**子目录的** CLAUDE.md **会**丢失，直到下次读到该目录才重新加载。

何时用 `/compact`：

- 对话长了但任务没完 → `/compact focus on X`。
- 同一任务上**修 Agent 同一错误超过 2 次** → 立刻 `/clear`（用更好的 prompt 重开，不要继续累积修正）。
- Codex 隐式做了这件事，没有显式 `/compact`，但可以 `/fork` 派生新会话。

### 2.5 `/resume` — 恢复历史会话

```bash
# Claude Code
/resume                       # 打开选择器
/resume feature-auth          # 按名恢复
claude -c                     # 续当前目录下最近对话
claude -r <id>                # 按 ID 恢复

# Codex
codex resume
codex resume --last
codex resume <id>

# Copilot
/resume                       # 打开 ~/.copilot/session-state/ 选择器
```

**配合 git worktree 的高阶用法**：每个 worktree 一个 `codex resume` / `claude -r <id>` 会话。切分支 = 切会话，context 完全隔离。

### 2.6 `/rewind` / `/session` — 回退到 checkpoint

```bash
# Claude Code
/rewind          # 弹出检查点选择器
Esc+Esc          # 空输入时弹 rewind 菜单（含 "Summarize from here" / "Summarize up to here" 选项）

# Copilot
/session                  # 查看当前会话信息
/session checkpoints      # 列出所有检查点
/session checkpoints 3    # 查看第 3 个检查点内容
/session files            # 列出当前会话临时文件
双 Esc                     # 在 composer 为空时打开 rewind picker

# Codex
Esc × 2（composer 为空时）  # **编辑上一条用户消息** —— 这也是 fork / 分叉的入口
```

**Copilot 警告**："Rewinding cannot be undone. Once you roll back to a snapshot, all snapshots and session history after that point are permanently removed." —— 回退是**不可逆**的。

> 注意：`/rewind` 会**同时回退 Agent 改的、手动改的、shell 命令产生的所有变更**，包括之后新增的文件。回退前先 `git status` 确认工作区状态。
>
> **Codex 关键差异**：Codex 没有 `/rewind` 概念，而是把"分叉"和"回退"合在一起——`Esc`×2 编辑上一条消息后，从那个时间点分叉新会话；不满意就丢，老会话仍在 `/resume` 里。

### 2.7 `/model` + `--effort` — 切模型与思考强度

```bash
# Claude Code
/model                # 打开选择器
Alt+P                 # 切换模型不丢失当前 prompt（更快的快捷键）
--effort low/medium/high/xhigh/max    # 调节思考强度

# Codex
/model
codex --model gpt-5.5

# Copilot
/model                # 含 Auto / Opus 4.5 / Sonnet 4.5 / GPT-5.2 Codex
```

**核心技巧**：让主模型去调度 subagent，subagent 可以指定使用不同的模型，节约用量

### 2.8 锦上添花

| 命令 | 哪家 | 用途 |
|---|---|---|
| `/btw` | Claude Code | **侧边问题**，答案不进入主对话历史；纯提问用，访问不到工具——完美的"等下，X 那个 Y 是否考虑过"场景 |
| `/statusline` | Claude Code | 自定义状态栏持续追踪上下文用量 |
| `/goal` | Claude Code | 跨会话条件门控（评估器每轮重新检查） |
| `/diff` | Claude Code | 交互式 diff 查看器，左右键切"当前 git diff"和"单 turn diff"，审 PR 前必看 |
| `/code-review` | Claude Code | 内置代码评审（在全新子代理中评审当前 diff） |
| `/recap` | Claude Code | 按需生成会话摘要（默认自动每 3 turn 触发） |
| `/delegate` | Copilot | 把当前会话转给 **GitHub 云端 Copilot**，云端代理会创建 PR |
| `/fleet` | Copilot | 启动**并行子代理**加速大任务 |
| `/task` / `/review` | Copilot | 显式触发子代理（review 有 4 种预设：base branch / uncommitted / commit / custom） |
| `claude -p "..."` | Claude Code | **非交互模式**，配 `--output-format json` / `--output-format stream-json --verbose` 给 CI、pre-commit、脚本用 |
| `codex exec "..."` | Codex | 非交互执行；`codex exec resume --last "Fix race"` 续上次 |
| `codex cloud exec --attempts 3 "..."` | Codex | **云端 best-of-N**（1-4 次并发尝试） |
| `codex features enable unified_exec` | Codex | 启用新功能（如 `unified_exec` 执行模式、`shell_snapshot`） |
| `codex app-server --listen ws://...` | Codex | 启动 App Server，远程 TUI 通过 WebSocket 连接 |
| `claude agents` / `codex agents` | 三家 | 打开多代理视图，监控并行后台会话 |
| `claude -c` | Claude Code | 续当前目录下最近对话（最快的工作流快捷方式） |
| `/add-dir` | Copilot / Codex | 多仓库/多目录工作流，加额外目录进 Agent 可访问范围 |

---

## 3. 上下文管理：context window 

Anthropic 官方："Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills."

所有"上下文最佳实践"都围绕"别浪费它"展开。

### 3.1 4 种"喂"上下文的姿势

从高到低：

1. **`@文件路径`**（最优）—— 引用文件，Agent 按需读相关部分。**Claude Code 与 Copilot** 支持 `@path/to/file` 完整路径；**Codex** 的 `@` 触发的是**模糊文件搜索**（`@` + `Tab` 选中），再 `Enter` 填入。
2. **粘贴图片/截图/错误堆栈** —— OCR 不必，人类也读图。三家都支持**拖放图片**到 CLI 输入。
3. **`cat error.log | claude`**（管道输入） —— 适合一次性文本。
4. **整文件复制**（最差）—— 1000 行代码塞进 prompt，挤占 context。

**Claude Code 特有技巧**：`/permissions` 把常用文档域名（`docs.example.com`）加白名单，让 Agent 自己去拉。

**通用技巧**：`gh` CLI 是 GitHub 上下文最高效的获取方式——Anthropic 文档原话："Without `gh`, Claude can still use the GitHub API, but unauthenticated requests often hit rate limits."

### 3.2 3 个清理层次

| 触发场景 | 操作 | 效果 |
|---|---|---|
| Agent 走偏了一点 | `Esc+Esc` 局部回退 + 改 prompt 继续 | 撤回最近几轮（Codex 是 fork 入口） |
| 想问个不相关的边角问题 | `/btw` | 侧边问，**答案不进入主对话历史** |
| 对话长了但任务没完 | `/compact focus on X`（Claude/Copilot） | 保留当前任务，**只压缩历史** |
| 任务完成要开始新任务 | `/clear` | 完全清空，原对话进 `/resume` |

**关键节奏**：同一任务上**修 Agent 同一错误超过 2 次** → 立刻 `/clear` 用更好的 prompt 重开。

> 官方原话："If you've corrected Claude more than twice on the same issue in one session, the context is cluttered with failed approaches."

干净会话 + 更好的 prompt 永远胜过"长会话 + 累积修正"。

### 3.3 4 层记忆文件 + 一键生成

把"每次都要说的事情"挪到磁盘，让 Agent 在每个新会话里"已经知道项目是谁搭的、约定是什么"——这是从"工具"到"协作者"的关键升级。

**Claude Code 的一键生成**：在项目根跑 `/init` —— Agent 分析项目结构自动生成 `CLAUDE.md` 起始模板。

加载顺序（从广到窄）：

| 作用域 | Claude Code | Codex | Copilot |
|---|---|---|---|
| 用户全局 | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | `~/.copilot/copilot-instructions.md` |
| 用户全局覆盖 | （local 后缀） | `~/.codex/AGENTS.override.md` | （`.override`） |
| 项目共享 | `./CLAUDE.md` 或 `./.claude/CLAUDE.md` | `./AGENTS.md` | `.github/copilot-instructions.md` |
| 项目模块化 | `./.claude/rules/*.md`（支持 `paths` frontmatter） | 每层一个 AGENTS.md | `.github/instructions/**/*.instructions.md` |
| 项目个人 | `./CLAUDE.local.md`（gitignore） | 子目录 `AGENTS.override.md` | 本机范围 |
| 团队组织 | Managed policy 文件 | `project_doc_fallback_filenames` | 组织托管规则 |

**Copilot 加载顺序的关键规则**："Repository instructions always take precedence over user instructions"（仓库级指令**始终优先于**全局指令）。

加载行为：**不是覆盖而是拼接**（Anthropic 原话："All discovered files are concatenated into context rather than overriding each other"）。子目录的 CLAUDE.md **只在 Agent 读该子目录文件时才按需加载**。

**CLAUDE.md 里支持 `@` 导入语法**：可以在 CLAUDE.md 中写 `See @README.md for project overview and @package.json for available npm commands.`，Agent 会按需展开。最多 4 层引用。

**大小上限**：

- Claude Code `MEMORY.md` 启动时只加载**前 200 行 / 25KB**（自动记忆机制）。
- Codex 合并总大小上限是 `project_doc_max_bytes = 32 KiB`（默认）。
- 复杂规则不要写进 CLAUDE.md，改用 PreToolUse **hook** 强制约束。

### 3.4 跨会话：CLAUDE.md vs Auto memory vs Codex Memories

**CLAUDE.md**（人工写）—— 由开发者维护、每会话完整加载。**应只放"普适指令"**。

**Auto memory**（Claude Code v2.1.59+，Agent 自己学） —— Agent 自己记录 build commands、调试经验、架构笔记。存到 `~/.claude/projects/<project>/memory/`，**首次 200 行 / 25KB 启动时加载**，详情文件按需读。**默认开启**，可用 `/memory` 命令切换。

**Codex Memories / Chronicle**（Codex 0.140+ 新增） —— 文档侧栏已列出 `/codex/memories` 和 `/codex/memories/chronicle` 入口，对应 OpenAI 的持久记忆子系统。Chronicle 给出"会话历史洞察"。

> 关键事实（Claude Code 文档原话）："Both are loaded at the start of every conversation. Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."

**记忆文件只是上下文不是规则**——要强制约束必须用 hook，不是写文档。

### 3.5 长任务的会话状态恢复

| 方案 | 适用 | 说明 |
|---|---|---|
| A. worktree + 会话隔离 | 大功能 / 长期任务 | 每个 git worktree 一个 `codex resume` / `claude -r <id>` 会话。切分支 = 切会话，context 完全隔离 |
| B. CLAUDE.md 写"怎么续" | 中等任务 | 在指令文件里写"如果中断了，请先 `git log -5` 和 `git status` 再继续"——把"怎么续"作为冷启动指令 |
| C. 连续 5 小时不清 | **强烈不推荐** | 后期 Agent 必然开始"忘记"早期约束、变笨、产出重复修复 |

---

## 4. 安全：deny 永远第一

**永远不要让 Agent 默认拥有破坏性权限**。"给它 1 个权限 = 让它能用到 1 个" 是错误模型；正确模型是"默认拒绝 + 显式白名单"。

### 4.1 三级危险模型

把工具按破坏半径分三档，配权限时心里有数：

| 等级 | 例子 | 配权策略 |
|---|---|---|
| **L1 只读** | `Read`、`Grep`、`Glob`、`Bash(ls *)`、`Bash(git status)` | 几乎无副作用，可以默认开 |
| **L2 局部写** | `Edit`、`Write`、`Bash(npm test)`、`Bash(git commit *)` | 影响工作区，需要按任务白名单 |
| **L3 系统级** | `Bash(rm -rf *)`、`Bash(curl *)`、`Bash(git push *)`、`Bash(sudo *)` | 必须显式拒绝或每次确认 |

### 4.2 deny 永远优先于 allow

这是 Claude Code / Codex 共同的关键规则（Anthropic 原话）："Rules are evaluated in order: deny, then ask, then allow. The first match in that order determines the outcome, and rule specificity does not change the order."

**核心警告**："提示中的指令或 `CLAUDE.md` 只能'影响 Claude 尝试做什么'，不能改变 Claude Code 实际允许的内容。"

也就是说，prompt 写"请不要 rm -rf"是**无效**的；必须在 `settings.json` 里 deny。

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git commit *)",
      "Bash(* --version)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Bash(sudo *)"
    ]
  }
}
```

**复合命令陷阱**："Claude Code 识别 shell 操作符，因此 `Bash(safe-cmd *)` **不会**授权执行 `safe-cmd && other-cmd`。" —— 不会被通配符绕过。

### 4.3 三家权限机制对照

| 维度 | Claude Code | Codex | Copilot CLI |
|---|---|---|---|
| 配置文件 | `settings.json`（4 层优先级） | `~/.codex/config.toml` | CLI 启动参数 + `.github/copilot-instructions.md` |
| 写规则语法 | `permissions.allow/deny/ask` | **Approval mode**（Auto / Read-only / Full Access）+ `sandbox` 配置 | `--allow-tool` / `--deny-tool` / `--available-tools` / `--excluded-tools` |
| 工具模式匹配 | `Bash(git:*)`（冒号） | 基于前缀 + shell 元字符 | `shell(git:*)`（冒号） |
| 优先级 | deny > ask > allow（按列表顺序） | Approval mode 是边界 + 是否提示 | `--available-tools` 覆盖 `--excluded-tools`；`--deny-tool` 覆盖 `--allow-tool` |
| 沙箱能力 | OS 级 sandbox（`/sandbox`，仅 Bash） | `sandbox` 配置（结合 Approval mode） | 仅基于规则的 allow/deny |
| **推荐默认** | `default` 模式 + 编辑过的 `settings.json` | Approval = `Auto`，按任务加白名单 | `--available-tools='bash,edit,view,grep,glob' --allow-tool='shell(git:*)' --deny-tool='shell(git push)'` |

### 4.4 Approval mode 三档

Codex 把审批做成了三档显式状态（通过 `/permissions` 切换，配置在 `config.toml` 的 `approval_policy`）：

| Mode | 能力 | 何时用 |
|---|---|---|
| **Auto**（默认） | 当前工作目录内读/写/执行；越界（目录外、网络）需确认 | 日常开发 |
| **Read-only** | 只浏览文件，不做修改，需先批准 plan | 审 PR、看代码、咨询 |
| **Full Access** | 跨整台机器 + 网络，不再询问 | 可信仓库的自动化 |

Claude Code 有 **OS 级 sandbox**（`/sandbox` 启用，限制 Bash 文件系统和网络访问）。Copilot CLI 没有真沙箱，只能靠 `--deny-tool` 黑名单 + `--available-tools` 白名单缩小可选工具集。

**Codex 的 4 层防御**（配合使用）：

1. Approval mode（`Auto` / `Read-only` / `Full Access`）
2. `sandbox` 配置（文件系统和网络隔离）
3. `config.toml` 的 `[permissions]` 段（具体规则白/黑名单）
4. 启动旗标 `--yolo` 完全绕过（最后手段）

### 4.5 `--yolo` / `--dangerously-skip-permissions` 是最后手段

| 工具 | 旗标 | 备注 |
|---|---|---|
| Claude Code | `--dangerously-skip-permissions`（`bypassPermissions` 模式） | 跳过权限提示，但**强制 ask 规则仍然提示**；针对根目录与家目录的删除仍会作为熔断机制 |
| Codex | `--yolo` = `--dangerously-bypass-approvals-and-sandbox` | "在生产或共享环境使用 `--yolo`（除非处于专用沙箱 VM）"是被明令禁止的 |
| Copilot CLI | `--yolo` / `--allow-all` | 等同于同时启用 `--allow-all-tools`、`--allow-all-paths`、`--allow-all-urls` |

**官方一致警告**："Only use this mode in isolated environments like containers or VMs"。

**替代方案**：别用 `--yolo`，用 `--allowedTools "Edit,Bash(git commit *)"` 显式限定权限范围——Anthropic 原话："The `--allowedTools` flag restricts what Claude can do, which matters when you're running unattended."

**Claude Code 还有一个新选项**：`--permission-mode auto`（Auto mode）—— 单独的分类器模型审核命令，拦截范围升级、未知基础设施、恶意驱动操作。比 `bypassPermissions` 更安全：**只跳过"低风险"命令的提示，高风险仍询问**。注意：Auto mode 在非交互 `claude -p` 模式下，若分类器反复阻止会**中止**（无用户兜底）。

## 5. 做 Agent 的产品经理

Agent 时代编程的本质是"做 Agent 的清晰操作员"。Simon Willison 的原话：

> "The 'agentic' coding tools we have right now work like this: A skilled individual with both deep domain understanding and deep understanding of the capabilities of the agent..."

价值 = 领域知识 × 工具熟练度。下面 7 条心法按"反人性"程度排序。

### 5.1 提问要像产品需求文档

**反例**："修一下这个 bug"。

**正例**："登录在 session timeout 后失败，错误堆栈是 [粘贴]。先写一个失败测试复现，再修根因，不要只 suppress 错误。修改后跑 `pytest tests/auth/test_session.py` 全部用例验证。"

黄金模板：**[症状] + [期望行为] + [验证标准] + [禁止做法]**。

> Anthropic 原话："Give Claude a way to verify its work. 'Looks done' is not a good signal."

#### 给 Agent 配 4 种"验证门控"（按设置成本从低到高）

1. **同一个 prompt 内** —— 在指令里直接要求"运行测试并迭代直到通过"。
2. **`/goal`**（Claude Code） —— 跨会话条件门控，评估器每轮重新检查。
3. **Stop hook**（Claude Code） —— 脚本执行检查，**阻止 turn 结束**直到条件满足（注意：连续 8 次阻止后 Claude Code 会强制结束 turn，避免死循环）。
4. **Verification subagent**（独立 context）—— 在新上下文中反驳/审阅结论，避免自评偏差。
5. **Browser screenshot**（Claude Code + Chrome）—— 截图对比设计稿，验证 UI 改动。

### 5.2 增量验证：每改 10 行看一次

不要 100 行一次性 commit。每次让 Agent 改完：

1. `git diff` 确认范围正确
2. 用 `/diff`（Claude Code）看每 turn 的具体改动
3. 让 Agent 跑测试
4. 每次提交独立一个 commit（`git add -p`），便于回退和 review

**反模式**："把整个功能一次写完再 review"——一旦 review 出问题，**不知道哪 50 行引入的**。

### 5.3 任务拆分：一个会话 = 一件事

**反模式**：一个会话里做"加 OAuth + 修首页 bug + 重构 utils"，**混完后清理 context 极痛苦**。

**正例**：

- 会话 1 = "实现 password reset"
- 会话 2 = "加 metrics middleware"
- 用 git 分支隔离

官方警告："The kitchen sink session: One session with unrelated tasks. Use `/clear` between unrelated tasks."

### 5.4 两次失败就 `/clear` 重来

> Anthropic 原话："If you've corrected Claude more than twice on the same issue in one session, the context is cluttered with failed approaches. Run `/clear` and start fresh with a more specific prompt that incorporates what you learned."

干净会话 + 更好的 prompt 永远胜过"长会话 + 累积修正"。

### 5.5 子代理是 context 的瑞士军刀

> "Since context is your fundamental constraint, subagents are one of the most powerful tools available."

子代理在**独立 context** 中运行、返回摘要，主对话不被"读了 200 个文件"污染。

**典型用法**：

- 让 `explore` 子代理查 "auth 系统怎么管 token refresh" → 返回一段摘要。
- 让审查子代理用**新 context** 复审刚改的 diff —— **关键洞察**："A reviewer running in a fresh subagent context sees only the diff and the criteria you give it, not the reasoning that produced the change, so it evaluates the result on its own terms."

这是**对抗性验证**的标准模式：让一个干净的 context 独立判断结果好坏。

**Claude Code 的子代理体系**（最完整）：

- `claude agents`：内置多代理视图，监控并行后台会话
- **Agent teams**（`/agent-teams`）：多 session 自动协调 + 共享任务列表
- **Code intelligence plugin**：给 typed language 提供精确符号导航和自动错误检测
- 子代理配置在 `.claude/agents/*.md`，frontmatter 指定 `tools` 和 `model`

**Codex 的子代理**：

- `codex agents` 视图
- **`/fork`** 和 **`/side`**：在历史消息节点分叉/并行会话
- **Codex 关键差异**："Codex only spawns subagents when you **explicitly ask it to**" —— 不像 Claude Code 那样按需自动派生，token 消耗更可控
- 子代理配置在 `config.toml` 的 `[agents]` 段

**Copilot CLI 的子代理**：

- `/fleet`：把大任务**分解为并行子任务**由子代理执行
- `/delegate`：把整个工作转移到 **GitHub 云端 Copilot**，云端代理会创建 PR
- `/task`、`/review`：显式触发子代理（`/review` 有 4 种预设：base branch / uncommitted / commit / custom）
- 内置子代理（`/review`、`/task`、explore、`/fleet`）**自动继承** provider 配置

**Writer/Reviewer 模式**（Claude Code 强调）：用全新上下文的 Reviewer 子代理审 Writer 子代理的产出，避免自评偏差。

### 5.6 测试是 Agent 时代的"免费午餐"

> Simon Willison 原话："Good automated tests which the coding agent can run ... pytest ... 1500 tests ... Claude Code is great at selectively running just the relevant tests for a change, and running the full suite at the end."

**关键技巧**："detailed error messages! If a manual or automated test fails the more information you can return back to the model the better" —— **把 assertion 写详细**，让 Agent 能"自己读错误自己修"。

差的 assertion：

```python
assert user.is_authenticated()
```

好的 assertion（Agent 能直接定位问题）：

```python
assert user.is_authenticated(), f"Expected authenticated user, got state={user.state}, session_age={user.session_age}s, token={user.token[:8]}..."
```

Copilot CLI 的 Plan 流程标准最后一步就是 "Run the tests and fix any failures"——把"跑测试"嵌进标准工作流。

### 5.7 给 Agent 一个工具齐全的开发环境

Simon Willison 的 HN 回复清单（值得全文照搬）：

- **好测试**（pytest + 详细 assertion message）
- **开发服务器启动说明**（让 Agent 用 Playwright / curl 交互式验证 UI 改动）
- **Lint + type check + formatter**（Agent 会自己用）
- **GitHub issues 列表**（把 issue URL 直接贴进 prompt，"having great results"）

**反直觉点**："I have extensive documentation in all of my projects, but I don't think it's particularly useful for coding agents. LLMs can read the code a lot faster than you to figure out how to use it."

文档对 Agent 没用，**Agent 读代码比人快**；文档的作用反而是"让 Agent 检查文档是否需要更新"。

### 5.8 5 条必避反模式

| 反模式 | 描述 | 修复 |
|---|---|---|
| **The kitchen sink session** | 一个会话混入不相关任务 | 任务间用 `/clear` |
| **Correcting over and over** | 同一问题多次纠正 | 2 次失败就 `/clear` 改 prompt |
| **The over-specified CLAUDE.md** | 规则太多淹没有效指令 | 严格剪枝（200 行内），复杂规则改 hook |
| **The infinite exploration** | "调查"无边界，Agent 读数百文件 | 缩小范围或用 subagent |
| **The trust-then-verify gap** | 实现看起来合理但缺边缘场景 | 始终要求提供验证（测试 / 脚本 / 截图） |

---

## 6. 参考

- Claude Code: <https://code.claude.com/docs/en/best-practices>
- Codex CLI: <https://developers.openai.com/codex/cli/features> + <https://developers.openai.com/codex/cli/reference>
- Copilot CLI: <https://docs.github.com/en/copilot/how-tos/copilot-cli/cli-best-practices>
- Simon Willison "Setting up a codebase for working with coding agents"（2025-10-25）: <https://simonwillison.net/2025/Oct/25/coding-agent-tips/>
