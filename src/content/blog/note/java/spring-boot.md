---
title: Spring Boot Web 基础学习笔记
link: 'spring-boot'
description: 整理 HTTP 请求响应、Spring Boot Web 入门、分层解耦、Bean 声明和组件扫描。
date: 2025-05-12T00:00:00.000Z
updated: 2025-05-12T00:00:00.000Z
tags: [Spring Boot, Java, HTTP]
categories: [[笔记, Java 全栈]]
---

这篇笔记从 HTTP 协议基础切入，逐步整理 Spring Boot Web 开发里的请求处理、响应格式和分层解耦。正文内容较长，后续精修时适合拆成多篇专题文章。

## 本文要点

- HTTP 是基于请求-响应模型的无状态协议。
- Spring Boot Web 通过注解和 Controller 处理请求。
- 后端项目通常按 Controller、Service、Mapper/DAO 分层组织。
- Bean 声明、组件扫描和依赖注入是 Spring 应用结构的基础。

### Springboot

> 阿里云提供的脚手架，网址为：https://start.aliyun.com

### 1. HTTP 特点

- **基于 TCP 协议:** 面向连接，安全

> TCP 是一种面向连接的(建立连接之前是需要经过三次握手)、可靠的、基于字节流的传输层通信协议，在数据传输方面更安全

- **基于请求-响应模型:**   一次请求对应一次响应（先请求后响应）

> 请求和响应是一一对应关系，没有请求，就没有响应

- **HTTP 协议是无状态协议:**  对于数据没有记忆能力。每次请求-响应都是独立的

> 无状态指的是客户端发送 HTTP 请求给服务端之后，服务端根据请求响应数据，响应完后，不会记录任何信息。
>
> - 缺点:  多次请求间不能共享数据
> - 优点:  速度快
>
> - 请求之间无法共享数据会引发的问题：
> 	- 如：京东购物。加入购物车和去购物车结算是两次请求
> 	- 由于 HTTP 协议的无状态特性，加入购物车请求响应结束后，并未记录加入购物车是何商品
> 	- 发起去购物车结算的请求后，因为无法获取哪些商品加入了购物车，会导致此次请求无法正确展示数据
>
> - 具体使用的时候，我们发现京东是可以正常展示数据的，原因是 Java 早已考虑到这个问题，并提出了使用会话技术(Cookie、Session)来解决这个问题。具体如何来做，我们后面课程中会讲到。

HTTP 协议又分为：请求协议和响应协议

#### 1.1. HTTP 请求协议

##### 1.1.1. 介绍

- **请求协议**：**浏览器将数据以请求格式发送到服务器。包括：**请求行、请求头 、请求体

##### 1.1.2. GET 方式的请求协议
- **请求行** ：HTTP 请求中的第一行数据。由：`请求方式`、`资源路径`、`协议/版本`组成（之间使用空格分隔）
- **请求头** ：第二行开始，上图黄色部分内容就是请求头。格式为 key: value 形式 

	- http 是个无状态的协议，所以在请求头设置浏览器的一些自身信息和想要响应的形式。这样服务器在收到信息后，就可以知道是谁，想干什么了

	- 常见的 HTTP 请求头有:

		| 请求头          | 含义                                                         |
		| --------------- | ------------------------------------------------------------ |
		| Host            | 表示请求的主机名                                             |
		| User-Agent      | 浏览器版本。 例如：Chrome 浏览器的标识类似 Mozilla/5.0 ...Chrome/79 ，IE 浏览器的标识类似 Mozilla/5.0 (Windows NT ...)like Gecko |
		| Accept          | 表示浏览器能接收的资源类型，如 text/*，image/*或者*/*表示所有； |
		| Accept-Language | 表示浏览器偏好的语言，服务器可以据此返回不同语言的网页；     |
		| Accept-Encoding | 表示浏览器可以支持的压缩类型，例如 gzip, deflate 等。          |
		| Content-Type    | 请求主体的数据类型                                           |
		| Content-Length  | 数据主体的大小（单位：字节）                                 |

