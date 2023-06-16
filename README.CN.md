# Agora Miniapp Tutorial

*Read this in other languages [English](README.md)*

## 简介

本 Demo 基于 Agora Miniapp SDK 开发，能帮助开发者在微信小程序中实现视频通话及互动直播等功能。

本页演示如下内容：

* 集成 Agora Miniapp SDK
* 加入频道
* 推流
* 订阅远端流
* 离开频道

## 准备开发环境

1. 请确保本地已安装微信开发者工具
2. 请确保有一个支持 **live-pusher** 和 **live-player** 组件的微信公众平台账号。只有特定行业的认证企业账号才可使用这两个组件。详情请[点击这里](https://developers.weixin.qq.com/miniprogram/dev/component/live-player.html)
3. 请确保在微信公众平台账号的开发设置中，给予以下域名请求权限：

 * https://miniapp.agoraio.cn
 * https://uni-webcollector.agora.io
 * wss://miniapp.agoraio.cn

4. 若使用的是1.1.2 BETA后的版本，则需要额外添加以下域名
 * https://miniapp-1.agoraio.cn
 * https://miniapp-2.agoraio.cn
 * https://miniapp-3.agoraio.cn
 * https://miniapp-4.agoraio.cn

## 运行示例程序
 
1. 在 [Agora.io](http://dashboard.agora.io/signin/) 注册账号，并创建自己的测试项目，获取 App ID。如需获取 Token 或 Channel Key，请启用 App Certificate
2. 下载本页示例程序
3. 打开 *utils* 文件夹，在 *config.js* 文件中填入获取到的 App ID：

    	const APPID = 'abcdefg'
    	
4. 下载 [Agora Miniapp SDK](https://docs.agora.io/cn/Agora%20Platform/downloads)，并将 SDK 重新命名为 agora-miniapp-sdk.js"
5. 将更名后的 "agora-miniapp-sdk.js" 文件保存在本示例程序的 *lib* 文件夹下
6. 启动微信开发者工具并导入该示例程序
7. 输入频道名，加入频道。邀请你的朋友加入同一个频道，就可以开始视频互通了。

**声网的 Native SDK 可以直接与小程序互通。**

## 关于 Token/Dynamic Key

如果启用了 App Certificate，还需要在服务端生成 Token 或 Dynamic Key 用于鉴权。将生成的 Token 或 Dynamic Key 填入如下方法中：

    	//...
    	client.join(<your key/access token here>, channel, uid, () => {
    	//...
    	
关于如何生成 Token 或 Dynamic Key 详见 [Token](https://docs.agora.io/cn/2.2/product/Video/Agora%20Basics/key_native?platform=Android) 或 [Dynamic Key](https://docs.agora.io/cn/2.2/product/Video/Agora%20Basics/key_web?platform=Web)。

## 反馈

如果你有任何问题或建议，可以通过 [issue](https://github.com/AgoraIO/Agora-Miniapp-Tutorial/issues) 的形式反馈。

## 相关资源

- 你可以先参阅 [常见问题](https://docs.agora.io/cn/faq)
- 如果你想了解更多官方示例，可以参考 [官方 SDK 示例](https://github.com/AgoraIO)
- 如果你想了解声网 SDK 在复杂场景下的应用，可以参考 [官方场景案例](https://github.com/AgoraIO-usecase)
- 如果你想了解声网的一些社区开发者维护的项目，可以查看 [社区](https://github.com/AgoraIO-Community)
- 若遇到问题需要开发者帮助，你可以到 [开发者社区](https://rtcdeveloper.com/) 提问
- 如果需要售后技术支持, 你可以在 [Agora Dashboard](https://dashboard.agora.io) 提交工单

## 代码许可

示例项目遵守 MIT 许可证。
