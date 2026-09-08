---
title: 常用算法笔记：BFS、贪心、前缀和与差分
link: 'bfs-ai-optimized'
description: BFS 广度优先搜索、贪心算法、前缀和与差分、字典序最小序列构造
date: 2025-06-05T00:00:00.000Z
updated: 2025-06-05T00:00:00.000Z
tags: [BFS, C++, 贪心, 前缀和, 差分]
categories: [[笔记, 计算机基础]]
---

## 1. BFS 广度优先搜索

### 1.1 核心思想

- **层级遍历**：从起点逐层向外扩展，使用队列（FIFO）保证访问顺序
- **适用场景**：无权图最短路径、连通性检测、迷宫问题

### 1.2 算法步骤

1. 将起始节点放入队列，并标记为已访问
2. 从队列中取出一个节点，访问其所有未被访问的相邻节点，并将这些节点加入队列
3. 重复步骤 2，直到队列为空

### 1.3 C++ 模板代码

```cpp
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

void BFS(vector<vector<int>>& graph, int start) {
    vector<bool> visited(graph.size(), false);
    queue<int> q;
    q.push(start);
    visited[start] = true;

    while (!q.empty()) {
        int node = q.front();
        q.pop();
        cout << node << " "; // 处理节点
        for (int neighbor : graph[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}

// 示例：邻接表图遍历
int main() {
    vector<vector<int>> graph = {{1,2}, {0,3}, {0,3,4}, {1,2,4}, {2,3}};
    cout << "BFS顺序：";
    BFS(graph, 0); // 输出：0 1 2 3 4
    return 0;
}
```

### 1.4 BFS 最短路径（带路径记录）

```cpp
#include <iostream>
#include <vector>
#include <queue>
#include <unordered_map>
using namespace std;

vector<string> shortest_path(unordered_map<string, vector<string>>& graph, 
                           string start, string end) {
    queue<string> q;
    unordered_map<string, bool> visited;
    unordered_map<string, string> parent;  // 记录路径父节点
    
    q.push(start);
    visited[start] = true;
    parent[start] = "";

    while (!q.empty()) {
        string cur = q.front();
        q.pop();
        if (cur == end) {
            // 反向回溯路径
            vector<string> path;
            for (string at = end; at != ""; at = parent[at]) 
                path.push_back(at);
            reverse(path.begin(), path.end());
            return path;
        }
        for (string neighbor : graph[cur]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                parent[neighbor] = cur;  // 记录父节点
                q.push(neighbor);
            }
        }
    }
    return {}; // 无路径
}
```

### 1.5 复杂度分析

- **时间复杂度**：O(V + E)，其中 V 是节点数，E 是边数
- **空间复杂度**：O(V)，最坏情况下需要存储所有节点

### 1.6 与 DFS 的区别

| 特性 | BFS | DFS |
|------|-----|-----|
| 遍历方式 | 按层级 | 按深度 |
| 数据结构 | 队列 | 栈/递归 |
| 最短路径 | ✅ 无权图最优 | ❌ 不保证 |
| 空间占用 | 较多（队列） | 较少（递归栈） |
| 适用场景 | 最短路径、层级遍历 | 路径存在性、回溯 |

---

## 2. 贪心算法

### 2.1 核心思想

- **局部最优**：每一步选择当前最优解，无后效性
- **适用条件**：问题需满足**贪心选择性**和**最优子结构**

### 2.2 C++ 模板与示例

```cpp
#include <algorithm>
#include <vector>
using namespace std;

// 活动选择问题（最早结束优先）
struct Activity { int start, end; };
bool compare(Activity a, Activity b) { return a.end < b.end; }

int maxActivities(vector<Activity>& acts) {
    sort(acts.begin(), acts.end(), compare);
    int count = 1, lastEnd = acts[0].end;
    for (int i = 1; i < acts.size(); i++) {
        if (acts[i].start >= lastEnd) {
            count++;
            lastEnd = acts[i].end;
        }
    }
    return count;
}
```

### 2.3 典型应用场景

