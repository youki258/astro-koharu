---
title: 登录认证与 JWT 令牌笔记
link: 'jwt-auth'
description: 整理登录接口、认证流程、JWT 令牌生成解析、过滤器和拦截器。
date: 2025-06-21T00:00:00.000Z
updated: 2025-06-21T00:00:00.000Z
tags: [JWT, Spring Boot]
categories: [[笔记, Java 全栈]]
---

这篇笔记整理后端登录认证的基础流程，包括登录接口、JWT 令牌和请求过滤。正文包含 token、密码等教学示例，公开前需要确认没有真实凭据。

## 本文要点

- 登录成功后通常返回用户基础信息和认证令牌。
- JWT 可用于在请求之间携带认证状态。
- 服务端需要在过滤器或拦截器中校验请求令牌。
- 认证逻辑需要特别注意密钥、过期时间和异常响应。

**1).** **准备实体类** **`LoginInfo`** **， 封装登录成功后， 返回给前端的数据** **。**

```java
/**
 * 登录成功结果封装类
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginInfo {
    private Integer id; //员工ID
    private String username; //用户名
    private String name; //姓名
    private String token; //令牌
}
```

**2).  定义** **`LoginController`**

```java
@Slf4j
@RestController
public class LoginController {

    @Autowired
    private EmpService empService;

    @PostMapping("/login")
    public Result login(@RequestBody Emp emp){
        log.info("员工来登录啦 , {}", emp);
        LoginInfo loginInfo = empService.login(emp);
        if(loginInfo != null){
            return Result.success(loginInfo);
        }
        return Result.error("用户名或密码错误~");
    }

}
```

**3).** **`EmpService`****接口中增加 login 登录方法** 

```java
/**
 * 登录
 */
LoginInfo login(Emp emp);
```

**4).**  **`EmpServiceImpl`** **实现 login 方法**

```java
@Override
public LoginInfo login(Emp emp) {
    Emp empLogin = empMapper.getUsernameAndPassword(emp);
    if(empLogin != null){
        LoginInfo loginInfo = new LoginInfo(empLogin.getId(), empLogin.getUsername(), empLogin.getName(), null);
        return loginInfo;
    }
    return null;
}
```

**5).** **`EmpMapper`****增加接口方法**

```java
/**
 * 根据用户名和密码查询员工信息
 */
@Select("select * from emp where username = #{username} and password = #{password}")
Emp getUsernameAndPassword(Emp emp);
```

## 1. 登录校验

什么是登录校验？

所谓登录校验，指的是我们在服务器端接收到浏览器发送过来的请求之后，首先我们要对请求进行校验。先要校验一下用户登录了没有，如果用户已经登录了，就直接执行对应的业务操作就可以了；如果用户没有登录，此时就不允许他执行相关的业务操作，直接给前端响应一个错误的结果，最终跳转到登录页面，要求他登录成功之后，再来访问对应的数据。

### 1.1. 思路

了解完什么是登录校验之后，接下来我们分析一下登录校验大概的实现思路。

首先我们在宏观上先有一个认知：

前面在讲解 HTTP 协议的时候，我们提到 HTTP 协议是无状态协议。什么又是无状态的协议？

所谓无状态，指的是每一次请求都是独立的，下一次请求并不会携带上一次请求的数据。而浏览器与服务器之间进行交互，基于 HTTP 协议也就意味着现在我们通过浏览器来访问了登陆这个接口，实现了登陆的操作，接下来我们在执行其他业务操作时，服务器也并不知道这个员工到底登陆了没有。因为 HTTP 协议是无状态的，两次请求之间是独立的，所以是无法判断这个员工到底登陆了没有。

![img](./01.webp)

那应该怎么来实现登录校验的操作呢？具体的实现思路可以分为两部分：

1. 在员工登录成功后，需要将用户登录成功的信息存起来，记录用户已经登录成功的标记。
2. 在浏览器发起请求时，需要在服务端进行统一拦截，拦截后进行登录校验。

想要判断员工是否已经登录，我们需要在员工登录成功之后，存储一个登录成功的标记，接下来在每一个接口方法执行之前，先做一个条件判断，判断一下这个员工到底登录了没有。如果是登录了，就可以执行正常的业务操作，如果没有登录，会直接给前端返回一个错误的信息，前端拿到这个错误信息之后会自动的跳转到登录页面。

