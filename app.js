const Utils = require("./utils/util.js");

//app.js
App({
  onLaunch: function () {
    // 展示本地存储能力
    Utils.checkSystemInfo(this);
    wx.authorize({
      scope: 'scope.record',
      success: function () {
        console.log("authorize record success");
      },
      fail: function () {
        console.log("authorize record fail");
      }
    });
    wx.authorize({
      scope: 'scope.camera',
      success: function () {
        console.log("authorize camera success");
      },
      fail: function () {
        console.log("authorize camera fail");
      }
    });
  },
  globalData: {
  }
})