##### 1.1.3. POST 方式的请求协议
- **请求行**：包含请求方式、资源路径、协议/版本
- **请求头**  
- **请求体**：存储请求参数 
	- 请求体和请求头之间是有一个空行隔开（作用：用于标记请求头结束）

GET 请求和 POST 请求的区别：

| **区别方式** | **GET 请求**                                                  | **POST 请求**         |
| ------------ | ------------------------------------------------------------ | -------------------- |
| 请求参数     | 请求参数在请求行中。<br/>例：/brand/findAll?name=OPPO&status=1 | 请求参数在请求体中   |
| 请求参数长度 | 请求参数长度有限制(浏览器不同限制也不同)                     | 请求参数长度没有限制 |
| 安全性       | 安全性低。原因：请求参数暴露在浏览器地址栏中。               | 安全性相对高         |

#### 1.2. HTTP 响应协议

##### 1.2.1. 格式介绍

- 响应协议：服务器将数据以响应格式返回给浏览器。包括：**响应行 、响应头 、响应体**

- 响应行：响应数据的第一行。响应行由`协议及版本`、`响应状态码`、`状态码描述`组成
	- 协议/版本：HTTP/1.1
	- 响应状态码：200
	- 状态码描述：OK
- 响应头(以上图中黄色部分)：响应数据的第二行开始。格式为 key：value 形式
	- http 是个无状态的协议，所以可以在请求头和响应头中设置一些信息和想要执行的动作，这样，对方在收到信息后，就可以知道你是谁，你想干什么
	- 常见的 HTTP 响应头有:
```text
		Content-Type：表示该响应内容的类型，例如text/html，image/jpeg ；
		
		Content-Length：表示该响应内容的长度（字节数）；
		
		Content-Encoding：表示该响应压缩算法，例如gzip ；
		
		Cache-Control：指示客户端应如何缓存，例如max-age=300表示可以最多缓存300秒 ;
		
		Set-Cookie: 告诉浏览器为当前页面所在的域设置cookie ;
```


- 响应体(以上图中绿色部分)： 响应数据的最后一部分。存储响应的数据
	- 响应体和响应头之间有一个空行隔开（作用：用于标记响应头结束）

#####  响应状态码

| 状态码分类 | 说明                                                         |
| ---------- | ------------------------------------------------------------ |
| 1xx        | 响应中 --- 临时状态码。表示请求已经接受，告诉客户端应该继续请求或者如果已经完成则忽略 |
| 2xx        | 成功 --- 表示请求已经被成功接收，处理已完成                  |
| 3xx        | 重定向 --- 重定向到其它地方，让客户端再发起一个请求以完成整个处理 |
| 4xx        | 客户端错误 --- 处理发生错误，责任在客户端，如：客户端的请求一个不存在的资源，客户端未被授权，禁止访问等 |
| 5xx        | 服务器端错误 --- 处理发生错误，责任在服务端，如：服务端抛出异常，路由出错，HTTP 版本不支持等 |

关于响应状态码，我们先主要认识三个状态码，其余的等后期用到了再去掌握：

- `200 ok`   客户端请求成功
- `404 Not Found`  请求资源不存在
- `500 Internal Server Error`  服务端发生不可预期的错误

#####  设置响应数据
> 以下内容了解即可，实际开发中较少直接使用。


Web 服务器对 HTTP 协议的响应数据进行了封装(HttpServletResponse)，并在调用 Controller 方法的时候传递给了该方法。这样，就使得程序员不必直接对协议进行操作，让 Web 开发更加便捷。


代码演示：

```java
package com.itheima;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
public class ResponseController {

    @RequestMapping("/response")
    public void response(HttpServletResponse response) throws IOException {
        //1.设置响应状态码
        response.setStatus(401);
        //2.设置响应头
        response.setHeader("name","itcast");
        //3.设置响应体
        response.setContentType("text/html;charset=utf-8");
        response.setCharacterEncoding("utf-8");
        response.getWriter().write("<h1>hello response</h1>");
    }

    @RequestMapping("/response2")
    public ResponseEntity<String> response2(HttpServletResponse response) throws IOException {
        return ResponseEntity
                .status(401)
                .header("name","itcast")
                .body("<h1>hello response</h1>");
    }

}
```