我们程序中所开发的查询功能、删除功能、添加功能、修改功能，都需要使用以上套路进行登录校验。此时就会出现：相同代码逻辑，每个功能都需要编写，就会造成代码非常繁琐。

为了简化这块操作，我们可以使用一种技术：统一拦截技术。

通过统一拦截的技术，我们可以来拦截浏览器发送过来的所有的请求，拦截到这个请求之后，就可以通过请求来获取之前所存入的登录标记，在获取到登录标记且标记为登录成功，就说明员工已经登录了。如果已经登录，我们就直接放行(意思就是可以访问正常的业务接口了)。

我们要完成以上操作，会涉及到 web 开发中的两个技术：

1. 会话技术：用户登录成功之后，在后续的每一次请求中，都可以获取到该标记。
2. 统一拦截技术：过滤器 Filter、拦截器 Interceptor

下面我们先学习会话技术，然后再学习统一拦截技术。

### 1.2. 会话技术

介绍了登录校验的大概思路之后，我们先来学习下会话技术。

#### 1.2.1. 介绍

什么是会话？

- 在我们日常生活当中，会话指的就是谈话、交谈。
- 在 web 开发当中，会话指的就是浏览器与服务器之间的一次连接，我们就称为一次会话。

在用户打开浏览器第一次访问服务器的时候，这个会话就建立了，直到有任何一方断开连接，此时会话就结束了。在一次会话当中，是可以包含多次请求和响应的。

比如：打开了浏览器来访问 web 服务器上的资源（浏览器不能关闭、服务器不能断开）

- 第 1 次：访问的是登录的接口，完成登录操作
- 第 2 次：访问的是部门管理接口，查询所有部门数据
- 第 3 次：访问的是员工管理接口，查询员工数据

只要浏览器和服务器都没有关闭，以上 3 次请求都属于一次会话当中完成的。

需要注意的是：会话是和浏览器关联的，当有三个浏览器客户端和服务器建立了连接时，就会有三个会话。同一个浏览器在未关闭之前请求了多次服务器，这多次请求是属于同一个会话。比如：1、2、3 这三个请求都是属于同一个会话。当我们关闭浏览器之后，这次会话就结束了。而如果我们是直接把 web 服务器关了，那么所有的会话就都结束了。

![img](./02.webp)

知道了会话的概念了，接下来我们再来了解下会话跟踪。

**会话跟踪：**一种维护浏览器状态的方法，服务器需要识别多次请求是否来自于同一浏览器，以便在同一次会话的多次请求间共享数据。

> 服务器会接收很多的请求，但是服务器是需要识别出这些请求是不是同一个浏览器发出来的。比如：1 和 2 这两个请求是不是同一个浏览器发出来的，3 和 5 这两个请求不是同一个浏览器发出来的。如果是同一个浏览器发出来的，就说明是同一个会话。如果是不同的浏览器发出来的，就说明是不同的会话。而识别多次请求是否来自于同一浏览器的过程，我们就称为会话跟踪。

我们使用会话跟踪技术就是要完成在同一个会话中，多个请求之间进行共享数据。

> 为什么要共享数据呢？
>
> 由于 HTTP 是无状态协议，在后面请求中怎么拿到前一次请求生成的数据呢？此时就需要在一次会话的多次请求之间进行数据共享

会话跟踪技术有两种：

1. Cookie（客户端会话跟踪技术）：数据存储在客户端浏览器当中
2. Session（服务端会话跟踪技术）：数据存储在储在服务端
3. 令牌技术

##### 1.2.1.1. 方案三 - 令牌技术

这里我们所提到的令牌，其实它就是一个用户身份的标识，看似很高大上，很神秘，其实本质就是一个字符串。

![img](./03.webp)

如果通过令牌技术来跟踪会话，我们就可以在浏览器发起请求。在请求登录接口的时候，如果登录成功，我就可以生成一个令牌，令牌就是用户的合法身份凭证。接下来我在响应数据的时候，我就可以直接将令牌响应给前端。

