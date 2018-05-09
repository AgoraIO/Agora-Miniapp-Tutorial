let logitems = [];
let dbgRtmp = false;
let systemInfoChecked = false;
let uid = `${parseInt(Math.random() * 1000000)}`;

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  const millisecond = date.getMilliseconds();

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second, millisecond].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const requestPermission = (scope, cb) => {
  wx.getSetting({
    success(res) {
      if (res.authSetting[scope]) {
        cb && cb();
      } else {
        wx.authorize({
          scope: scope,
          success() {
            cb && cb();
          }
        })
      }
    }
  })
}


const log = (msg, level) => {
  let time = formatTime(new Date());
  logitems.push(`${time}: ${msg}`);
  if (level === "error") {
    console.error(`${time}: ${msg}`);
  } else {
    console.log(`${time}: ${msg}`);
  }
}

const getUid = () => {
  return uid;
}

const checkSystemInfo = () => {
  if (!systemInfoChecked) {
    systemInfoChecked = true;
    wx.getSystemInfo({
      success: function (res) {
        log(`${JSON.stringify(res)}`);
        let sdkVersion = res.SDKVersion;
        let version_items = sdkVersion.split(".");
        let major_version = parseInt(version_items[0]);
        let minor_version = parseInt(version_items[1]);
        if (major_version <= 1 && minor_version < 7) {
          wx.showModal({
            title: '版本过低',
            content: '微信版本过低，部分功能可能无法工作',
            success: function (res) {
              if (res.confirm) {
                console.log('用户点击确定')
              } else if (res.cancel) {
                console.log('用户点击取消')
              }
            }
          })
        }
      }
    })
  }
}

const getUserInfo = (app, cb) => {
  if (!app.globalData.userInfo) {
    // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
    // 所以此处加入 callback 以防止这种情况
    requestPermission("scope.userInfo", () => {
      wx.getUserInfo({
        success(e) {
          let userinfo = JSON.parse(e.rawData);
          app.globalData.userInfo = userinfo;
          cb(userinfo);
        }
      })
    });
  } else {
    cb(app.globalData.userInfo);
  }
}

  module.exports = {
    getUid: getUid,
    checkSystemInfo: checkSystemInfo,
    formatTime: formatTime,
    requestPermission: requestPermission,
    log: log,
    getLogs: function () { return logitems },
    getUserInfo: getUserInfo
  }
