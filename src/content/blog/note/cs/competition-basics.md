---
title: 编程基础：从输入输出到算法入门
link: 'competition-basics'
description: 编程入门必备知识：输入输出、常用函数、变量命名惯例、链表基础、踩坑记录
date: 2025-06-12T00:00:00.000Z
updated: 2025-07-26T00:00:00.000Z
tags: [C++, 排序]
categories: [[笔记, 计算机基础]]
---

本文整理编程学习过程中的基础知识和实用技巧，涵盖输入输出、常用函数、数据结构、惯例以及踩坑记录。

<!-- more -->

## 1. 基础语法要点

### 1.1 输入输出

#### 基本输入输出

```cpp
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;        // 读取输入
    cout << a + b << endl; // 输出结果
    return 0;
}
```

#### 读取整行输入

`getline` 可以正确处理包含空格的字符串输入：

```cpp
string line;
getline(cin, line);  // 读取整行，包括空格
```

#### 输入流写进判断条件

持续读取直到输入结束：

```cpp
int a;
while (cin >> a) {
    // 处理每个输入的值
}
```

### 1.2 常用函数

#### swap - 交换变量

```cpp
int a = 1, b = 2;
swap(a, b);  // 交换后 a=2, b=1
```

#### sort - 排序函数

`sort` 是 C++ 标准库 `<algorithm>` 中的排序函数，平均时间复杂度 O(n log n)。

```cpp
#include <algorithm>

int arr[] = {5, 2, 9, 1};

// 默认升序排序
sort(arr, arr + 4);  // 结果：1, 2, 5, 9

// 降序排序
sort(arr, arr + 4, greater<int>());  // 结果：9, 5, 2, 1

// 对 vector 排序
vector<int> v = {5, 2, 9, 1};
sort(v.begin(), v.end());

// 自定义排序规则
bool cmp(int a, int b) { return a > b; }
sort(arr, arr + 4, cmp);  // 降序
```

**参数说明**：

- 第一个参数：排序起始位置的指针/迭代器
- 第二个参数：排序结束位置的后一位指针/迭代器（左闭右开区间 `[begin, end)`）

#### max - 取最大值

```cpp
int res = 0;
res = max(res, nums[i]);  // 更新最大值
```

#### pow - 幂运算

```cpp
double result = pow(2, 3);  // 计算 2^3 = 8
```

#### strlen - 字符串长度

```cpp
char t[] = "hello";
int len = strlen(t + 1);  // 从 t[1] 开始计算长度
```

### 1.3 变量与数据结构

#### vector 初始化

```cpp
vector<int> nums(5);  // 初始化大小为5的向量，元素为 {0, 0, 0, 0, 0}
vector<int> v = {1, 2, 3};  // 列表初始化
```

#### 结构体 vs map 的选择

根据题目特点选择：

- **结构体**：适合需要存储多个相关字段的情况
- **map**：适合需要按键值快速查找的情况

#### string 数组的限制

```cpp
// 注意：大量 string 数组可能导致编译器溢出
string arr[100000];  // 可能有问题，考虑使用 vector<string>
```

## 2. 常用技巧

### 2.1 变量命名惯例

竞赛中常用的缩写命名：

| 缩写 | 全称 | 用途 |
|------|------|------|
| `vis` | visited | 标记节点/状态是否已访问，用于图遍历（DFS/BFS）、动态规划、回溯算法 |
| `ind` | index | 表示数组、列表中的索引位置 |
| `tmp` | temporary | 临时变量，暂存中间值 |
| `ans` | answer | 存储最终结果 |
| `res` | result | 存储计算结果 |

### 2.2 实用技巧

#### 单个 & 取余

```cpp
int x = 7;
int result = x & 1;  // 取余操作，判断奇偶
```

#### #define int long long 与 signed main()

竞赛中为了避免整数溢出，常用宏定义：

```cpp
#define int long long  // 把所有 int 替换成 long long

// 但 main() 必须返回 int，所以用 signed 代替
signed main() {
    // signed 不会被宏替换，符合 main() 返回类型要求
    return 0;
}
```

#### 动态内存管理

```cpp
// C++ 方式
int *p = new int;       // 分配 1 个 int
int *arr = new int[10]; // 分配数组

delete p;        // 释放单个
delete[] arr;    // 释放数组
```

#### 强制类型转换

```cpp
double d = 3.14;
int i = (int)d;  // C 风格强制转换
int j = static_cast<int>(d);  // C++ 风格，更安全
```

## 3. 数据结构基础

### 3.1 链表

#### 链表结构定义

