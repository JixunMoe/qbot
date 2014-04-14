该项目现在已停止支援,请 转战[jjBot](https://github.com/JixunMoe/jjBot)。
----

QQBot 
------
基于[xhan](https://github.com/xhan/qqbot)的 QQBot 项目改造
官方的有些东西感觉做的不够完善, 只好自己动手「丰衣足食」

> A Hubot adapter for QQ! And also A independence robot lives on the real world.

> FYI: QQ is a instant messaging service widely used in china provided by Tencent.

> 基于 [WebQQ协议](https://github.com/xhan/qqbot/blob/master/protocol.md) 的QQ机器人。

命令行工具，由不可思议的 [NodeJS](http://nodejs.org) 以及越写越头晕的 [CoffeeScript](http://coffeescript.org/) 提供支持。  


功能 Features
-----
* 登录和验证码支持
* 插件化，目前支持消息的派发（你可以编写各种QA形式的插件，做个小黄鸡完全是可以的！欢迎提交有趣的插件）
* [没懂…] 可作为hubot adapter使用

改造功能
-----
* 插件优化了下… 不过目前只有自己写的插件规范 xD
* 插件的 msg 获取能获取进来的 Q 号 :3
* 网页后台操作 (+ 从配置授权管理员)

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

网页后台操作
-----
在 config.yaml 指定网页端口; 如 3100

然后浏览器访问 `http://{地址}:端口/` 登陆后即可操作 (登陆信息也在 config.yaml)

目前网页后台完成的功能:
* 填写验证码 (TODO: 刷新验证码)
* (批量) 接受/拒绝好友请求 (TODO: 可选批量接受哪些而不是全部 orz)

关于
----
这是一个二次开发项目 :3

原开发者: [`@xhan`](https://github.com/xhan)

二次开发: [`@Jixun.Moe`](https://github.com/JixunMoe/)

资料
----
名称 | 地址 |
---- | ---- |
WebQQ 协议 | https://github.com/xhan/qqbot/blob/master/protocol.md |
WebQQ 协议专题 | http://www.10qf.com/forum-52-1.html |
基于 WebQQ 协议的开源 Win 客户端 | https://code.google.com/p/mingqq/ |


TODO 列表
---
* ~~机器人响应前缀~~
* ~~支持讨论组~~ 没必要
* 图片发送支持
* plugin try-catch, reload on the run
* ~~ 动态重载指定插件 ~~ 搞定
* 完善网页后台功能
