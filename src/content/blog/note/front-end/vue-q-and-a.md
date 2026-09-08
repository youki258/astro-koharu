---
title: Vue.js 常见问题速查
link: 'vue-q-and-a'
description: Vue.js 常见问题速查：插值语法、v-if、ref、onMounted、TypeScript 速记
date: 2025-06-27T00:00:00.000Z
updated: 2025-06-27T00:00:00.000Z
tags: [Vue, v-if]
categories: [[笔记, 前端]]
---

### 1. `{{}}` 是什么？

**文本插值语法**
Vue 模板中使用双大括号 `{{}}` 进行**文本插值**，将数据绑定到 HTML 中。
**示例：**

```vue
<template>
  <div>{{ message }}</div>
</template>

<script setup>
const message = "Hello Vue!";
</script>
```

**说明：**

- `message` 是响应式数据，若值变化，视图会自动更新。
- **注意：** 插值内容会被自动转义，防止 XSS 攻击。

---

### 2. `v-if` 是什么？怎么用？

**条件渲染指令**
`v-if` 用于根据条件决定是否渲染某个元素（**惰性渲染**）。
**示例：**

```vue
<template>
  <div v-if="isVisible">显示内容</div>
  <div v-else>隐藏内容</div>
</template>

<script setup>
const isVisible = true;
</script>
```

**特点：**

- 条件为 `false` 时，元素不会出现在 DOM 中。
- 可搭配 `v-else`、`v-else-if` 使用。

---

### 3. `const count = ref(0);` 是什么？

**声明响应式变量**
使用 `ref()` 创建一个响应式引用，常用于基础类型（如数字、字符串）。
**示例：**

```vue
<template>
  <div>计数器：{{ count }}</div>
  <button @click="count++">+1</button>
</template>

<script setup>
import { ref } from 'vue';
const count = ref(0);
</script>
```

**说明：**

- `ref(0)` 返回一个响应式对象，通过 `.value` 访问/修改值（在 JavaScript 中），但在模板中直接使用变量名。
- 当 `count` 变化时，视图会自动更新。

---

### 4. `onMounted(() => { ... })` 是什么？

**生命周期钩子函数**
`onMounted` 是 Vue 的生命周期钩子，在组件挂载到 DOM 后执行。
**示例：**

```vue
<template>
  <div id="app">组件已加载</div>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  console.log('组件已挂载');
  // 可在此进行初始化操作（如请求数据）
});
</script>
```

**常见用途：**

- 发起 API 请求获取数据。
- 初始化第三方库（如地图、图表）。

---

### 5. `ts` 是什么？

**TypeScript 简称**
TypeScript 是 JavaScript 的超集，添加了**静态类型检查**功能。
**核心优势：**

- 提早发现错误（如变量类型不匹配）。
- 支持面向对象编程（类、接口等）。
- 更好的代码提示和重构能力。

**Vue 项目中使用 TypeScript：**

```vue
<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
// 定义类型
interface User {
  name: string;
  age: number;
}

// 使用类型
const user: User = { name: "Alice", age: 25 };
const message: string = `用户：${user.name}`;
</script>
```

**说明：**

- 在 `<script>` 或 `<script setup>` 标签中添加 `lang="ts"` 即可启用 TypeScript。