| 场景 | 策略 | 说明 |
|------|------|------|
| 活动安排 | 按结束时间排序 | 选择相容活动 |
| Huffman 编码 | 合并频率最低节点 | 需优先队列 |
| 最小硬币找零 | 面值从大到小遍历 | 仅适用特定面值 |

### 2.4 贪心的局限性

**反例**：硬币面值 {1, 3, 4}，找零 6
- 贪心解：{4, 1, 1}（3 枚）
- 最优解：{3, 3}（2 枚）

**结论**：贪心不一定全局最优，需数学证明贪心策略的正确性。

---

## 3. 前缀和与差分

### 3.1 一维前缀和

**用途**：快速计算区间和，预处理 O(n)，查询 O(1)。

```cpp
vector<int> prefix(n + 1, 0);
for (int i = 1; i <= n; i++) 
    prefix[i] = prefix[i-1] + arr[i-1];

// 查询 [L, R] 和：sum = prefix[R] - prefix[L-1];
```

**应用场景**：
- 区间求和问题
- 子数组和等于 k
- 结合哈希表优化

### 3.2 二维前缀和

**用途**：子矩阵求和（如 LeetCode 304）。

```cpp
// 预处理
vector<vector<int>> sum(n+1, vector<int>(m+1, 0));
for (int i = 1; i <= n; i++)
    for (int j = 1; j <= m; j++)
        sum[i][j] = sum[i-1][j] + sum[i][j-1] - sum[i-1][j-1] + matrix[i-1][j-1];

// 查询 (x1,y1) 到 (x2,y2) 和：
int area = sum[x2][y2] - sum[x1-1][y2] - sum[x2][y1-1] + sum[x1-1][y1-1];
```

### 3.3 差分

**用途**：高效处理区间增减（如批量加减 k）。

```cpp
vector<int> diff(n + 2, 0); // 多开空间防越界

void add(int l, int r, int k) {
    diff[l] += k;
    diff[r+1] -= k;
}

// 还原数组
for (int i = 1; i <= n; i++) 
    arr[i] = arr[i-1] + diff[i];
```

### 3.4 前缀和与差分的关系

| 操作 | 前缀和 | 差分 |
|------|--------|------|
| 主要用途 | 快速查询 | 快速修改 |
| 时间复杂度 | O(1) 查询 | O(1) 修改 |
| 逆操作 | 差分的前缀和 = 原数组 | 前缀和的差分 = 原数组 |

**结合使用**：先差分批量更新，再前缀和得到最终数组。

### 3.5 典型例题

- **前缀和**：区间和、子数组和等于 k、LeetCode 304
- **差分**：区间覆盖统计（MC0351）、航班预订统计（LeetCode 1109）

---

## 4. 字典序最小序列

### 4.1 定义

**字典序**：从左到右逐字符比较，首个不同位字符小的序列更小。

**示例**：
- "apple" < "apricot"（第三个字符 'p' < 'r'）
- [1, 2, 3] < [1, 3, 2]（第二个元素 2 < 3）

### 4.2 贪心构造

**核心思想**：每一步选当前可用的最小字符，确保后续合法。

```cpp
// 拼接字符串使字典序最小
sort(strs.begin(), strs.end(), [](string a, string b) {
    return a + b < b + a;
});
string ans;
for (string s : strs) ans += s;
```

---

## 5. C++ Queue 操作

| 函数 | 作用 | 示例 |
|------|------|------|
| `push()` | 队尾插入元素 | `q.push(10);` |
| `pop()` | 删除队首元素 | `q.pop();` |
| `front()` | 访问队首元素 | `int x = q.front();` |
| `back()` | 访问队尾元素 | `int y = q.back();` |
| `empty()` | 检测队列是否为空 | `if (q.empty()) { ... }` |
| `size()` | 返回队列元素数量 | `int len = q.size();` |

**注意事项**：

- `front()` 和 `pop()` 前需检查队列非空，否则行为未定义
- `vector` 不能作为底层容器（缺少 `pop_front()`）
