---
title: JavaScript 基础语法笔记
link: 'js-basics'
description: 整理 JavaScript 变量、输出语句、函数、自定义对象、JSON 和 DOM 基础。
date: 2025-05-03T00:00:00.000Z
updated: 2025-05-03T00:00:00.000Z
tags: [JavaScript, DOM, JSON]
categories: [[笔记, 前端]]
---

这篇笔记记录 JavaScript 入门阶段的基础语法，包括变量声明、函数写法、对象、JSON 和 DOM 操作。

## 本文要点

- `let` 用于声明变量，`const` 用于声明常量。
- 函数可以用普通函数、函数表达式和箭头函数声明。
- 对象和 JSON 是前端处理结构化数据的基础。
- DOM 操作可以让脚本读取和修改页面元素。

### js 基础

#### 1. 变量/常量

- 特点：js 是弱类型语言，变量可以存放不同类型的值
- 声明：
  - let：声明变量
  - const:声明常量，一旦声明，常量的值不能改变
- 注意：
  - 在早期的 js 中，声明变量还可以使用 var,但是并不严谨（不推荐）
#### 2. 输出语句
- window.alert()：弹出警告框（使用频次较高）
- console.log()：写入浏览器控制台（使用频次较高）
- document.write()：向 HTML 的 body 内输出内容

#### 3. 函数

- 格式一
```javascript
function 函数名(参数1,参数2..){
    要执行的代码
}
```
格式二：**匿名函数**
- 函数表达式 
- 箭头函数
```javascript
// 函数表达式
var add = function (a,b){
    return a + b;
}

// 箭头函数
var add = (a,b) => {
    return a + b;
}

// 上述匿名函数声明好了之后，是将这个函数赋值给了add变量。 那我们就可以直接通过add函数直接调用，调用代码如下：
let result = add(10,20);
alert(result);
```
#### 4. 自定义对象
```javascript
let 对象名 = {
    属性名1: 属性值1,
    属性名2: 属性值2,
    属性名3: 属性值3,
    方法名称: function(形参列表){}
};
```
示例：
```html
<script>
    //自定义对象
    let user = {
        name: "Tom",
        age: 10,
        gender: "男",
        sing: function(){
             console.log("悠悠的唱着最炫的民族风~");
         }
    }

    console.log(user.name);
    user.sing();
</script>
```
**注意：在定义对象中的方法时，尽量不要使用箭头函数（this）。**
#### 5. JSON  
> JSON 对象：JavaScript Object Notation，JavaScript 对象标记法。JSON 是通过 JavaScript 标记法书写的文本。
而由于语法简单，层级结构鲜明，现多用于作为数据载体，在网络中进行数据传输。

代码演示：
```javascript
//3. JSON - JS对象标记法
let person = {
  name: 'itcast',
  age: 18,
  gender: '男'
}
alert(JSON.stringify(person)); //js对象 --> json字符串

let personJson = '{"name": "heima", "age": 18}';
alert(JSON.parse(personJson).name);
```
#### 6. JS DOM
> DOM：Document Object Model 文档对象模型。也就是 JavaScript 将 HTML 文档的各个组成部分封装为对象。

**作用**
- 改变 HTML 元素的内容
- 改变 HTML 元素的样式（CSS）
- 对 HTML DOM 事件作出反应
- 添加和删除 HTML 元素

**DOM 操作**
- DOM 的核心思想：将网页的内容当做对象来处理，标签的所有属性在该对象上都可以找到，并且修改这个对象的属性，就会自动映射到标签身上。
- document 对象
  - 网页中所有内容都封装在 document 对象中
  - 它提供的属性和方法都是用来访问和操作网页内容的，如：document.write(……)
- DOM 操作步骤:
  - 获取 DOM 元素对象
  - 操作 DOM 对象的属性或方法 (查阅文档)

代码演示：
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JS-DOM</title>
</head>
<body>

  <h1 id="title1">11111</h1>
  <h1>22222</h1>
  <h1>33333</h1>

  <script>
    //1. 修改第一个h1标签中的文本内容
    //1.1 获取DOM对象
    // let h1 = document.querySelector('#title1');
    //let h1 = document.querySelector('h1'); // 获取第一个h1标签

    let hs = document.querySelectorAll('h1');

    //1.2 调用DOM对象中属性或方法
    hs[0].innerHTML = '修改后的文本内容';
  </script>
</body>
</html>
```

## 小结

JavaScript 基础需要先掌握变量、函数、对象和 DOM 操作。后续精修时，可以把示例统一成更完整的小案例，避免只停留在语法片段。