接下来我们在前端程序当中接收到令牌之后，就需要将这个令牌存储起来。这个存储可以存储在 cookie 当中，也可以存储在其他的存储空间(比如：localStorage)当中。

接下来，在后续的每一次请求当中，都需要将令牌携带到服务端。携带到服务端之后，接下来我们就需要来校验令牌的有效性。如果令牌是有效的，就说明用户已经执行了登录操作，如果令牌是无效的，就说明用户之前并未执行登录操作。

此时，如果是在同一次会话的多次请求之间，我们想共享数据，我们就可以将共享的数据存储在令牌当中就可以了。

**优缺点**

- 优点：
	- 支持 PC 端、移动端
	- 解决集群环境下的认证问题
	- 减轻服务器的存储压力（无需在服务器端存储）
- 缺点：需要自己实现（包括令牌的生成、令牌的传递、令牌的校验）

**针对于这三种方案，现在企业开发当中使用的最多的就是第三种令牌技术进行会话跟踪。而前面的这两种传统的方案，现在企业项目开发当中已经很少使用了。所以在我们的课程当中，我们也将会采用令牌技术来解决案例项目当中的会话跟踪问题。**

![img](./04.webp)

JWT 令牌最典型的应用场景就是登录认证：

1. 在浏览器发起请求来执行登录操作，此时会访问登录的接口，如果登录成功之后，我们需要生成一个 jwt 令牌，将生成的 jwt 令牌返回给前端。
2. 前端拿到 jwt 令牌之后，会将 jwt 令牌存储起来。在后续的每一次请求中都会将 jwt 令牌携带到服务端。
3. 服务端统一拦截请求之后，先来判断一下这次请求有没有把令牌带过来，如果没有带过来，直接拒绝访问，如果带过来了，还要校验一下令牌是否是有效。如果有效，就直接放行进行请求的处理。

在 JWT 登录认证的场景中我们发现，整个流程当中涉及到两步操作：

1. 在登录成功之后，要生成令牌。
2. 每一次请求当中，要接收令牌并对令牌进行校验。

稍后我们再来学习如何来生成 jwt 令牌，以及如何来校验 jwt 令牌。

### 1.3. JWT 令牌

前面我们介绍了基于令牌技术来实现会话追踪。这里所提到的令牌就是用户身份的标识，其本质就是一个字符串。令牌的形式有很多，我们使用的是功能强大的 JWT 令牌。

#### 1.3.1. 介绍（JWT）

- JWT 全称 JSON Web Token  （官网：https://jwt.io/），定义了一种简洁的、自包含的格式，用于在通信双方以 json 数据格式安全的传输信息。由于数字签名的存在，这些信息是可靠的。
	- 简洁：是指 jwt 就是一个简单的字符串。可以在请求参数或者是请求头当中直接传递。
	- 自包含：指的是 jwt 令牌，看似是一个随机的字符串，但是我们是可以根据自身的需求在 jwt 令牌中存储自定义的数据内容。如：可以直接在 jwt 令牌中存储用户的相关信息。
	- 简单来讲，jwt 就是将原始的 json 数据格式进行了安全的封装，这样就可以直接基于 jwt 在通信双方安全的进行信息传输了。

JWT 的组成： （JWT 令牌由三个部分组成，三个部分之间使用英文的点来分割）

