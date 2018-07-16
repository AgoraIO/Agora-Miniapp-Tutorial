const url = "https://miniapp.agoraio.cn/test";

// pages/test/test.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    playUrl: "",
    pushUrl: "",
    debug: true,
    localUid: ""
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    wx.setNavigationBarTitle({
      title: "测试页面"
    });
    wx.setKeepScreenOn({
      keepScreenOn: true
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    let pages = getCurrentPages();
    if (pages.length > 1) {
      //unlock join
      let indexPage = pages[0];
      indexPage.unlockJoin();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  switchDebug() {
    this.setData({
      debug: !this.data.debug
    })
  },

  httpRequest: function (url, body) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: url,
        data: body,
        method: "POST",
        success: res => {
          resolve(res);
        }
      })
    });
  },

  startPushing: function (e) {
    let localUid = e.detail.value;
    this.data.localUid = localUid;
    this.httpRequest(url, {
      "appId": "a247df868d144f6dbe956114b4a242d4",
      "cname": "fuckingtest",
      "uid": localUid,
      "sdkVersion": "1.1.0",
      "sid": "ssssssss",
      "seq": 1,
      "ts": 2,
      "requestId": 1,
      "clientRequest": {
        "action": "join",
        "appId": "a247df868d144f6dbe956114b4a242d4",
        "key_vocs": "a247df868d144f6dbe956114b4a242d4",
        "key_vos": "a247df868d144f6dbe956114b4a242d4",
        "channel_name": "fuckingtest",
        "uid": localUid,
        "role": "broadcaster"
      }
    }).then(res => {
      this.httpRequest(url, {
        "appId": "a247df868d144f6dbe956114b4a242d4",
        "cname": "fuckingtest",
        "uid": localUid,
        "sdkVersion": "1.1.0",
        "sid": "ssssssss",
        "seq": 2,
        "ts": 2,
        "requestId": 2,
        "clientRequest": {
          "action": "publish",
          "uid": parseInt(localUid)
        }
      }).then(res => {
        let url = res.data.serverResponse.url;
        this.setData({
          pushUrl: url
        }, () => {
          let context = wx.createLivePusherContext(this);
          context.start();
        });
      });
    });
  },

  onStopPushing: function (e) {
    let context = wx.createLivePusherContext(this);
    context.stop();
  },

  startPlaying: function (e) {
    let localUid = this.data.localUid;
    let remoteUid = e.detail.value;
    this.httpRequest(url, {
      "appId": "a247df868d144f6dbe956114b4a242d4",
      "cname": "fuckingtest",
      "uid": localUid,
      "sdkVersion": "1.1.0",
      "sid": "ssssssss",
      "seq": 11,
      "ts": 21,
      "requestId": 1234,
      "clientRequest": {
        "action": "subscribe",
        "uid": parseInt(remoteUid)
      }
    }).then(res => {
      let url = res.data.serverResponse.url;
      this.setData({
        playUrl: url
      }, () => {
        let context = wx.createLivePlayerContext("player", this);
        context.play();
      });
    });
  },

  onPause: function () {
    let context = wx.createLivePusherContext(this);
    context && context.pause();
  },

  onResume: function () {
    let context = wx.createLivePusherContext(this);
    context && context.resume();
  }
})