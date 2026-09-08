---
title: JUnit 单元测试学习笔记
link: 'junit'
description: 整理测试阶段划分、JUnit 入门、参数化测试、断言和常见注解。
date: 2025-05-01T00:00:00.000Z
updated: 2025-05-01T00:00:00.000Z
tags: [JUnit, Java]
categories: [[笔记, Java 全栈]]
---

这篇笔记整理 Java 后端单元测试的基础概念和 JUnit 常用写法。当前仍保留课堂笔记结构，后续可以补充更完整的测试命名规范和典型业务场景。

## 本文要点

- 软件测试可分为单元测试、集成测试、系统测试和验收测试。
- JUnit 可以让测试代码与业务代码分离，并支持自动化运行。
- 常用能力包括参数化测试、断言、生命周期注解和依赖范围配置。
- 单元测试重点验证最小业务单元的正确性。

### 1. 单元测试
#### 1.介绍
- 测试：是一种用来促进鉴定软件的正确性、完整性、安全性和质量的过程。
- 阶段划分：单元测试、集成测试、系统测试、验收测试。

1). 单元测试

- 介绍：对软件的基本组成单位进行测试，最小测试单位。
- 目的：检验软件基本组成单位的正确性。
- 测试人员：开发人员

2). 集成测试

- 介绍：将已分别通过测试的单元，按设计要求组合成系统或子系统，再进行的测试。
- 目的：检查单元之间的协作是否正确。
- 测试人员：开发人员

3). 系统测试

- 介绍：对已经集成好的软件系统进行彻底的测试。
- 目的：验证软件系统的正确性、性能是否满足指定的要求。
- 测试人员：测试人员

4). 验收测试

- 介绍：交付测试，是针对用户需求、业务流程进行的正式的测试。
- 目的：验证软件系统是否满足验收标准。
- 测试人员：客户/需求方

**测试方法：**白盒测试、黑盒测试 及 灰盒测试。
#### 2. Junit 入门

   我们使用了 JUnit 单元测试框架进行测试，将会有以下优势：
1. 测试代码与源代码分开，便于维护。
2. 可根据需要进行自动化测试。
3. 可自动分析测试结果，产出测试报告。



##### 1. 入门程序

需求：使用 JUnit，对 UserService 中的业务方法进行单元测试，测试其正确性。
1. 在 pom.xml 中，引入 JUnit 的依赖。
```xml
<!--Junit单元测试依赖-->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.9.1</version>
    <scope>test</scope>
</dependency>
```
2. 在 test/java 目录下，创建测试类，并编写对应的测试方法，并在方法上声明@Test 注解。
```java
@Test
public void testGetAge(){
    Integer age = new UserService().getAge("110002200505091218");
    System.out.println(age);
}
```
3. 运行单元测试 (测试通过：绿色；测试失败：红色)。
- 测试通过显示绿色

> 注意：
- 测试类的命名规范为：XxxxTest
- 测试方法的命名规定为：public void xxx(){...}

##### 2. 参数化测试

​		参数化测试是一种测试方法，允许你使用不同的输入参数多次运行同一个测试方法，以验证代码在不同输入下的行为。JUnit 5 提供了 @ParameterizedTest 注解来实现参数化测试。

1. 核心概念
@ParameterizedTest：标记一个方法是参数化测试方法。
参数来源：通过 @ValueSource、@CsvSource、@MethodSource 等注解提供测试参数。
多次执行：每个参数都会触发一次测试方法的执行。

##### 3. 断言
JUnit 提供了一些辅助方法，用来帮我们确定被测试的方法是否按照预期的效果正常工作，这种方式称为断言。