```cpp
struct Node {
    int val;
    Node *next;
};
```

#### now->next 的含义

- `now` 是一个 `Node*` 类型指针，指向链表中的某个节点
- `next` 是 `Node` 结构体的成员，类型是 `Node*`
- `now->next` 指向：
  - **下一个节点**（如果存在）
  - **`NULL`**（如果当前节点是链表的最后一个节点）

#### 链表基本操作示例

```cpp
#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node *next;
};

int main() {
    int n;
    cin >> n;
    
    Node Head;
    Node* now = &Head;
    
    // 创建链表
    int tmp;
    for (int i = 0; i < n; i++) {
        cin >> tmp;
        now->next = new Node;
        now = now->next;
        now->val = tmp;
    }
    
    // 删除指定位置的节点
    int m;
    cin >> m;
    while (m--) {
        now = &Head;
        cin >> tmp;
        for (int i = 0; i < tmp - 1; i++) {
            now = now->next;
        }
        now->next = now->next->next;
    }
    
    // 遍历输出
    now = &Head;
    while (now->next != NULL) {
        now = now->next;
        cout << now->val << " ";
    }
    
    return 0;
}
```

## 4. 踩坑记录（经验总结）

### 4.1 函数返回值必须写 return 0

**问题**：函数在某些条件下没有返回值，这是**未定义行为(UB)**。

```cpp
int fun(int x) {
    if (x % 7 == 0) return 1;
    // 错误：当 x 不含 7 时没有返回值！
}
```

**后果**：
- 本地编译器可能默认返回 0（巧合正确）
- 在线评测系统可能陷入死循环或返回随机值

**解决**：一定要写 `return 0;`

### 4.2 注意题目数据类型

- 仔细阅读题目要求的数据类型范围
- 使用 `long long` 避免整数溢出
- 注意浮点数精度问题

### 4.3 数组搜索超时问题

数组搜索如果使用朴素算法，可能因为超时无法通过。考虑：
- 使用更高效的算法（如二分查找）
- 使用合适的数据结构（如 set、map）

### 4.4 格式化输出 %.10lg

`%.10lg` 是 `printf` 中的格式化控制符：
- `.10`：最大保留 10 位有效数字（不是小数点后 10 位）
- `l`：参数是 `double` 类型
- `g`：智能选择输出格式
  - 指数小于 -4 或大于等于精度时，使用科学计数法
  - 否则使用常规小数格式
  - 自动删除末尾无效的零

### 4.5 scanf 安全警告 (Error C4996)

**问题**：微软编译器中 `scanf` 被标记为不安全。

**解决**：
- 使用 `scanf_s`（微软特有）
- 或者在文件开头添加：`#pragma warning(disable:4996)`
- 或者使用 `cin` 代替

## 5. 完整代码示例

### 5.1 sort 排序找第 m 大数

```cpp
#include <bits/stdc++.h>
using namespace std;

const int N = 1e3 + 7;  // 定义数组最大长度
int n, m, a[N];         // 全局数组，默认初始化为 0

int main() {
    cin >> n >> m;       // 输入元素个数 n 和要找的第 m 大数
    
    for (int i = 1; i <= n; i++)
        cin >> a[i];     // 输入数据存入 a[1]~a[n]
    
    sort(a + 1, a + 1 + n);  // 对 a[1]~a[n] 排序
    
    cout << a[n - m + 1] << endl;  // 输出第 m 大的数
    return 0;
}
```

**说明**：
- 排序后数组是升序，`a[n]` 是最大值
- 第 `m` 大的数位于 `a[n - m + 1]`

### 5.2 自定义排序规则

```cpp
#include <bits/stdc++.h>
using namespace std;

// 自定义比较函数：降序
bool cmp(int a, int b) {
    return a > b;
}

int main() {
    int arr[] = {5, 2, 9, 1};
    sort(arr, arr + 4, cmp);  // 降序排序
    
    for (int i = 0; i < 4; i++)
        cout << arr[i] << " ";  // 输出：9 5 2 1
    
    return 0;
}
```

## 6. 总结

**学习路径建议**：
1. 先掌握基础语法和输入输出
2. 熟悉常用函数（sort、swap、max 等）
3. 了解竞赛中的命名惯例和实用技巧
4. 学习基础数据结构（数组、链表、vector）

**常见错误清单**：
- [ ] 函数必须有返回值
- [ ] 注意数据类型范围
- [ ] 排序区间是左闭右开 `[begin, end)`
- [ ] 链表操作注意空指针
- [ ] 大数组考虑使用 vector 动态分配
