---
title: 链队列实现
link: 'queue-and-array'
description: 带头结点的链队列 C 语言实现：初始化、入队、出队、判空与释放，附二级指针用法详解
date: 2025-11-14T00:00:00.000Z
updated: 2025-11-14T00:00:00.000Z
tags: [数据结构, C语言, 队列]
categories: [[笔记, 计算机基础]]
---

队列是一种**先进先出（FIFO）**的线性数据结构，只允许在一端（队尾）插入、另一端（队头）删除。链队列用带头结点的单链表实现，相比顺序队列（循环数组）不会存在假溢出问题，空间按需分配。

## 数据结构定义

```c
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>

typedef char DataType;

typedef struct LQNode {
    DataType data;
    struct LQNode *next;
} LQNode, *LinkedQNode; // 链队列结点的类型

typedef struct {
    struct LQNode *front, *rear; // 头指针和尾指针
} LQueue, *LinkedQueue; // 将头、尾指针封装在一起的链队列

// [算法 3.21]    创建一个带头结点的空队列
void QueueInit(LinkedQueue *Q) {  //构造一个空队列 Q
    *Q = (LinkedQueue)malloc(sizeof(LQueue)); // 分配队列结构体空间
    if (!(*Q)) return; // 分配失败
    (*Q)->front = (LQNode*)malloc(sizeof(LQNode)); // 分配头结点
    if (!((*Q)->front)) {
        free(*Q);
        *Q = NULL;
        return;
    }
    (*Q)->front->next = NULL; // 头结点next置空
    (*Q)->rear = (*Q)->front; // front和rear都指向头结点，表示队列为空
}

// [算法 3.22]    入队列
bool QueueIn(LinkedQueue Q, DataType x) {  //插入元素 x 为 Q 的队尾元素
    if (!Q) return false;
    LQNode *node = (LQNode*)malloc(sizeof(LQNode)); // 新建结点
    if (!node) return false;
    node->data = x;
    node->next = NULL;
    Q->rear->next = node; // 原队尾结点next指向新结点
    Q->rear = node; // rear指向新结点
    return true;
}

// [算法 3.23]    出队列
bool QueueOut (LinkedQueue Q, DataType *x){  //若队列不空 ,则删除 Q 的队头元素
    if (!Q || Q->front == Q->rear) return false; // 队空
    LQNode *p = Q->front->next; // 队头元素
    *x = p->data; // 取数据
    Q->front->next = p->next; // 头结点next指向下一个结点
    if (Q->rear == p) Q->rear = Q->front; // 若出队后队空，rear回到头结点
    free(p);
    return true;
}

// [算法 3.24]    判断队列是否为空
bool QueueEmpty(LinkedQueue Q) {  //判断队列 Q 是否为空
    if (!Q) return true;            // 队列指针为空
    return Q->front == Q->rear;     // 头尾指针相遇即为空
}

//清空队列
void Empty(LinkedQueue Q)
{
    while (Q->front != Q->rear)
    {
        LQNode * p = Q->front->next;    //取得队列第一个元素指针
        Q->front->next = p->next;   //修改队头指针指向
        free(p);
        if(Q->front->next == NULL) //只有一个元素时 ,出队后队空 ,此时还要修改队尾指针
            Q->rear = Q->front;
    }
}

// 释放队列
void FreeQueue(LinkedQueue *Q) {
    if (*Q == NULL) return; // 如果队列为空，直接返回

    LQNode * current = (*Q)->front; // 从头节点开始
    LQNode * temp;

    while (current != NULL) {
        temp = current; // 保存当前节点
        current = current->next; // 移动到下一个节点
        free(temp); // 释放当前节点
    }

    free(*Q); // 最后释放队列结构体本身
    *Q = NULL; // 将队列指针设为NULL，防止悬挂指针
}

//获取队首元素
void GetQueue(LinkedQueue Q)
{
    if (Q->front == NULL)
    {
        printf("None\n");
        return;
    }
    else
       printf("%c\n", Q->front->next->data);

}

int main()
{
    DataType c,x;
    LinkedQueue Q = NULL;
    QueueInit(&Q);
    while (1)
    {
        scanf(" %c", &c);
        if (c == 'E')
        {
            scanf(" %c", &x);
            QueueIn(Q, x);
        }
        else if (c == 'C')
        {
            Empty(Q);
        }
        else if (c == 'G')
        {
            GetQueue(Q);
        }
        else if (c == 'D')
        {
            //dequeue(m);
            if(QueueOut(Q, &x))
             printf("%c\n", x);
          else
             printf("None\n");
        }
        else if (c == 'Q')
        {
            break;
        }
    }
    FreeQueue(&Q);
    return 0;
}
```

这里详细讲一下 `(*Q)->` 的含义和作用：

## 二级指针解引用 `(*Q)->`

1. **参数类型**  
   `QueueInit(LinkedQueue *Q)` 里的 `Q` 是“指向队列指针的指针”。  
   也就是：`LinkedQueue` 是 `LQueue *`，`LinkedQueue *Q` 就是 `LQueue **Q`。

2. **解引用**  
   `*Q` 表示“取出 Q 指向的内容”，也就是实际的队列指针（`LQueue *`）。  
   例如：`*Q = malloc(...)`，就是让外部的队列指针指向新分配的队列结构体。

3. **访问结构体成员**  
   `(*Q)->front` 表示“队列的头指针”。  
   因为 `*Q` 是 `LQueue *`，所以用 `->` 访问结构体成员。

4. **为什么不用 Q->front**  
   如果直接用 `Q->front`，那 Q 必须是 `LQueue *`，而不是 `LQueue **`。  
   但这里 Q 是指向指针的指针，所以要先解引用，再访问成员。

**举例说明：**

```c
void QueueInit(LinkedQueue *Q) {
    *Q = (LinkedQueue)malloc(sizeof(LQueue)); // 分配队列结构体
    (*Q)->front = (*Q)->rear = (LQNode *)malloc(sizeof(LQNode)); // 分配头结点
    (*Q)->front->next = NULL; // 头结点next置空
}
```

- `*Q`：拿到实际的队列指针
- `(*Q)->front`：访问队列的头指针
- `(*Q)->rear`：访问队列的尾指针

**总结**：`(*Q)->` 是先解引用拿到队列指针，再用 `->` 访问结构体成员。这样才能正确初始化和操作队列。

## 用指针返回出队值 `*x = p->data`

出队函数签名是 `QueueOut(LinkedQueue Q, DataType *x)`，其中 `*x = p->data;` 这一行**不带 `*` 不行**。

原因是：要把出队的元素值“带出来”给主程序用，必须用**指针参数**（`DataType *x`），在函数里通过 `*x = p->data;` 赋值。如果只用值参数（如 `DataType x`），函数内部的赋值不会影响主程序变量，主程序拿不到出队的值。这就是 C 语言“用指针返回结果”的常规做法——和 `scanf("%d", &n)` 传 `&n` 一个道理。
