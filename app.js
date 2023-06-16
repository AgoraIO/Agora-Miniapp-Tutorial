const Utils = require("./utils/util.js");

//app.js
App({
  onLaunch: function () {
    // 展示本地存储能力
    Utils.checkSystemInfo(this);
    wx.authorize({
      scope: 'scope.record',
      success: function () {
        console.log("authorize success");
      },
      fail: function () {
        console.log("authorize fail");
      }
    });
  },
  globalData: {
  }
})
