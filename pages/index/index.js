const app = getApp()
const Utils = require('../../utils/util.js')

// pages/index/index.js.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    hasUserInfo: false,
    disableJoin: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.channel = "";
    this.uid = Utils.getUid();
    let userInfo = wx.getStorageSync("userInfo");
    if (userInfo){
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      });
    }
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

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  onGotUserInfo: function(e){
    let userInfo = e.detail.userInfo || {};
    wx.setStorage({
      key: 'userInfo',
      data: userInfo,
    })
    this.onJoin();
  },

  
  onJoin: function () {
    let value = this.channel || "";
    let userInfo = app.globalData.userInfo || {};
    let nickName = userInfo.nickName || "";

    let uid = this.uid;
    if (!value) {
      wx.showToast({
        title: '请提供一个有效的房间名',
        icon: 'none',
        duration: 2000
      })
    } else {
      if(value === "agora") {
        // go to test page if channel name is agora
        wx.navigateTo({
          url: `../test/test`
        });
      } else {
        wx.navigateTo({
          url: `../meeting/meeting?channel=${value}&uid=${uid}&name=${nickName}`
        });
      }
    }
  },
  onInputChannel: function (e) {
    let value = e.detail.value;
    this.channel = value;
  }
})