###  2. SpringBootWeb 

> SpringBoot 的自动配置原理较复杂，核心是 @SpringBootApplication 注解的组合使用。

**@ResponseBody 注解：**

- 类型：方法注解、类注解
- 位置：书写在 Controller 方法上或类上
- 作用：将方法返回值直接响应给浏览器，如果返回值类型是实体对象/集合，将会转换为 JSON 格式后在响应给浏览器

但是在我们所书写的 Controller 中，只在类上添加了@RestController 注解、方法添加了@RequestMapping 注解，并没有使用@ResponseBody 注解，怎么给浏览器响应呢？

这是因为，我们在类上加了@RestController 注解，而这个注解是由两个注解组合起来的，分别是：@Controller 、@ResponseBody。 那也就意味着，我们在类上已经添加了@ResponseBody 注解了，而一旦在类上加了@ResponseBody 注解，就相当于该类所有的方法中都已经添加了@ResponseBody 注解。 

> 提示：前后端分离的项目中，一般直接在请求处理类上加@RestController 注解，就无需在方法上加@ResponseBody 注解了。

#### 2.1. 分层解耦

##### 2.1.1. 三层架构

在我们进行程序设计以及程序开发时，尽可能让每一个接口、类、方法的职责更单一些（单一职责原则）。

> 单一职责原则：一个类或一个方法，就只做一件事情，只管一块功能。
>
> 这样就可以让类、接口、方法的复杂度更低，可读性更强，扩展性更好，也更利于后期的维护。

在我们项目开发中呢，可以将代码分为三层，如图所示：

- Controller：控制层。接收前端发送的请求，对请求进行处理，并响应数据。
- Service：业务逻辑层。处理具体的业务逻辑。
- Dao：数据访问层(Data Access Object)，也称为持久层。负责数据访问操作，包括数据的增、删、改、查。

**基于三层架构的程序执行流程，如图所示：**

- 前端发起的请求，由 Controller 层接收（Controller 响应数据给前端）
- Controller 层调用 Service 层来进行逻辑处理（Service 层处理完后，把处理结果返回给 Controller 层）
- Serivce 层调用 Dao 层（逻辑处理过程中需要用到的一些数据要从 Dao 层获取）
- Dao 层操作文件中的数据（Dao 拿到的数据会返回给 Service 层）

> 更多分层解耦实践请参考官方文档。

##### 2.1.2. 分层解耦

**软件设计原则：高内聚低耦合。**

> **高内聚：**指的是一个模块中各个元素之间的联系的紧密程度，如果各个元素(语句、程序段)之间的联系程度越高，则内聚性越高，即 "高内聚"。
>
> **低耦合：**指的是软件中各个层、模块之间的依赖关联程序越低越好。

1. 解耦思路

之前我们在编写代码时，需要什么对象，就直接 new 一个就可以了。 这种做法呢，层与层之间代码就耦合了，当 service 层的实现变了之后， 我们还需要修改 controller 层的代码。
那应该怎么解耦呢？

**1). 首先不能在 EmpController 中使用 new 对象。**

**2). 将要用到的对象交给一个容器管理。**

**3). 应用程序中用到这个对象，就直接从容器中获取**

那问题来了，我们如何将对象交给容器管理呢？ 程序运行时，容器如何为程序提供依赖的对象呢？ 

我们想要实现上述解耦操作，就涉及到 Spring 中的两个核心概念：

- **控制反转：** Inversion Of Control，简称**IOC**。对象的创建控制权由程序自身转移到外部（容器），这种思想称为控制反转。
	- 对象的创建权由程序员主动创建转移到容器(由容器创建、管理对象)。这个容器称为：IOC 容器或 Spring 容器。
	
- **依赖注入：** Dependency Injection，简称**DI**。容器为应用程序提供运行时，所依赖的资源，称之为依赖注入。
	- 程序运行时需要某个资源，此时容器就为其提供这个资源。
	- 例：EmpController 程序运行时需要 EmpService 对象，Spring 容器就为其提供并注入 EmpService 对象。

