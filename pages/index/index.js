const app = getApp()
const Utils = require('../../utils/util.js')

// pages/index/index.js.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // whether to disable join btn or not
    disableJoin: false,
    // sdk version
    version:"2.6.0"
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.channel = "";
    this.uid = Utils.getUid();
    this.lock = false;
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 只有提供了该回调才会出现转发选项
   */
  onShareAppMessage() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  join() {
    let value = this.channel || "";
    let uid = this.uid;
    if (!value) {
      wx.showToast({
        title: '请提供一个有效的房间名',
        icon: 'none',
        duration: 2000
      })
    } else {
      if (this.checkJoinLock()) {
        this.lockJoin();
        if (value === "agora") {
          // go to test page if channel name is agora
          wx.navigateTo({
            url: `../test/test`
          });
        } else if (value === "agora2") {
          // go to test page if channel name is agora
          wx.navigateTo({
            url: `../test2/test2`
          });
        } else {
          wx.showModal({
            title: '是否推流',
            content: '选择取消则作为观众加入，观众模式不推流',
            showCancel: true,
            success: function (res) {
              let role = "audience";
              if (res.confirm) {
                role = "broadcaster";
              }
              wx.navigateTo({
                url: `../meeting/meeting?channel=${value}&uid=${uid}&role=${role}`
              });
            }
          })
        }
      }
    }
  },
  /**
   * check if join is locked now, this is mainly to prevent from clicking join btn to start multiple new pages
   */
  checkJoinLock() {
    return !(this.lock || false);
  },

  lockJoin() {
    this.lock = true;
  },

  unlockJoin() {
    this.lock = false;
  },

  onInputChannel(e) {
    let value = e.detail.value;
    this.channel = value;
  }
})
