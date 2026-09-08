---
title: JDBC 与 MyBatis 入门笔记
link: 'jdbc-mybatis'
description: MyBatis 持久层框架基础：单元测试、日志配置、注解与 XML 映射 CRUD
date: 2025-05-12T00:00:00.000Z
updated: 2025-05-12T00:00:00.000Z
tags: [MyBatis, JDBC, Java, Spring Boot]
categories: [[笔记, Java 全栈]]
---

## 1. 介绍 MyBatis

MyBatis 是一款优秀的 **持久层** **框架**，用于简化 JDBC 的开发。

![img](./01.webp)

- 持久层：指的是就是数据访问层(dao)，是用来操作数据库的。
- 框架：是一个半成品软件，是一套可重用的、通用的、软件基础代码模型。在框架的基础上进行软件开发更加高效、规范、通用、可拓展。

在创建出来的 springboot 工程中，在引导类所在包下，在创建一个包 `mapper` 。在 `mapper` 包下创建一个接口 `UserMapper` ，这是一个持久层接口（Mybatis 的持久层接口规范一般都叫 XxxMapper）。

**单元测试**

在创建出来的 SpringBoot 工程中，在 src 下的 test 目录下，已经自动帮我们创建好了测试类 ，并且在测试类上已经添加了注解 `@SpringBootTest`，代表该测试类已经与 SpringBoot 整合。 

该测试类在运行时，会自动通过引导类加载 Spring 的环境（IOC 容器）。我们要测试那个 bean 对象，就可以直接通过`@Autowired`注解直接将其注入进行，然后就可以测试了。 

测试类代码如下：

```java
@SpringBootTest
class SpringbootMybatisQuickstartApplicationTests {

    @Autowired
    private UserMapper userMapper;

    @Test
    public void testFindAll(){
        List<User> userList = userMapper.findAll();
        for (User user : userList) {
            System.out.println(user);
        }
    }
}
```

### 1.1. 配置 Mybatis 日志输出

默认情况下，在 Mybatis 中，SQL 语句执行时，我们并看不到 SQL 语句的执行日志。 在`application.properties`加入如下配置，即可查看日志： 

```properties
#mybatis的配置
mybatis.configuration.log-impl=org.apache.ibatis.logging.stdout.StdOutImpl
```

### 1.2. 数据库连接池

数据库连接池的好处：

- 资源重用
- 提升系统响应速度
- 避免数据库连接遗漏

### 1.3. 增删改查操作

#### 1.3.1. 删除

- 需求：根据 ID 删除用户信息
- SQL：delete from user where id = 5;

```java
/**
 * 根据id删除
 */
@Delete("delete from user where id = #{id}")
public void deleteById(Integer id);
```

在 Mybatis 中，我们可以通过参数占位符号 `#{...}` 来占位，在调用`deleteById`方法时，传递的参数值，最终会替换占位符。

#### 1.3.2. 新增

- 需求：添加一个用户
- SQL：insert into user(username,password,name,age) values('zhouyu','******','周瑜',20);
- Mapper 接口：

```java
/**
 * 添加用户
 */
@Insert("insert into user(username,password,name,age) values(#{username},#{password},#{name},#{age})")
public void insert(User user);
```

如果在 SQL 语句中，我们需要传递多个参数，我们可以把多个参数封装到一个对象中。然后在 SQL 语句中，我们可以通过`#{对象属性名}`的方式，获取到对象中封装的属性值。

#### 1.3.3. 修改

- 需求：根据 ID 更新用户信息
- SQL：update user set username = 'zhouyu', password = '******', name = '周瑜', age = 20 where id = 1；
- Mapper 接口方法：

```java
/**
 * 根据id更新用户信息
 */
@Update("update user set username = #{username},password = #{password},name = #{name},age = #{age} where id = #{id}")
public void update(User user);
```

#### 1.3.4. 查询

- 需求：根据用户名和密码查询用户信息
- SQL：select * from user where username = 'zhouyu' and password = '******'
- Mapper 接口方法：

```java
/**
 * 根据用户名和密码查询用户信息
 */
@Select("select * from user where username = #{username} and password = #{password}")
public User findByUsernameAndPassword(@Param("username") String username, @Param("password") String password);
```

@param 注解的作用是为接口的方法形参起名字的。（由于用户名唯一的，所以查询返回的结果最多只有一个，可以直接封装到一个对象中）

**说明：**基于官方骨架创建的 springboot 项目中，接口编译时会保留方法形参名，@Param 注解可以省略 (#{形参名})。

**在 Mybatis 中使用 XML 映射文件方式开发，需要符合一定的规范：**

1. XML 映射文件的名称与 Mapper 接口名称一致，并且将 XML 映射文件和 Mapper 接口放置在相同包下（同包同名）
2. XML 映射文件的 namespace 属性为 Mapper 接口全限定名一致
3. XML 映射文件中 sql 语句的 id 与 Mapper 接口中的方法名一致，并保持返回类型一致。

![img](./02.webp)

#### 1.3.5. XML 配置文件实现

**第 1 步： 创建 XML 映射文件**

![img](./03.webp)

![img](./04.webp)

**第 2 步：编写 XML 映射文件**

> xml 映射文件中的 dtd 约束，直接从 mybatis 官网复制即可; 或者直接 AI 生成。

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
  PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
  "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="">
 
</mapper>
```

**第 3 步：配置**

**a. XML 映射文件的 namespace 属性为 Mapper 接口全限定名**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.itheima.mapper.UserMapper">

</mapper>
```

**b. XML 映射文件中 sql 语句的 id 与 Mapper 接口中的方法名一致，并保持返回类型一致**

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.itheima.mapper.EmpMapper">

    <!--查询操作-->
    <select id="findAll" resultType="com.itheima.pojo.User">
        select * from user
    </select>
    
</mapper>
```

resultType 属性的值，与查询返回的单条记录封装的类型一致。

运行测试类，执行结果：

![img](./05.webp)



## 2. SpringBoot 配置文件

我们可以来对比一下，采用 `application.properties` 和 `application.yml` 来配置同一段信息(数据库连接信息)，两者之间的配置对比：

![img](./06.webp)

![img](./07.webp)

### 2.1. 语法

简单的了解过 springboot 所支持的配置文件，以及不同类型配置文件之间的优缺点之后，接下来我们就来了解下 yml 配置文件的基本语法：

- 大小写敏感
- 数值前边必须有空格，作为分隔符
- 使用缩进表示层级关系，缩进时，不允许使用 Tab 键，只能用空格（idea 中会自动将 Tab 转换为空格）
- 缩进的空格数目不重要，只要相同层级的元素左侧对齐即可
- `#`表示注释，从这个字符一直到行尾，都会被解析器忽略

![img](./08.webp)

了解完 yml 格式配置文件的基本语法之后，接下来我们再来看下 yml 文件中常见的数据格式。在这里我们主要介绍最为常见的两类：

1. 定义对象或 Map 集合
2. 定义数组、list 或 set 集合

- 对象/Map 集合

```yaml
user:
  name: zhangsan
  age: 18
  password: ******
```

- 数组/List/Set 集合

```yaml
hobby: 
  - java
  - game
  - sport
```

在 yml 格式的配置文件中，如果配置项的值是以 0 开头的，值需要使用 '' 引起来，因为以 0 开头在 yml 中表示 8 进制的数据。