- **bean 对象：**IOC 容器中创建、管理的对象，称之为：bean 对象。

### 3. IOC&DI 入门

**1). 将 Service 及 Dao 层的实现类，交给 IOC 容器管理**

在实现类加上 `@Component` 注解，就代表把当前类产生的对象交给 IOC 容器管理。

**A. UserDaoImpl**

```java
@Component
public class UserDaoImpl implements UserDao {
    @Override
    public List<String> findAll() {
        InputStream in = this.getClass().getClassLoader().getResourceAsStream("user.txt");
        ArrayList<String> lines = IoUtil.readLines(in, StandardCharsets.UTF_8, new ArrayList<>());
        return lines;
    }
}
```

**B. UserServiceImpl**

```java
@Component
public class UserServiceImpl implements UserService {

    private UserDao userDao;

    @Override
    public List<User> findAll() {
        List<String> lines = userDao.findAll();
        List<User> userList = lines.stream().map(line -> {
            String[] parts = line.split(",");
            Integer id = Integer.parseInt(parts[0]);
            String username = parts[1];
            String password = parts[2];
            String name = parts[3];
            Integer age = Integer.parseInt(parts[4]);
            LocalDateTime updateTime = LocalDateTime.parse(parts[5], DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            return new User(id, username, password, name, age, updateTime);
        }).collect(Collectors.toList());
        return userList;
    }
}
```

**2). 为 Controller 及 Service 注入运行时所依赖的对象**

**A. UserServiceImpl**

```java
@Component
public class UserServiceImpl implements UserService {

    @Autowired
    private UserDao userDao;
    
    @Override
    public List<User> findAll() {
        List<String> lines = userDao.findAll();
        List<User> userList = lines.stream().map(line -> {
            String[] parts = line.split(",");
            Integer id = Integer.parseInt(parts[0]);
            String username = parts[1];
            String password = parts[2];
            String name = parts[3];
            Integer age = Integer.parseInt(parts[4]);
            LocalDateTime updateTime = LocalDateTime.parse(parts[5], DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            return new User(id, username, password, name, age, updateTime);
        }).collect(Collectors.toList());
        return userList;
    }
}
```

**B. UserController**

```java
@RestController
public class UserController {
    
    @Autowired
    private UserService userService;

    @RequestMapping("/list")
    public List<User> list(){
        //1.调用Service
        List<User> userList = userService.findAll();
        //2.响应数据
        return userList;
    }

}
```

启动服务，运行测试。 打开浏览器，地址栏直接访问：http://localhost:8080/user.html 。 依然正常访问，就说明入门程序完成了。 已经完成了层与层之间的解耦。

### 4. IOC 详解

通过 IOC 和 DI 的入门程序呢，我们已经基本了解了 IOC 和 DI 的基础操作。接下来呢，我们学习下 IOC 控制反转和 DI 依赖注入的细节。

#### 4.1. Bean 的声明

前面我们提到 IOC 控制反转，就是将对象的控制权交给 Spring 的 IOC 容器，由 IOC 容器创建及管理对象。IOC 容器创建的对象称为 bean 对象。

在之前的入门案例中，要把某个对象交给 IOC 容器管理，需要在类上添加一个注解：**`@Component`**

而 Spring 框架为了更好的标识 web 应用程序开发当中，bean 对象到底归属于哪一层，又提供了@Component 的衍生注解：

| 注解        | 说明                 | 位置                                              |
| ----------- | -------------------- | ------------------------------------------------- |
| @Component  | 声明 bean 的基础注解   | 不属于以下三类时，用此注解                        |
| @Controller | @Component 的衍生注解 | 标注在控制层类上                                  |
| @Service    | @Component 的衍生注解 | 标注在业务层类上                                  |
| @Repository | @Component 的衍生注解 | 标注在数据访问层类上（由于与 mybatis 整合，用的少） |

那么此时，我们就可以使用 `@Service` 注解声明 Service 层的 bean。 使用 `@Repository` 注解声明 Dao 层的 bean。 代码实现如下：

