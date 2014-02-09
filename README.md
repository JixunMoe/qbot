QQBot 
------
基于[xhan](https://github.com/xhan/qqbot)的 QQBot 项目改造
官方的有些东西感觉做的不够完善, 只好自己动手「丰衣足食」

> A Hubot adapter for QQ! And also A independence robot lives on the real world.
> FYI: QQ is a instant messaging service widely used in china provided by Tencent.
> 基于 [WebQQ协议](https://github.com/xhan/qqbot/blob/master/protocol.md) 的QQ机器人。
> 命令行工具，由不可思议的 [CoffeeScript](http://coffeescript.org/) 提供支持。  


功能 Features
-----
* 登录和验证码支持
* 插件化，目前支持消息的派发（你可以编写各种QA形式的插件，做个小黄鸡完全是可以的！欢迎提交有趣的插件）
* [没懂…] 可作为hubot adapter使用
* [还没动] 提供HTTP API支持（比如群通知什么的都能做哦）

改造功能
-----
* 插件优化了下… 不过目前只有自己写的插件规范 xD
* 插件的 msg 获取能获取进来的 Q 号 :3

关于 Hubot Adapter
------
因为我还没搞懂 Hubot 是啥… 所以可能有各种不兼容问题 orz


独立作为机器人运行
-----
* 安装 `CoffeeScript` (CoffeeScript 依赖 [NodeJs](http://nodejs.org))
    * Linux:   `sudo npm install -g coffee-script`
    * Windows: `npm install -g coffee-script`
* 执行 `npm install` 更新所需的依赖项
* 等待更新的时候, 配置 `config.yaml` 设定
* 执行 `coffee main.coffee` 启动机器人~!

部署
-----
部署环境中一般没法操作`STDIN`和机器人交互，所以现在提供了 `Http Api` 提供验证码输入:    
>  GET http://localhost:port/stdin?token=(token)&value=(value)  
我常用的命令 `./main.coffee nologin &>> tmp/dev.log &`


关于
----
这是一个二次开发项目 :3

原开发者: [`@xhan`](https://github.com/xhan)

二次开发: [`@Jixun.Moe`](https://github.com/JixunMoe/)

资料
----
* WebQQ协议     https://github.com/xhan/qqbot/blob/master/protocol.md
* WebQQ协议专题  http://www.10qf.com/forum-52-1.html
* 开源的webqq协议的win客户端 https://code.google.com/p/mingqq/


TODO
---
* ~~机器人响应前缀~~
* ~~支持讨论组~~ 没必要
* 图片发送支持
* plugin try-catch, reload on the run
* 动态重载指定插件