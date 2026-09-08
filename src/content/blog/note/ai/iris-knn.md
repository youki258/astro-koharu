---
title: 机器学习入门：从 ML 概述到 KNN 分类
link: 'iris-knn'
description: 机器学习基本概念、KNN 分类算法原理与 scikit-learn 实现、参数调优实战
date: 2025-08-15T00:00:00.000Z
updated: 2026-04-08T00:00:00.000Z
tags: [机器学习, KNN, Python, scikit-learn]
categories: [[笔记, AI]]
---

## 人工智能、机器学习与深度学习的关系

- **人工智能（AI）**
  - 概念起源：1950 年代
  - 目标：创建能够达到人类智慧水平的机器
  - 实现方式：有多种方法，机器学习是其中之一

- **机器学习（ML）**
  - 发展时间：1980 年代开始兴起
  - 地位：实现人工智能的一种重要方法
  - 发展推动因素：数据量增长、硬件设施发展、算法进步

- **深度学习（DL）**
  - 发展时间：2010 年左右开始热门
  - 地位：机器学习的一个重要分支
  - 包含算法：CNN、RNN 等

关系总结：**深度学习 ⊂ 机器学习 ⊂ 人工智能**

## 机器学习基本概念

### 机器学习解决问题的基本流程

1. **训练样本**：N 个已知样本数据
2. **特征提取**：从样本中提取有用属性
3. **算法学习**：使用算法学习特征规律
4. **模型构建**：形成可预测的模型
5. **预测未知**：对新数据进行预测

### 机器学习分类

- **监督学习**：训练样本包含标签，应用：分类、回归问题
- **无监督学习**：训练样本不包含标签，应用：聚类分析

## 鸢尾花分类项目实践

### 数据集

- 样本数量：150 个
- 特征数量：4 个（花萼长度、花萼宽度、花瓣长度、花瓣宽度）
- 分类类别：3 种（山鸢尾、变色鸢尾、维吉尼亚鸢尾）

## KNN 分类算法基础

### scikit-learn 基础

1. **数据格式要求**：
   - 特征 X 必须是数值矩阵（如 150×4）
   - 标签 y 必须是数值向量（如 150 个 0/1/2）

2. **数据预处理**：

```python
iris_data['Label'] = iris_data['Species'].map({
    'Iris-setosa': 0,
    'Iris-versicolor': 1,
    'Iris-virginica': 2
})
```

3. **数据划分**：

```python
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.33, random_state=10)
```

### KNN 算法原理

1. **工作原理**：
   - 计算测试样本与所有训练样本的距离
   - 找出距离最近的 K 个邻居
   - 根据邻居的多数类别确定预测结果

2. **K 值影响**：
   - K=1：只考虑最近的一个样本（容易受噪声影响）
   - K 增大：决策边界更平滑（可能忽略局部特征）

### scikit-learn 实现流程

```python
from sklearn.neighbors import KNeighborsClassifier

# 创建模型（默认K=5）
knn = KNeighborsClassifier()

# 训练模型
knn.fit(X_train, y_train)

# 评估与预测
accuracy = knn.score(X_test, y_test)
y_pred = knn.predict(X_new)
```

## KNN 算法深入与参数调优

### 相似性度量（距离计算）

- **明可夫斯基距离**：`distance = (∑|x_i - y_i|^p)^(1/p)`
  - p=2：欧式距离（默认）
  - p=1：曼哈顿距离

```python
KNeighborsClassifier(metric='minkowski', p=2)  # 欧式距离
KNeighborsClassifier(metric='minkowski', p=1)  # 曼哈顿距离
```

### 模型参数分类

- **超参数**：需要人工预先设定（如 K 值、距离度量方式）
- **模型参数**：通过训练数据自动学习得到（如线性回归系数）

### KNN 优缺点

**优点**：
1. 原理简单直观，易于实现
2. 无需训练过程（惰性学习）
3. 对数据分布没有假设

**缺点**：
1. 计算量大（需计算与所有训练样本的距离）
2. 对高维数据效果差（维度灾难）
3. 需要合理选择 K 值和距离度量
4. 对不平衡数据敏感

### 实践：不同 K 值的分类效果

```python
from sklearn.neighbors import KNeighborsClassifier

k_values = [3, 5, 10]
selected_features = ['SepalLengthCm', 'SepalWidthCm']

for k in k_values:
    knn = KNeighborsClassifier(n_neighbors=k)
    knn.fit(X_train[selected_features], y_train)
    accuracy = knn.score(X_test[selected_features], y_test)
    print(f'K={k}时准确率: {accuracy:.2%}')
```

实验结果（仅使用花萼长宽两个特征）：
- K=3：准确率 66%
- K=5：准确率 68%
- K=10：准确率 78%

### 关键知识点总结

1. **距离度量选择**：欧式距离适合大多数情况，曼哈顿距离对异常值更鲁棒

2. **K 值选择原则**：一般取 3-20 之间的奇数（避免平票），通过交叉验证确定最优值

3. **特征选择影响**：不同特征组合会影响分类效果

   