Service 层:

```java
@Service
public class UserServiceImpl implements UserService {

    private UserDao userDao;

    @Override
    public List<User> findAll() {
        List<String> lines = userDao.findAll();
        List<User> userList = lines.stream().map(line -> {
            String[] parts = line.split(",");
            Integer id = Integer.parseInt(parts[0]);
            String username = parts[1];
            String password = parts[2];
            String name = parts[3];
            Integer age = Integer.parseInt(parts[4]);
            LocalDateTime updateTime = LocalDateTime.parse(parts[5], DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            return new User(id, username, password, name, age, updateTime);
        }).collect(Collectors.toList());
        return userList;
    }
}
```

Dao 层:

```java
@Repository
public class UserDaoImpl implements UserDao {
    @Override
    public List<String> findAll() {
        InputStream in = this.getClass().getClassLoader().getResourceAsStream("user.txt");
        ArrayList<String> lines = IoUtil.readLines(in, StandardCharsets.UTF_8, new ArrayList<>());
        return lines;
    }
}
```

**注意 1**：声明 bean 的时候，可以通过注解的 value 属性指定 bean 的名字，如果没有指定，默认为类名首字母小写。

**注意 2**：使用以上四个注解都可以声明 bean，但是在 springboot 集成 web 开发中，声明控制器 bean 只能用@Controller。

#### 4.2. 组件扫描

问题：使用前面学习的四个注解声明的 bean，一定会生效吗？

答案：不一定。（原因：bean 想要生效，还需要被组件扫描）

- 前面声明 bean 的四大注解，要想生效，还需要被组件扫描注解 `@ComponentScan` 扫描。
- 该注解虽然没有显式配置，但是实际上已经包含在了启动类声明注解 `@SpringBootApplication` 中，默认扫描的范围是启动类所在包及其子包。

所以，我们在项目开发中，只需要按照如上项目结构，将项目中的所有的业务类，都放在启动类所在包的子包中，就无需考虑组件扫描问题。

### 5. DI 详解

上一小节我们讲解了控制反转 IOC 的细节，接下来呢，我们学习依赖注解 DI 的细节。

依赖注入，是指 IOC 容器要为应用程序去提供运行时所依赖的资源，而资源指的就是对象。

在入门程序案例中，我们使用了@Autowired 这个注解，完成了依赖注入的操作，而这个 Autowired 翻译过来叫：自动装配。

`@Autowired`注解，默认是按照**类型**进行自动装配的（去 IOC 容器中找某个类型的对象，然后完成注入操作）

> 入门程序举例：在 EmpController 运行的时候，就要到 IOC 容器当中去查找 EmpService 这个类型的对象，而我们的 IOC 容器中刚好有一个 EmpService 这个类型的对象，所以就找到了这个类型的对象完成注入操作。

#### 5.1. @Autowired 用法

@Autowired 进行依赖注入，常见的方式，有如下三种：

1). 属性注入

```java
@RestController
public class UserController {

    //方式一: 属性注入
    @Autowired
    private UserService userService;
    
  }
```

- 优点：代码简洁、方便快速开发。
- 缺点：隐藏了类之间的依赖关系、可能会破坏类的封装性。

2). 构造函数注入

```java
@RestController
public class UserController {

    //方式二: 构造器注入
    private final UserService userService;
    
    @Autowired //如果当前类中只存在一个构造函数, @Autowired可以省略
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
 }   
```

- 优点：能清晰地看到类的依赖关系、提高了代码的安全性。
- 缺点：代码繁琐、如果构造参数过多，可能会导致构造函数臃肿。
- **注意：如果只有一个构造函数，@Autowired 注解可以省略。（通常来说，也只有一个构造函数）**

3). setter 注入

```java
/**
 * 用户信息Controller
 */
@RestController
public class UserController {
    
    //方式三: setter注入
    private UserService userService;
    
    @Autowired
    public void setUserService(UserService userService) {
        this.userService = userService;
    }
    
}    
```