- 第一部分：Header(头）， 记录令牌类型、签名算法等。 例如：{"alg":"HS256","type":"JWT"}
- 第二部分：Payload(有效载荷），携带一些自定义信息、默认信息等。 例如：{"id":"1","username":"Tom"}
- 第三部分：Signature(签名），防止 Token 被篡改、确保安全性。将 header、payload，并加入指定秘钥，通过指定签名算法计算而来。

> 签名的目的就是为了防 jwt 令牌被篡改，而正是因为 jwt 令牌最后一个部分数字签名的存在，所以整个 jwt 令牌是非常安全可靠的。一旦 jwt 令牌当中任何一个部分、任何一个字符被篡改了，整个令牌在校验的时候都会失败，所以它是非常安全可靠的。

![img](./05.webp)

JWT 是如何将原始的 JSON 格式数据，转变为字符串的呢？

- 其实在生成 JWT 令牌时，会对 JSON 格式的数据进行一次编码：进行 base64 编码
- Base64：是一种基于 64 个可打印的字符来表示二进制数据的编码方式。既然能编码，那也就意味着也能解码。所使用的 64 个字符分别是 A 到 Z、a 到 z、 0- 9，一个加号，一个斜杠，加起来就是 64 个字符。任何数据经过 base64 编码之后，最终就会通过这 64 个字符来表示。当然还有一个符号，那就是等号。等号它是一个补位的符号
- 需要注意的是 Base64 是编码方式，而不是加密方式。

#### 1.3.2. 生成和校验

简单介绍了 JWT 令牌以及 JWT 令牌的组成之后，接下来我们就来学习基于 Java 代码如何生成和校验 JWT 令牌。

1). 首先我们先来实现 JWT 令牌的生成。要想使用 JWT 令牌，需要先引入 JWT 的依赖：

```xml
<!-- JWT依赖-->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.9.1</version>
</dependency>
```

在引入完 JWT 来赖后，就可以调用工具包中提供的 API 来完成 JWT 令牌的生成和校验。工具类：Jwts

2). 生成 JWT 代码实现：

```java
@Test
public void testGenJwt() {
    Map<String, Object> claims = new HashMap<>();
    claims.put("id", 10);
    claims.put("username", "itheima");

    String jwt = Jwts.builder().signWith(SignatureAlgorithm.HS256, "aXRjYXN0")
        .addClaims(claims)
        .setExpiration(new Date(System.currentTimeMillis() + 12 * 3600 * 1000))
        .compact();

    System.out.println(jwt);
}
```

运行测试方法：

```java
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZXhwIjoxNjcyNzI5NzMwfQ.fHi0Ub8npbyt71UqLXDdLyipptLgxBUg_mSuGJtXtBk
```

输出的结果就是生成的 JWT 令牌,，通过英文的点分割对三个部分进行分割，我们可以将生成的令牌复制一下，然后打开 JWT 的官网，将生成的令牌直接放在 Encoded 位置，此时就会自动的将令牌解析出来。

![img](./06.webp)

第一部分解析出来，看到 JSON 格式的原始数据，所使用的签名算法为 HS256。

第二个部分是我们自定义的数据，之前我们自定义的数据就是 id，还有一个 exp 代表的是我们所设置的过期时间。

由于前两个部分是 base64 编码，所以是可以直接解码出来。但最后一个部分并不是 base64 编码，是经过签名算法计算出来的，所以最后一个部分是不会解析的。

3). 实现了 JWT 令牌的生成，下面我们接着使用 Java 代码来校验 JWT 令牌(解析生成的令牌)：

```java
@Test
public void testParseJwt() {
    Claims claims = Jwts.parser().setSigningKey("aXRjYXN0")
        .parseClaimsJws("eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MTAsInVzZXJuYW1lIjoiaXRoZWltYSIsImV4cCI6MTcwMTkwOTAxNX0.N-MD6DmoeIIY5lB5z73UFLN9u7veppx1K5_N_jS9Yko")
        .getBody();
    System.out.println(claims);
}
```

运行测试方法：

```java
{id=10, username=itheima, exp=1701909015}
```

令牌解析后，我们可以看到 id 和过期时间，如果在解析的过程当中没有报错，就说明解析成功了。

下面我们做一个测试：把令牌 header 中的数字 9 变为 8，运行测试方法后发现报错：

![img](./07.webp)

结论：**篡改令牌中的任何一个字符，在对令牌进行解析时都会报错，所以 JWT 令牌是非常安全可靠的。**

我们继续测试：修改生成令牌的时指定的过期时间，修改为 1 分钟。

```java
@Test
public void genJwt(){
    Map<String, Object> claims = new HashMap<>();
    claims.put("id", 10);
    claims.put("username", "itheima");

    String jwt = Jwts.builder().signWith(SignatureAlgorithm.HS256, "aXRjYXN0")
        .addClaims(claims)
        .setExpiration(new Date(System.currentTimeMillis() + 60 * 1000)) //有效期60s
        .compact();
    System.out.println(jwt);
    //输出结果：eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZXhwIjoxNjczMDA5NzU0fQ.RcVIR65AkGiax-ID6FjW60eLFH3tPTKdoK7UtE4A1ro
}

@Test
public void parseJwt(){
    Claims claims = Jwts.parser()
        .setSigningKey("aXRjYXN0")//指定签名密钥
        .parseClaimsJws("eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZXhwIjoxNjczMDA5NzU0fQ.RcVIR65AkGiax-ID6FjW60eLFH3tPTKdoK7UtE4A1ro")
        .getBody();

    System.out.println(claims);
}
```

