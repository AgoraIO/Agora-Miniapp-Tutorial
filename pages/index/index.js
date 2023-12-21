const { SDK_VERSION } = require("../../lib/agora-miniapp-sdk.js");

Page({
  data: {
    version: SDK_VERSION
  },
  onLoad() {
    this.channel = "";
    this.lock = false;
  },
  join() {
    let value = this.channel || "";
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
                url: `../meeting/meeting?channel=${value}&&role=${role}`
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