- 优点：保持了类的封装性，依赖关系更清晰。
- 缺点：需要额外编写 setter 方法，增加了代码量。

在项目开发中，基于@Autowired 进行依赖注入时，基本都是第一种和第二种方式。（官方推荐第二种方式，因为会更加规范）但是在企业项目开发中，很多的项目中，也会选择第一种方式因为更加简洁、高效（在规范性方面进行了妥协）。

#### 5.2. 注意事项

那如果在 IOC 容器中，存在多个相同类型的 bean 对象，会出现什么情况呢？

在下面的例子中，我们准备了两个 UserService 的实现类，并且都交给了 IOC 容器管理。 代码如下：



此时，我们启动项目会发现，控制台报错了：



出现错误的原因呢，是因为在 Spring 的容器中，UserService 这个类型的 bean 存在两个，框架不知道具体要注入哪个 bean 使用，所以就报错了。

如何解决上述问题呢？Spring 提供了以下几种解决方案：

- @Primary
- @Qualifier
- @Resource

**方案一：使用@Primary 注解**

当存在多个相同类型的 Bean 注入时，加上@Primary 注解，来确定默认的实现。

```java
@Primary
@Service
public class UserServiceImpl implements UserService {
}
```

**方案二：使用@Qualifier 注解**

指定当前要注入的 bean 对象。 在@Qualifier 的 value 属性中，指定注入的 bean 的名称。 @Qualifier 注解不能单独使用，必须配合@Autowired 使用。

```java
@RestController
public class UserController {

    @Qualifier("userServiceImpl")
    @Autowired
    private UserService userService;
```

**方案三：使用@Resource 注解**

是按照 bean 的名称进行注入。通过 name 属性指定要注入的 bean 的名称。

```java
@RestController
public class UserController {
        
    @Resource(name = "userServiceImpl")
    private UserService userService;
```

面试题：@Autowird 与 @Resource 的区别

- @Autowired 是 spring 框架提供的注解，而@Resource 是 JDK 提供的注解
- @Autowired 默认是按照类型注入，而@Resource 是按照名称注入

## 附录：常见状态码

| 状态码 | 英文描述                        | 解释                                                         |
| ------ | ------------------------------- | ------------------------------------------------------------ |
| 200    | OK                              | 客户端请求成功，即处理成功，这是我们最想看到的状态码         |
| 302    | Found                           | 指示所请求的资源已移动到由 Location 响应头给定的 URL，浏览器会自动重新访问到这个页面 |
| 304    | Not Modified                    | 告诉客户端，你请求的资源至上次取得后，服务端并未更改，你直接用你本地缓存吧。隐式重定向 |
| 400    | Bad Request                     | 客户端请求有语法错误，不能被服务器所理解                     |
| 403    | Forbidden                       | 服务器收到请求，但是拒绝提供服务，比如：没有权限访问相关资源 |
| 404    | Not Found                       | 请求资源不存在，一般是 URL 输入有误，或者网站资源被删除了      |
| 405    | Method Not Allowed              | 请求方式有误，比如应该用 GET 请求方式的资源，用了 POST          |
| 428    | Precondition Required           | 服务器要求有条件的请求，告诉客户端要想访问该资源，必须携带特定的请求头 |
| 429    | Too Many Requests               | 指示用户在给定时间内发送了太多请求（“限速”），配合 Retry-After(多长时间后可以请求)响应头一起使用 |
| 431    | Request Header Fields Too Large | 请求头太大，服务器不愿意处理请求，因为它的头部字段太大。请求可以在减少请求头域的大小后重新提交。 |
| 500    | Internal Server Error           | 服务器发生不可预期的错误。服务器出异常了，赶紧看日志去吧     |
| 503    | Service Unavailable             | 服务器尚未准备好处理请求，服务器刚刚启动，还未初始化好       |

- 状态码大全：https://cloud.tencent.com/developer/chapter/13553

## 小结

这篇笔记覆盖了 Spring Boot Web 入门中最常见的一组基础知识：HTTP 请求响应、分层结构、依赖注入和状态码。后续可以拆成协议基础、Controller 编写和项目分层三篇来精修。