等待 1 分钟之后运行测试方法发现也报错了，说明：**JWT 令牌过期后，令牌就失效了，解析的为非法令牌。**

通过以上测试，我们在使用 JWT 令牌时需要注意：

- JWT 校验时使用的签名秘钥，必须和生成 JWT 令牌时使用的秘钥是配套的。
- 如果 JWT 令牌解析校验时报错，则说明 JWT 令牌被篡改 或 失效了，令牌非法。 

#### 1.3.3. 登录时下发令牌

JWT 令牌的生成和校验的基本操作我们已经学习完了，接下来我们就需要在案例当中通过 JWT 令牌技术来跟踪会话。具体的思路我们前面已经分析过了，主要就是两步操作：

1. 生成令牌
	1. 在登录成功之后来生成一个 JWT 令牌，并且把这个令牌直接返回给前端
2. 校验令牌
	1. 拦截前端请求，从请求中获取到令牌，对令牌进行解析校验

那我们首先来完成：登录成功之后生成 JWT 令牌，并且把令牌返回给前端。

**实现步骤：**

1. 引入 JWT 工具类：在项目工程下创建 `com.itheima.util` 包，并把提供 JWT 工具类复制到该包下

```java
package com.itheima.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.util.Date;
import java.util.Map;

public class JwtUtils {

    private static String signKey = "SVRIRUlNQQ==";
    private static Long expire = 43200000L;

    /**
     * 生成JWT令牌
     * @return
     */
    public static String generateJwt(Map<String,Object> claims){
        String jwt = Jwts.builder()
                .addClaims(claims)
                .signWith(SignatureAlgorithm.HS256, signKey)
                .setExpiration(new Date(System.currentTimeMillis() + expire))
                .compact();
        return jwt;
    }

    /**
     * 解析JWT令牌
     * @param jwt JWT令牌
     * @return JWT第二部分负载 payload 中存储的内容
     */
    public static Claims parseJWT(String jwt){
        Claims claims = Jwts.parser()
                .setSigningKey(signKey)
                .parseClaimsJws(jwt)
                .getBody();
        return claims;
    }
}
```

1. 完善 `EmpServiceImpl`中的 `login` 方法逻辑， 登录成功，生成 JWT 令牌并返回

```java
@Override
public LoginInfo login(Emp emp) {
    Emp empLogin = empMapper.getUsernameAndPassword(emp);
    if(empLogin != null){
        //1. 生成JWT令牌
        Map<String,Object> dataMap = new HashMap<>();
        dataMap.put("id", empLogin.getId());
        dataMap.put("username", empLogin.getUsername());
        
        String jwt = JwtUtils.generateJwt(dataMap);
        LoginInfo loginInfo = new LoginInfo(empLogin.getId(), empLogin.getUsername(), empLogin.getName(), jwt);
        return loginInfo;
    }
    return null;
}
```

重启服务，打开 Apifox 测试登录接口：

![img](./08.webp)

打开浏览器完成前后端联调操作：利用开发者工具，抓取一下网络请求

![img](./09.webp)

登录请求完成后，可以看到 JWT 令牌已经响应给了前端，此时前端就会将 JWT 令牌存储在浏览器本地。

服务器响应的 JWT 令牌存储在本地浏览器哪里了呢？

- 在当前案例中，JWT 令牌存储在浏览器的本地存储空间 `localstorage`中了。 `localstorage` 是浏览器的本地存储，在移动端也是支持的。

![img](./10.webp)

我们在发起一个查询部门数据的请求，此时我们可以看到在请求头中包含一个 token(JWT 令牌)，后续的每一次请求当中，都会将这个令牌携带到服务端。

![img](./11.webp)

### 1.4. 过滤器 Filter

