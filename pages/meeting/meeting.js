// pages/meeting/meeting.js
const app = getApp()
// const AgoraSDK = require('../../js/mini-app-sdk-production.js');
const Utils = require('../../utils/util.js')
const AgoraMiniappSDK = require("../../lib/mini-app-sdk-production.js");
const max_user = 6;
const Layouter = require("../../utils/layout.js");
const APPID = require("../../utils/config.js").APPID;
const Uploader = require("../../utils/uploader.js")
const LogUploader = Uploader.LogUploader;
const LogUploaderTask = Uploader.LogUploaderTask;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    pushUrl: "",
    playUrls: [],
    muted: false,
    beauty: 0,
    pushX: 0,
    pushY: 0,
    pushWidth: 0,
    pushHeight: 0,
    totalUser: 1,
    debug: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let manager = this;
    this.name = options.name;
    this.leaving = false;
    this.channel = options.channel;

    if (/^sdktest.*$/.test(this.channel)) {
      this.testEnv = true
      wx.showModal({
        title: '提示',
        content: '您正处于测试环境',
        showCancel: false
      })
    }
    this.uid = Utils.getUid();
    this.ts = new Date().getTime();
    this.containerSize = { width: 0, height: 0 };
    this.client = null;
    this.layouter = null;
    wx.setNavigationBarTitle({
      title: `${this.channel}(${this.uid})`
    });
    Utils.log(`onLoad`);
    wx.setKeepScreenOn({
      keepScreenOn: true
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    let channel = this.channel;
    let uid = this.uid;
    Utils.log(`onReady`);
    this.timer = setInterval(() => {
      this.uploadLogs();
    }, 60 * 60 * 1000);

    Promise.all([this.requestPermissions(), this.requestContainerSize()]).then(values => {
      this.initAgoraChannel(uid, channel).then(url => {
        let pushUrl = Utils.mashupUrl(url, channel);

        Utils.log(`channel: ${channel}, uid: ${uid}`);
        Utils.log(`pushing ${pushUrl}`);
        this.refreshPlayers({
          pushUrl: pushUrl
        }).then(() => {
          this.startPusher();
        }).catch(e => {
          Utils.log(`starting pusher failed`);
        });
      }).catch(e => {
        Utils.log(`init agora client failed: ${e}`);
        wx.showToast({
          title: `客户端初始化失败`,
          icon: 'none',
          duration: 5000
        });
      });
    }).catch(e => {
      Utils.log(`request permission/size failed: ${e}`);
      wx.showToast({
        title: `程序初始化失败`,
        icon: 'none',
        duration: 5000
      });
    });
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
    Utils.log(`onUnload`);
    clearInterval(this.timer);
    this.timer = null;

    let pages = getCurrentPages();
    if (pages.length > 1) {
      //unlock join
      let indexPage = pages[0];
      indexPage.unlockJoin();
    }

    try {
      this.client && this.client.unpublish();
    } catch (e) {
      Utils.log(`unpublish failed ${e}`);
    }
    this.client && this.client.leave();
  },

  onLeave: function () {
    if(!this.leaving){
      this.leaving = true;
      this.navigateBack();
    }
  },

  navigateBack: function(){
    Utils.log(`attemps to navigate back`);
    if (getCurrentPages().length > 1) {
      //have pages on stack
      wx.navigateBack({
      });
    } else {
      //no page on stack, usually means start from shared links
      wx.redirectTo({
        url: '../index/index',
      });
    }
  },

  /**
   * 推流状态更新回调
   */
  onPusherFailed: function (e) {
    Utils.log('live-pusher requesting new', "error");
    this.client.updatePushUrl((res) => {
      Utils.log(`url update success ${res.url}`);
      this.refreshPlayers({
        pushUrl: res.url
      }).then(() => {
        this.startPusher();
      }).catch(e => {
        Utils.log(`failed to recover from push failure ${e}`);
      });
    }, (err) => {
      Utils.log(`url update failed ${err}`);
    });
  },

  /**
   * 根据playUrls的内容更新播放器
   */
  refreshPlayers: function (options) {
    return new Promise((resolve) => {
      let urls = this.data.playUrls;
      urls = urls.slice(0, max_user);

      urls = this.layouter.adaptPlayerSize(urls);
      let size = this.layouter.adaptPusherSize(1 + urls.length);
      Utils.log(`playing: ${JSON.stringify(urls)}`);
      let data = Object.assign({
        playUrls: urls,
        totalUser: urls.length + 1,
        pushX: size.x,
        pushY: size.y,
        pushWidth: size.width,
        pushHeight: size.height
      }, options);
      this.setData(data, () => {
        resolve();
      });
    });
  },

  /**
   * 静音回调
   */
  onMute: function () {
    this.setData({
      muted: !this.data.muted
    })
  },

  /**
   * 摄像头方向切换回调
   */
  onSwitchCamera: function () {
    Utils.log(`switching camera`);
    const agoraPusher = this.selectComponent("#rtc-pusher");
    agoraPusher && agoraPusher.switchCamera();
  },

  /**
   * 美颜回调
   */
  onMakeup: function () {
    let beauty = this.data.beauty == 5 ? 0 : 5;
    this.setData({
      beauty: beauty
    })
  },

  /**
   * 上传日志
   */
  uploadLogs: function () {
    let logs = Utils.getLogs();
    Utils.clearLogs();

    let totalLogs = logs.length;
    let tasks = [];
    let part = 0;
    let ts = new Date().getTime();
    // 1w logs per task slice
    const sliceSize = 1000;
    do {
      let content = logs.splice(0, sliceSize);
      tasks.push(new LogUploaderTask(content, this.channel, part++, ts));
    } while(logs.length > sliceSize)
    wx.showLoading({
      title: '0%',
      mask: true
    })
    LogUploader.off("progress").on("progress", e => {
      let remain = e.remain;
      let total = e.total;
      Utils.log(`log upload progress ${total - remain}/${total}`);
      if(remain === 0) {
        wx.hideLoading();
        wx.showToast({
          title: `上传成功`,
        });
      } else {
        wx.showLoading({
          mask: true,
          title: `${((total - remain) / total * 100).toFixed(2)}%`,
        })
      }
    });
    LogUploader.on("error"), e => {
      wx.hideLoading();
      wx.showToast({
        title: `上传失败: ${e}`,
      });
    }
    LogUploader.scheduleTasks(tasks);
  },

  /**
   * 上传日志回调
   */
  onSubmitLog: function () {
    let page = this;
    this.setData({
      debug: !this.data.debug
    })
    wx.showModal({
      title: '遇到使用问题?',
      content: '点击确定可以上传日志，帮助我们了解您在使用过程中的问题',
      success: function (res) {
        if (res.confirm) {
          console.log('用户点击确定')
          page.uploadLogs();
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  /**
   * 获取屏幕尺寸以用于之后的视窗计算
   */
  requestContainerSize: function () {
    let page = this;
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().select('#main').boundingClientRect(function (rect) {
        page.containerSize = {
          width: rect.width,
          height: rect.height
        };
        page.layouter = new Layouter(rect.width, rect.height - 64);
        Utils.log(`container size: ${JSON.stringify(page.containerSize)}`);
        resolve();
      }).exec()
    });
  },

  /** 
   * request Wechat permission
   */
  requestPermissions: function () {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success(res) {
          if (!res.authSetting['scope.record']) {
            wx.authorize({
              scope: 'scope.record',
              success() {
                resolve();
              },
              fail(e) {
                reject(`获取摄像头失败`)
              }
            })
          } else {
            resolve();
          }
        }
      })
    });
  },

  /**
   * 初始化sdk推流
   */
  initAgoraChannel: function (uid, channel) {
    return new Promise((resolve, reject) => {
      let client = {}
      if (this.testEnv) {
        client = new AgoraMiniappSDK.Client({
          servers: ["wss://miniapp.agoraio.cn/115-239-228-77/"]
        });
      } else {
        client = new AgoraMiniappSDK.Client()
      }
      //subscribe stream events
      this.subscribeEvents(client);
      AgoraMiniappSDK.LOG.onLog = (text) => {
        Utils.log(text);
      };
      AgoraMiniappSDK.LOG.setLogLevel(0);
      this.client = client;
      client.init(APPID, () => {
        Utils.log(`client init success`);
        client.join(undefined, channel, uid, () => {
          Utils.log(`client join channel success`);

          //and get my stream publish url
          client.publish(url => {
            Utils.log(`client publish success`);
            resolve(url);
          }, e => {
            Utils.log(`client publish failed: ${e.code} ${e.reason}`);
            reject(e)
          });
        }, e => {
          Utils.log(`client join channel failed: ${e.code} ${e.reason}`);
          reject(e)
        })
      }, e => {
        Utils.log(`client init failed: ${e} ${e.code} ${e.reason}`);
        reject(e);
      });
    });
  },

  stopPusher: function() {
    const agoraPusher = this.selectComponent("#rtc-pusher");
    agoraPusher && agoraPusher.stop();
  },

  startPusher: function() {
    const agoraPusher = this.selectComponent("#rtc-pusher");
    agoraPusher && agoraPusher.start();
  },

  getPlayerComponent: function(uid) {
    const agoraPlayer = this.selectComponent(`#rtc-player-${uid}`);
    return agoraPlayer;
  },

  startPlayers: function () {
    this.data.playUrls.forEach(urlObj => {
      this.startPlayer(urlObj.uid);
    });
  },

  stopPlayers: function() {
    this.data.playUrls.forEach(urlObj => {
      this.stopPlayer(urlObj.uid);
    });
  },

  startPlayer: function(uid) {
    const player = this.getPlayerComponent(uid);
    player && player.start();
  },

  stopPlayer: function (uid) {
    const player = this.getPlayerComponent(uid);
    player && player.stop();
  },
  /**
   * 注册stream事件
   */
  subscribeEvents: function (client) {
    client.on("video-rotation", (e) => {
      Utils.log(`video rotated: ${e.rotation} ${e.uid}`)
      const player = this.getPlayerComponent(e.uid);
      player && player.rotate(e.rotation);
    });
    client.on("stream-added", e => {
      let uid = e.uid;
      const ts = new Date().getTime();
      Utils.log(`stream ${uid} added`);
      client.subscribe(uid, (url, rotation) => {
        Utils.log(`stream ${uid} subscribed successful`);
        let playUrl = null;
        for( let i = 0; i < this.data.playUrls.length; i++) {
          let item = this.data.playUrls[i];
          if(`${item.uid}` === `${uid}`) {
            //if existing, update
            playUrl = item;
            playUrl.src = url;
            playUrl.key = ts;
            this.startPlayer(uid);
            break;
          }
        }

        if(!playUrl) {
          //if not existing, push new to array
          this.data.playUrls.push({ key: ts, uid: uid, src: url, rotation: rotation});
        }
        this.refreshPlayers();
      }, e => {
        Utils.log(`stream subscribed failed ${e} ${e.code} ${e.reason}`);
      });
    });

    client.on("stream-removed", e => {
      let uid = e.uid;
      Utils.log(`stream ${uid} removed`);
      this.data.playUrls = this.data.playUrls.filter(urlObj => {
        return `${urlObj.uid}` !== `${uid}`;
      });
      this.refreshPlayers();
    });

    client.on("error", err => {
      let errObj = err || {};
      let code = errObj.code || 0;
      let reason = errObj.reason || "";
      Utils.log(`error: ${code}, reason: ${reason}`);
      if (`${code}` === `${901}`) {
        wx.showToast({
          title: `链接断开`,
          icon: 'none',
          duration: 2000
        });
      }
    });

    client.on('reconnect-start', (e) => {
      let uid = e.uid;
      Utils.log(`start-reconnect, ${uid}`);
      this.stopPusher();
      this.stopPlayers();
    })
    client.on('reconnect-end', (e) => {
      let uid = e.uid;
      Utils.log(`end-reconnect, ${uid}`);
    })
    client.on('rejoin', (e) => {
      let uid = e.uid;
      Utils.log(`rejoin, ${uid}`);
      client.publish(url => {
        Utils.log(`client publish success: ${url}`);
        this.refreshPlayers({
          pushUrl: url
        }).then(() => {
          this.startPusher();
        }).catch(e => {
          Utils.log(`rejoin url refresh failed`);
        });
      }, e => {
        Utils.log(`client publish failed: ${e.code} ${e.reason}`);
      });
    })
  }
})