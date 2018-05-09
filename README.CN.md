## Agora Miniapp Tutorial

*Read this in other languages: [English](README.md)*

这个Demo会演示如何集成Agora小程序SDK实现一个简单的音视频通讯应用。

这个Demo演示了以下功能:

- Agora小程序基本api调用

- 加入频道

- 推流

- 订阅远端流

- 离开频道

## 项目准备

- 一个**支持live-pusher和live-player**的微信公众平台账号(只有特定行业的认证企业账号才可以使用这两个组件，详情请[参阅这里](https://developers.weixin.qq.com/miniprogram/dev/component/live-pusher.html))))

- 在微信公众平台账号的开发设置中，给与以下域名请求权限:

  - https://miniapp.agoraio.cn 

  - wss://miniapp.agoraio.cn

## 运行示例程序

首先在 [Agora.io 注册](https://dashboard.agora.io/cn/signup/) 注册账号，并创建自己的测试项目，获取到 AppID。

将 AppID  填写到 "utils/config.js" 中的常量中

```javascript
const APPID = 'abcdefg'
```

Agora小程序SDK需要另外从我们的官方网站下载获取，下载后请将SDK命名为“mini-app-sdk-production.js”后置于lib目录。

启动微信开发者工具并引入项目。

加入频道后邀请你的朋友加入同一个频道，然后就可以开始视频互通了。

**使用声网的Native SDK可以直接与小程序进行互通。**

## 有关Dynamic Key/Token

如果你打开了安全证书，你会需要额外提供一个自己的key/token服务，修改代码将你自己计算的key填入到join方法的参数中，如下:

```javascript
//... 
client.join(<Your dynamic key/access token here>, channel, uid, () => {
//...
```

## 联系我们

- 完整的 API 文档见 [文档中心](https://docs.agora.io/cn/)


- 如果在集成中遇到问题, 你可以到 [开发者社区](https://dev.agora.io/cn/) 提问

- 如果有售前咨询问题, 可以拨打 400 632 6626，或加入官方Q群 12742516 提问


- 如果需要售后技术支持, 你可以在 [Agora Dashboard](https://dashboard.agora.io) 提交工单


- 如果发现了示例代码的 bug, 欢迎提交 [issue](https://github.com/AgoraIO/Agora-Android-Tutorial-1to1/issues)

## 代码许可
MIT