刚才通过浏览器的开发者工具，我们可以看到在后续的请求当中，都会在请求头中携带 JWT 令牌到服务端，而服务端需要统一拦截所有的请求，从而判断是否携带的有合法的 JWT 令牌。

那怎么样来统一拦截到所有的请求校验令牌的有效性呢？这里我们会学习两种解决方案：

1. Filter 过滤器
2. Interceptor 拦截器

我们首先来学习过滤器 Filter。

#### 1.4.1. Filter 快速入门

什么是 Filter？

- Filter 表示过滤器，是 JavaWeb 三大组件(Servlet、Filter、Listener)之一。
- 过滤器可以把对资源的请求拦截下来，从而实现一些特殊的功能
	- 使用了过滤器之后，要想访问 web 服务器上的资源，必须先经过滤器，过滤器处理完毕之后，才可以访问对应的资源。
- 过滤器一般完成一些通用的操作，比如：登录校验、统一编码处理、敏感字符处理等。

![img](./12.webp)

下面我们通过 Filter 快速入门程序掌握过滤器的基本使用操作：

- 第 1 步，定义过滤器 ：1.定义一个类，实现 Filter 接口，并重写其所有方法。
- 第 2 步，配置过滤器：Filter 类上加 @WebFilter 注解，配置拦截资源的路径。引导类上加 @ServletComponentScan 开启 Servlet 组件支持。

**1). 定义过滤器**

```java
public class DemoFilter implements Filter {
    //初始化方法, web服务器启动, 创建Filter实例时调用, 只调用一次
    public void init(FilterConfig filterConfig) throws ServletException {
        System.out.println("init ...");
    }

    //拦截到请求时,调用该方法,可以调用多次
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain) throws IOException, ServletException {
        System.out.println("拦截到了请求...");
    }

    //销毁方法, web服务器关闭时调用, 只调用一次
    public void destroy() {
        System.out.println("destroy ... ");
    }
}
```

- init 方法：过滤器的初始化方法。在 web 服务器启动的时候会自动的创建 Filter 过滤器对象，在创建过滤器对象的时候会自动调用 init 初始化方法，这个方法只会被调用一次。
- doFilter 方法：这个方法是在每一次拦截到请求之后都会被调用，所以这个方法是会被调用多次的，每拦截到一次请求就会调用一次 doFilter()方法。
- destroy 方法： 是销毁的方法。当我们关闭服务器的时候，它会自动的调用销毁方法 destroy，而这个销毁方法也只会被调用一次。

**2). 配置过滤器**

在定义完 Filter 之后，Filter 其实并不会生效，还需要完成 Filter 的配置，Filter 的配置非常简单，只需要在 Filter 类上添加一个注解：`@WebFilter`，并指定属性`urlPatterns`，通过这个属性指定过滤器要拦截哪些请求

```java
@WebFilter(urlPatterns = "/*") //配置过滤器要拦截的请求路径（ /* 表示拦截浏览器的所有请求 ）
public class DemoFilter implements Filter {
    //初始化方法, web服务器启动, 创建Filter实例时调用, 只调用一次
    public void init(FilterConfig filterConfig) throws ServletException {
        System.out.println("init ...");
    }

    //拦截到请求时,调用该方法,可以调用多次
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain chain) throws IOException, ServletException {
        System.out.println("拦截到了请求...");
    }

    //销毁方法, web服务器关闭时调用, 只调用一次
    public void destroy() {
        System.out.println("destroy ... ");
    }
}
```

当我们在 Filter 类上面加了@WebFilter 注解之后，接下来我们还需要在启动类上面加上一个注解`@ServletComponentScan`，通过这个`@ServletComponentScan`注解来开启 SpringBoot 项目对于 Servlet 组件的支持。

```java
@ServletComponentScan //开启对Servlet组件的支持
@SpringBootApplication
public class TliasManagementApplication {
    public static void main(String[] args) {
        SpringApplication.run(TliasManagementApplication.class, args);
    }
}
```

重新启动服务，打开浏览器，执行部门管理的请求，可以看到控制台输出了过滤器中的内容：  

![img](./13.webp)

**注意事项：**在过滤器 Filter 中，如果不执行放行操作，将无法访问后面的资源。 放行操作：`chain.doFilter(request, response);`

