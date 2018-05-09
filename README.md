# Agora Miniapp Tutorial

*其他语言版本： [简体中文](README.CN.md)*

This repository will help you learn how to use Agora Miniapp SDK to implement a simple video conference Wechat miniapp.

With this sample app, you can:

- Integrate Agora Miniapp SDK
- Join a channel
- Push your local stream to the channel
- Subscribe remote streams in the same channel
- Leave a channel

## Prerequisite
- A Wechat OpenPlatform account **supporting live-pusher and live-player** (only certified corporate account in certain industry can use these two compoennts,  for details [check here](https://developers.weixin.qq.com/miniprogram/dev/component/live-pusher.html))
- In the account, grant access to following domain:
  - https://miniapp.agoraio.cn
  - wss://miniapp.agoraio.cn

## Running the App
First, create a developer account at [Agora.io](https://dashboard.agora.io/signin/), and obtain an App ID.
Update "config.js" in the project root dir with your App ID.

``` javascript
const APPID = 'abcdefg'
```

The Agora Miniapp SDK can be downloaded from our official website or requested by contacting us. Name your SDK to "mini-app-sdk-production.js" and put it under lib folder.

Start Wechat Develoer tools and import this project.

Join a channel and invite your friend to join the same one, you shall be able to see each other.

### About Token/Dynamic Key
If APP certificate is on, you will need to provide a service to calculate your dynamic key/access token and use it in following code

``` javascript
//... 
client.join(<Your dynamic key/access token here>, channel, uid, () => {
//... 
```

## Connect Us
- You can find full API document at [Document Center](https://docs.agora.io/en/)
- You can file bugs about this demo at [issue](https://github.com/AgoraIO/Agora-Android-Tutorial-1to1/issues)

## License
The MIT License (MIT).
