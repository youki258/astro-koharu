---
title: JavaScript 事件监听笔记
link: 'js-events'
description: 整理 HTML 事件、addEventListener 语法、常见事件类型和表单交互。
date: 2025-05-03T00:00:00.000Z
updated: 2025-05-03T00:00:00.000Z
tags: [JavaScript, DOM]
categories: [[笔记, 前端]]
---

这篇笔记整理 JavaScript 事件监听的基础概念和常见事件。

## 本文要点

- HTML 事件是发生在页面元素上的交互行为。
- `addEventListener` 可以把事件和处理函数绑定起来。
- 常见事件包括点击、鼠标移入移出、键盘输入、聚焦和表单提交。
- 事件监听常用于表单校验、按钮交互和动态页面行为。

### JS 事件监听
#### 事件介绍
什么是事件呢？HTML 事件是发生在 HTML 元素上的 “事情”，例如：
- 按钮被点击
- 鼠标移到元素上
- 输入框失去焦点
- 按下键盘按键
- ……

而我们可以给这些事件绑定函数，当事件触发时，可以自动的完成对应的功能，这就是**事件监听**。
> 例如：对于我们所说的百度注册页面，我们给用户名输入框的失去焦点事件绑定函数，当我们用户输入完内容，在标签外点击了鼠标，对于用户名输入框来说，失去焦点，然后执行绑定的函数，函数进行用户名内容的校验等操作。

#### 事件监听语法
```javascript
事件源.addEventListener('事件类型', 要执行的函数);
```
##### 演示
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JS-事件-事件绑定</title>
</head>

<body>
    <input type="button" id="btn1" value="点我一下1">
    <input type="button" id="btn2" value="点我一下2">

    <script>
        document.querySelector("#btn1").addEventListener('click', ()=>{
            alert("按钮1被点击了...");
        })
    </script>
</body>
</html>
```
##### 常见事件
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JS-事件-常见事件</title>
</head>

<body>
    <form action="" style="text-align: center;">
        <input type="text" name="username" id="username">
        <input type="text" name="age" id="age">
        <input id="b1" type="submit" value="提交">
        <input id="b2" type="button" value="单击事件">
    </form>

    <br><br><br>

    <table width="800px" border="1" cellspacing="0" align="center">
        <tr>
            <th>学号</th>
            <th>姓名</th>
            <th>分数</th>
            <th>评语</th>
        </tr>
        <tr align="center">
            <td>001</td>
            <td>张三</td>
            <td>90</td>
            <td>很优秀</td>
        </tr>
        <tr align="center" id="last">
            <td>002</td>
            <td>李四</td>
            <td>92</td>
            <td>优秀</td>
        </tr>
    </table>
    
    <script>
        //click: 鼠标点击事件
        document.querySelector('#b2').addEventListener('click', () => {
            console.log("我被点击了...");
        })
        
        //mouseenter: 鼠标移入
        document.querySelector('#last').addEventListener('mouseenter', () => {
            console.log("鼠标移入了...");
        })

        //mouseleave: 鼠标移出
        document.querySelector('#last').addEventListener('mouseleave', () => {
            console.log("鼠标移出了...");
        })

        //keydown: 某个键盘的键被按下
        document.querySelector('#username').addEventListener('keydown', () => {
            console.log("键盘被按下了...");
        })

        //keyup: 某个键盘的键被抬起
        document.querySelector('#username').addEventListener('keyup', () => {
            console.log("键盘被抬起了...");
        })

        //blur: 失去焦点事件
        document.querySelector('#age').addEventListener('blur', () => {
            console.log("失去焦点...");
        })

        //focus: 元素获得焦点
        document.querySelector('#age').addEventListener('focus', () => {
            console.log("获得焦点...");
        })

        //input: 用户输入时触发
        document.querySelector('#age').addEventListener('input', () => {
            console.log("用户输入时触发...");
        })

        //submit: 提交表单事件
        document.querySelector('form').addEventListener('submit', () => {
            alert("表单被提交了...");
        })
    </script>
</body>

</html>
```

## 小结

事件监听是页面交互的入口。理解事件源、事件类型和回调函数之后，表单校验、按钮响应、键盘输入等常见交互都会更容易组织。