| 断言方法                                              | 描述                                       |
| ----------------------------------------------------- | ------------------------------------------ |
| assertEquals(Object exp, Object act, String msg)      | 检查两个值是否相等，不相等就报错。         |
| assertNotEquals(Object unexp, Object act, String msg) | 检查两个值是否不相等，相等就报错。         |
| assertNull(Object act, String msg)                    | 检查对象是否为 null，不为 null，就报错。     |
| assertNotNull(Object act, String msg)                 | 检查对象是否不为 null，为 null，就报错。     |
| assertTrue(boolean condition, String msg)             | 检查条件是否为 true，不为 true，就报错。     |
| assertFalse(boolean condition, String msg)            | 检查条件是否为 false，不为 false，就报错。   |
| assertSame(Object exp, Object act, String msg)        | 检查两个对象引用是否相等，不相等，就报错。 |

示例演示：

```java
package com.itheima;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

public class UserServiceTest {
    
    @Test
    public void testGetAge2(){
        Integer age = new UserService().getAge("110002200505091218");
        Assertions.assertNotEquals(18, age, "两个值相等");
//        String s1 = new String("Hello");
//        String s2 = "Hello";
//        Assertions.assertSame(s1, s2, "不是同一个对象引用");
    }

    @Test
    public void testGetGender2(){
        String gender = new UserService().getGender("612429198904201611");
        Assertions.assertEquals("男", gender);
    }
}
```

##### 4. 常见注解

| 注解               | 说明                                                         | 备注                            |
| ------------------ | ------------------------------------------------------------ | ------------------------------- |
| @Test              | 测试类中的方法用它修饰才能成为测试方法，才能启动执行         | 单元测试                        |
| @BeforeEach        | 用来修饰一个实例方法，该方法会在每一个测试方法执行之前执行一次。 | 初始化资源(准备工作)            |
| @AfterEach         | 用来修饰一个实例方法，该方法会在每一个测试方法执行之后执行一次。 | 释放资源(清理工作)              |
| @BeforeAll         | 用来修饰一个静态方法，该方法会在所有测试方法之前只执行一次。 | 初始化资源(准备工作)            |
| @AfterAll          | 用来修饰一个静态方法，该方法会在所有测试方法之后只执行一次。 | 释放资源(清理工作)              |
| @ParameterizedTest | 参数化测试的注解 (可以让单个测试运行多次，每次运行时仅参数不同) | 用了该注解，就不需要@Test 注解了 |
| @ValueSource       | 参数化测试的参数来源，赋予测试方法参数                       | 与参数化测试注解配合使用        |
| @DisplayName       | 指定测试类、测试方法显示的名称 （默认为类名、方法名）        |                                 |

演示 `@BeforeEach`，`@AfterEach`，`@BeforeAll`，`@AfterAll` 注解：

```java
public class UserServiceTest {

    @BeforeEach
    public void testBefore(){
        System.out.println("before...");
    }

    @AfterEach
    public void testAfter(){
        System.out.println("after...");
    }

    @BeforeAll //该方法必须被static修饰
    public static void testBeforeAll(){ 
        System.out.println("before all ...");
    }

    @AfterAll //该方法必须被static修饰
    public static void testAfterAll(){
        System.out.println("after all...");
    }

    @Test
    public void testGetAge(){
        Integer age = new UserService().getAge("110002200505091218");
        System.out.println(age);
    }
    
    @Test
    public void testGetGender(){
        String gender = new UserService().getGender("612429198904201611");
        System.out.println(gender);
    }
 }   
```

##### 5. 依赖范围

依赖的 jar 包，默认情况下，可以在任何地方使用，在 main 目录下，可以使用；在 test 目录下，也可以使用。 

在 maven 中，如果希望限制依赖的使用范围，可以通过 `<scope>…</scope>` 设置其作用范围。

作用范围：
- 主程序范围有效。（main 文件夹范围内）
- 测试程序范围有效。（test 文件夹范围内）
- 是否参与打包运行。（package 指令范围内）

可以在 pom.xml 中配置 <scope></scope> 属性来控制依赖范围。

## 小结

单元测试的重点不是“跑起来”，而是把最小业务单元的预期行为写清楚。JUnit 的注解、断言和参数化测试都是围绕这个目标服务的。