#### 1.4.2. 登录校验过滤器

##### 1.4.2.1. 分析

过滤器 Filter 的快速入门以及使用细节我们已经介绍完了，接下来最后一步，我们需要使用过滤器 Filter 来完成案例当中的登录校验功能。

![img](./14.webp)

我们先来回顾下前面分析过的登录校验的基本流程：

- 要进入到后台管理系统，我们必须先完成登录操作，此时就需要访问登录接口 login。
- 登录成功之后，我们会在服务端生成一个 JWT 令牌，并且把 JWT 令牌返回给前端，前端会将 JWT 令牌存储下来。
- 在后续的每一次请求当中，都会将 JWT 令牌携带到服务端，请求到达服务端之后，要想去访问对应的业务功能，此时我们必须先要校验令牌的有效性。
- 对于校验令牌的这一块操作，我们使用登录校验的过滤器，在过滤器当中来校验令牌的有效性。如果令牌是无效的，就响应一个错误的信息，也不会再去放行访问对应的资源了。如果令牌存在，并且它是有效的，此时就会放行去访问对应的 web 资源，执行相应的业务操作。

大概清楚了在 Filter 过滤器的实现步骤了，那在正式开发登录校验过滤器之前，我们思考两个问题：

1. 所有的请求，拦截到了之后，都需要校验令牌吗 ？
	1. 答案：**登录请求例外**
2. 拦截到请求后，什么情况下才可以放行，执行业务操作 ？
	1. 答案：**有令牌，且令牌校验通过(合法)；否则都返回未登录错误结果**

##### 1.4.2.2. 具体流程

我们要完成登录校验，主要是利用 Filter 过滤器实现，而 Filter 过滤器的流程步骤：

![img](./15.webp)

基于上面的业务流程，我们分析出具体的操作步骤：

1. 获取请求 url
2. 判断请求 url 中是否包含 login，如果包含，说明是登录操作，放行
3. 获取请求头中的令牌（token）
4. 判断令牌是否存在，如果不存在，响应 401
5. 解析 token，如果解析失败，响应 401
6. 放行

##### 1.4.2.3. 代码实现

在 `com.itheima.filter` 包下创建`TokenFilter`，具体代码如下：

```java
package com.itheima.filter;

import com.itheima.utils.JwtUtils;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.HttpStatus;
import org.springframework.util.StringUtils;
import java.io.IOException;

/**
 * 令牌校验过滤器
 */
@Slf4j
@WebFilter(urlPatterns = "/*")
public class TokenFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) resp;
        //1. 获取请求url。
        String url = request.getRequestURL().toString();

        //2. 判断请求url中是否包含login，如果包含，说明是登录操作，放行。
        if(url.contains("login")){ //登录请求
            log.info("登录请求 , 直接放行");
            chain.doFilter(request, response);
            return;
        }

        //3. 获取请求头中的令牌（token）。
        String jwt = request.getHeader("token");

        //4. 判断令牌是否存在，如果不存在，返回错误结果（未登录）。
        if(!StringUtils.hasLength(jwt)){ //jwt为空
            log.info("获取到jwt令牌为空, 返回错误结果");
            response.setStatus(HttpStatus.SC_UNAUTHORIZED);
            return;
        }

        //5. 解析token，如果解析失败，返回错误结果（未登录）。
        try {
            JwtUtils.parseJWT(jwt);
        } catch (Exception e) {
            e.printStackTrace();
            log.info("解析令牌失败, 返回错误结果");
            response.setStatus(HttpStatus.SC_UNAUTHORIZED);
            return;
        }

        //6. 放行。
        log.info("令牌合法, 放行");
        chain.doFilter(request , response);
    }

}
```

登录校验的过滤器我们编写完成了，接下来我们就可以重新启动服务来做一个测试：

- 测试 1：未登录是否可以访问部门管理页面

首先关闭浏览器，重新打开浏览器，在地址栏中输入：http://localhost:90

由于用户没有登录，登录校验过滤器返回错误信息，前端页面根据返回的错误信息结果，自动跳转到登录页面了  

![img](./16.webp)

- 测试 2：先进行登录操作，再访问部门管理页面

登录校验成功之后，可以正常访问相关业务操作页面

