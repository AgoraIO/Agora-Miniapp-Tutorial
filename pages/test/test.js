// pages/test/test.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    playUrl: "",
    pushUrl: "",
    debug: true
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

  startPushing: function(e) {
    let url = e.detail.value;
    this.setData({
      pushUrl: url
    }, () => {
      let context = wx.createLivePusherContext(this);
      context.start();
    });
  },

  onStopPushing: function(e) {
    let context = wx.createLivePusherContext(this);
    context.stop();
  },

  startPlaying: function(e) {
    let url = e.detail.value;
    this.setData({
      playUrl: url
    }, () => {
      let context = wx.createLivePlayerContext("player", this);
      context.play();
    });
  },

  onPause: function() {
    let context = wx.createLivePusherContext(this);
    context && context.pause();
  },

  onResume: function() {
    let context = wx.createLivePusherContext(this);
    context && context.resume();
  }
})