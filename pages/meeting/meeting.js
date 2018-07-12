// pages/meeting/meeting.js
const app = getApp()
// const AgoraSDK = require('../../js/mini-app-sdk-production.js');
const Utils = require('../../utils/util.js')
const AgoraMiniappSDK = require("../../lib/mini-app-sdk-production.js");
const max_user = 7;
const Layouter = require("../../utils/layout.js");
const APPID = require("../../utils/config.js").APPID;
const Uploader = require("../../utils/uploader.js")
const LogUploader = Uploader.LogUploader;
const LogUploaderTask = Uploader.LogUploaderTask;
const Perf = require("../../utils/perf.js")

Page({

  /**
   * 页面的初始数据
   */
  data: {
    media: [],
    muted: false,
    beauty: 0,
    totalUser: 1,
    debug: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    Utils.log(`onLoad`);
    let manager = this;
    this.name = options.name;
    this.leaving = false;
    this.channel = options.channel;
    this.uid = Utils.getUid();
    this.ts = new Date().getTime();
    this.client = null;
    this.layouter = null;

    // setup profiler
    Perf.init();
    Perf.profile(`page onload`);
    // page setup
    wx.setNavigationBarTitle({
      title: `${this.channel}(${this.uid})`
    });
    wx.setKeepScreenOn({
      keepScreenOn: true
    });


    if (/^sdktest.*$/.test(this.channel)) {
      this.testEnv = true
      wx.showModal({
        title: '提示',
        content: '您正处于测试环境',
        showCancel: false
      })
    }
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
    Perf.profile(`page ready`);

    this.initLayouter();
    this.initAgoraChannel(uid, channel).then(url => {
      Utils.log(`channel: ${channel}, uid: ${uid}`);
      Utils.log(`pushing ${url}`);
      let ts = new Date().getTime();
      this.addMedia(0, this.uid, url, { key: ts });
    }).catch(e => {
      Utils.log(`init agora client failed: ${e}`);
      wx.showToast({
        title: `客户端初始化失败`,
        icon: 'none',
        duration: 5000
      });
    });
  },

  syncLayout(media) {
    let sizes = this.layouter.getSize(media.length);
    for (let i = 0; i < sizes.length; i++) {
      let size = sizes[i];
      let item = media[i];
      item.left = parseFloat(size.x).toFixed(2);
      item.top = parseFloat(size.y).toFixed(2);
      item.width = parseFloat(size.width).toFixed(2);
      item.height = parseFloat(size.height).toFixed(2);
    }
    return media;
  },

  hasMedia(mediaType, uid) {
    let media = this.data.media || [];
    return media.filter(item => {return item.type === mediaType && `${item.uid}` === `${uid}`}).length > 0
  },

  addMedia(mediaType, uid, url, options) {
    Utils.log(`add media ${mediaType} ${uid} ${url}`);
    let media = this.data.media || [];
    media = media.slice(0, max_user);

    if(mediaType === 0) {
      //pusher
      media.splice(0, 0, {
        key: options.key,
        type: mediaType,
        uid: `${uid}`,
        holding: false,
        url: url,
        left: 0,
        top: 0,
        width: 0,
        height: 0
      });
    } else {
      //player
      media.push({
        key: options.key,
        rotation: options.rotation,
        type: mediaType,
        uid: `${uid}`,
        url: url,
        left: 0,
        top: 0,
        width: 0,
        height: 0
      });
    }

    media = this.syncLayout(media);
    return this.refreshMedia(media);
  },

  removeMedia: function (uid) {
    Utils.log(`remove media ${uid}`);
    let media = this.data.media || [];
    media = media.filter(item => { return `${item.uid}` !== `${uid}` });

    if (media.length !== this.data.media.length) {
      media = this.syncLayout(media);
      this.refreshMedia(media);
    } else {
      return Promise.resolve();
    }
  },

  updateMedia: function (uid, options) {
    Utils.log(`update media ${uid} ${JSON.stringify(options)}`);
    let media = this.data.media || [];
    let changed = false;
    for(let i = 0; i < media.length; i++) {
      let item = media[i];
      if(`${item.uid}` === `${uid}`) {
        media[i] = Object.assign(item, options);
        changed = true;
        Utils.log(`after update media ${uid} ${JSON.stringify(item)}`)
        break;
      }
    }

    if(changed){
      return this.refreshMedia(media);
    } else {
      return Promise.resolve();
    }
  },

  refreshMedia: function(media) {
    return new Promise((resolve) => {
      Utils.log(`updating media: ${JSON.stringify(media)}`);
      this.setData({
        media: media
      }, () => {
        resolve();
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

  onError: function(e) {
    Utils.log(`error: ${JSON.stringify(e)}`);
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
  onPusherFailed: function () {
    Utils.log('live-pusher requesting new', "error");
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
      tasks.push(new LogUploaderTask(content, this.channel, part++, ts, this.uid));
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
  initLayouter: function () {
    const systemInfo = app.globalData.systemInfo;
    this.layouter = new Layouter(systemInfo.windowWidth, systemInfo.windowHeight - 64);
  },

  /**
   * 初始化sdk推流
   */
  initAgoraChannel: function (uid, channel) {
    return new Promise((resolve, reject) => {
      Perf.profile("client init");
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
        Perf.profile("client init success, start join");
        client.join(undefined, channel, uid, () => {
          Utils.log(`client join channel success`);
          Perf.profile("join success, start publish");

          //and get my stream publish url
          client.publish(url => {
            Perf.profile("publish success");
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

  getPlayerComponent: function(uid) {
    const agoraPlayer = this.selectComponent(`#rtc-player-${uid}`);
    return agoraPlayer;
  },

  getPusherComponent: function() {
    const agorapusher = this.selectComponent(`#rtc-pusher`);
    return agorapusher;
  },

  reconnect: function () {
    wx.showToast({
      title: `尝试恢复链接...`,
      icon: 'none',
      duration: 5000
    });
    this.client && this.client.destroy();
    setTimeout(() => {
      let uid = this.uid;
      let channel = this.channel;
      this.initAgoraChannel(uid, channel).then(url => {
        Utils.log(`channel: ${channel}, uid: ${uid}`);
        Utils.log(`pushing ${url}`);
        let ts = new Date().getTime();
        this.updateMedia(this.uid, { url: url, key: ts, holding: false });
      }).catch(e => {
        Utils.log(`reconnect failed: ${e}`);
        return this.reconnect();
      });
    }, 1 * 1000);
  },
  /**
   * 注册stream事件
   */
  subscribeEvents: function (client) {
    client.on("video-rotation", (e) => {
      Utils.log(`video rotated: ${e.rotation} ${e.uid}`)
      setTimeout(() => {
        const player = this.getPlayerComponent(e.uid);
        player && player.rotate(e.rotation);
      }, 1000);
    });
    client.on("stream-added", e => {
      let uid = e.uid;
      const ts = new Date().getTime();
      Utils.log(`stream ${uid} added`);
      Perf.profile(`stream ${uid} added`);
      client.subscribe(uid, (url, rotation) => {
        Utils.log(`stream ${uid} subscribed successful`);
        Perf.profile(`stream ${uid} subscribed`);
        let media = this.data.media || [];
        let matchItem = null;
        for( let i = 0; i < media.length; i++) {
          let item = this.data.media[i];
          if(`${item.uid}` === `${uid}`) {
            //if existing, update
            matchItem = item;
            break;
          }
        }

        if (!matchItem) {
          //if not existing, push new to array
          this.addMedia(1, uid, url, {key: ts, rotation: rotation})
        } else {
          this.updateMedia(matchItem.uid, {key: ts, url: url});
        }
      }, e => {
        Utils.log(`stream subscribed failed ${e} ${e.code} ${e.reason}`);
      });
    });

    client.on("stream-removed", e => {
      let uid = e.uid;
      Utils.log(`stream ${uid} removed`);
      this.removeMedia(uid);
    });

    client.on("error", err => {
      let errObj = err || {};
      let code = errObj.code || 0;
      let reason = errObj.reason || "";
      Utils.log(`error: ${code}, reason: ${reason}`);
      let ts = new Date().getTime();
      this.updateMedia(this.uid, {key: ts, holding: true});
      this.reconnect();
    });

    client.on('update-url', e => {
      Utils.log(`update-url: ${JSON.stringify(e)}`);
      let uid = e.uid;
      let url = e.url;
      let ts = new Date().getTime();
      if(`${uid}` === `${this.uid}`) {
        // if it's not pusher url, update
        Utils.log(`ignore update-url`);
      } else {
        this.updateMedia(uid, { url: url, key: ts });
      }
    });
  }
})