![img](./17.webp)

#### 1.4.3. Filter 详解

Filter 过滤器的快速入门程序我们已经完成了，接下来我们就要详细的介绍一下过滤器 Filter 在使用中的一些细节。主要介绍以下 3 个方面的细节：

1. 过滤器的执行流程
2. 过滤器的拦截路径配置
3. 过滤器链

##### 1.4.3.1. 执行流程

首先我们先来看下过滤器的执行流程：

![img](./18.webp)

过滤器当中我们拦截到了请求之后，如果希望继续访问后面的 web 资源，就要执行放行操作，放行就是调用 FilterChain 对象当中的 doFilter()方法，在调用 doFilter()这个方法之前所编写的代码属于放行之前的逻辑。

在放行后访问完 web 资源之后还会回到过滤器当中，回到过滤器之后如有需求还可以执行放行之后的逻辑，放行之后的逻辑我们写在 doFilter()这行代码之后。

测试代码：

```java
@WebFilter(urlPatterns = "/*") 
public class DemoFilter implements Filter {
    
    @Override //初始化方法, 只调用一次
    public void init(FilterConfig filterConfig) throws ServletException {
        System.out.println("init 初始化方法执行了");
    }
    
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        
        System.out.println("DemoFilter   放行前逻辑.....");

        //放行请求
        filterChain.doFilter(servletRequest,servletResponse);

        System.out.println("DemoFilter   放行后逻辑.....");
        
    }

    @Override //销毁方法, 只调用一次
    public void destroy() {
        System.out.println("destroy 销毁方法执行了");
    }
}
```

启动之后运行测试：

![img](./19.webp)

##### 1.4.3.2. 拦截路径

执行流程我们搞清楚之后，接下来再来介绍一下过滤器的拦截路径，Filter 可以根据需求，配置不同的拦截资源路径：

| 拦截路径     | urlPatterns 值 | 含义                               |
| ------------ | ------------- | ---------------------------------- |
| 拦截具体路径 | /login        | 只有访问 /login 路径时，才会被拦截 |
| 目录拦截     | /emps/*       | 访问/emps 下的所有资源，都会被拦截  |
| 拦截所有     | /*            | 访问所有资源，都会被拦截           |

下面我们来测试"拦截具体路径"：

```java
@WebFilter(urlPatterns = "/login")  //拦截/login具体路径
public class DemoFilter implements Filter {
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        System.out.println("DemoFilter   放行前逻辑.....");

        //放行请求
        filterChain.doFilter(servletRequest,servletResponse);

        System.out.println("DemoFilter   放行后逻辑.....");
    }


    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        Filter.super.init(filterConfig);
    }

    @Override
    public void destroy() {
        Filter.super.destroy();
    }
}
```

##### 1.4.3.3. 过滤器链

最后我们在来介绍下过滤器链，什么是过滤器链呢？所谓过滤器链指的是在一个 web 应用程序当中，可以配置多个过滤器，多个过滤器就形成了一个过滤器链。

![img](./20.webp)

比如：在我们 web 服务器当中，定义了两个过滤器，这两个过滤器就形成了一个过滤器链。

而这个链上的过滤器在执行的时候会一个一个的执行，会先执行第一个 Filter，放行之后再来执行第二个 Filter，如果执行到了最后一个过滤器放行之后，才会访问对应的 web 资源。

访问完 web 资源之后，按照我们刚才所介绍的过滤器的执行流程，还会回到过滤器当中来执行过滤器放行后的逻辑，而在执行放行后的逻辑的时候，顺序是反着的。

先要执行过滤器 2 放行之后的逻辑，再来执行过滤器 1 放行之后的逻辑，最后在给浏览器响应数据。

过滤器链上过滤器的执行顺序：注解配置的 Filter，优先级是按照过滤器类名（字符串）的自然排序。 比如：

- AbcFilter
- DemoFilter

这两个过滤器来说，AbcFilter 会先执行，DemoFilter 会后执行。

## 小结

登录认证的主线是“登录生成凭证，请求携带凭证，服务端校验凭证”。JWT 和过滤器只是实现这条主线的常见工具，公开前尤其要检查示例密钥和令牌是否只是教学占位。
