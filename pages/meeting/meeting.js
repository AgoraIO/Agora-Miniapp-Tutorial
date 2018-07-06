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
    makeup: false,
    pushWidth: 0,
    pushHeight: 0,
    totalUser: 1,
    pushing: true,
    rotationMap: {},
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
    this._cachePlayersData = null;

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

    Promise.all([this.requestPermissions(), this.requestContainerSize()]).then(values => {
      this.initAgoraChannel(uid, channel).then(url => {
        let pushUrl = Utils.mashupUrl(url, channel);

        Utils.log(`channel: ${channel}, uid: ${uid}`);
        Utils.log(`pushing ${pushUrl}`);
        let size = this.layouter.adaptPusherSize(1);
        this.setData({
          pushUrl: pushUrl,
          pushWidth: size.width,
          pushHeight: size.height,
          totalUser: 1
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

  stopPlayers: function (users) {
    Utils.log(`stop players: ${JSON.stringify(users)}`);
    let uid = this.uid;
    users && users.forEach(user => {
      if (`${user.uid}` === `${uid}`) {
        return;
      }
      Utils.log(`stop player ${user.uid}`);
      this.stopPlayer(user.uid);
    });
  },



  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // Utils.log(`restart pushing...`);
    // const context = wx.createLivePusherContext();
    // context && context.start();

    // Utils.log(`re-register listeners...`);
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
    const context = wx.createLivePusherContext();
    context && context.stop();
    this.stopPlayers(this.data.playUrls);

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

  recorderInfo: function (info) {
    // Utils.log(`live-pusher info: ${JSON.stringify(info)}`);
  },

  /**
   * 推流状态更新回调
   */
  recorderStateChange: function (e) {
    Utils.log(`live-pusher code: ${e.detail.code}`)
    if (e.detail.code === -1307) {
      //re-push
      Utils.log('live-pusher stopping, requesting new', "error");
      this.client.send({
        action: "update_url",
        role: "publish",
        uid: parseInt(this.uid)
      }, res => {
        Utils.log(`url update success: ${res.url}`);
        this.setData({
          pushUrl: res.url
        })
      }, e => {
        Utils.log(`url update failed: ${JSON.stringify(e)}`);
      });
    }
    if (e.detail.code === 1008) {
      //started
      Utils.log(`live-pusher started`);
    }
  },

  /**
   * 播放器状态更新回调
   */
  playerStateChange: function (e) {
    Utils.log(`live-player id: ${e.target.id}, code: ${e.detail.code}`)
    let uid = parseInt(e.target.id.split("-")[1]);
    if (e.detail.code === 2004) {
      Utils.log(`live-player ${uid} started playing`);
      this.updatePlayer(uid, { loading: false });
      this.refreshPlayers();
    } else if (e.detail.code === -2301) {
      Utils.log(`live-player ${uid} stopped`, "error");
    }
  },

  /**
   * 根据uid更新流属性
   */
  updatePlayer(uid, options) {
    for (let i = 0; i < this.data.playUrls.length; i++) {
      let urlObj = this.data.playUrls[i];
      if (`${urlObj.uid}` === `${uid}`) {
        urlObj = Object.assign(urlObj, options);
        this.data.playUrls[i] = urlObj;
      }
    }
  },

  /**
   * 根据playUrls的内容更新播放器
   */
  refreshPlayers: function (options) {
    let urls = this.data.playUrls;
    urls = urls.slice(0, max_user);
    Utils.log(`playing: ${JSON.stringify(urls)}`);

    urls = this.layouter.adaptPlayerSize(urls);
    let size = this.layouter.adaptPusherSize(1 + urls.length);
    let data = Object.assign({
      playUrls: urls,
      totalUser: urls.length + 1,
      pushWidth: size.width,
      pushHeight: size.height
    }, options);

    this._cachePlayersData = data;
    Utils.log(`put into debounce`);
    Utils.debounce(() => {
      Utils.log(`exec debounce`);
      this.setData(this._cachePlayersData);
    }, 200)();
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
    const context = wx.createLivePusherContext();
    context && context.switchCamera();
  },

  /**
   * 美颜回调
   */
  onMakeup: function () {
    this.setData({
      makeup: !this.data.makeup
    })
  },

  /**
   * 上传日志
   */
  uploadLogs: function () {
    let logs = Utils.getLogs();

    //test
    // logs = [];
    // for(let i = 0; i < 1000; i++) {
    //   logs = logs.concat(Utils.getLogs());
    // }

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
      AgoraMiniappSDK.LOG.setLogLevel(-1);
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
  stopPlayer:function(uid) {
    let context = wx.createLivePlayerContext(`player-${uid}`, this);
    context && context.stop({success: function() {Utils.log(`player ${uid} stopped`)}});
  },
  getOrientation:function(rotation) {
    let orientation = rotation === 90 || rotation === 270 ? "horizontal" : "vertical";
    Utils.log(`rotation: ${rotation}, orientation: ${orientation}`)
    return orientation;
  },
  /**
   * 注册stream事件
   */
  subscribeEvents: function (client) {
    client.on("video-rotation", (e) => {
      Utils.log(`video rotated: ${e.rotation} ${e.uid}`)
      let uid = e.uid;
      let rotation = e.rotation;
      let playUrls = this.data.playUrls || [];
      for(let i = 0; i < playUrls.length; i++) {
        let url = playUrls[i];
        if(`${uid}` === `${url.uid}`) {
          Utils.log(`update ${url.uid} rotation`);
          url.rotation = rotation;
          url.orientation = this.getOrientation(rotation);
          break;
        }
      }
      this.refreshPlayers();
    });
    client.on("stream-added", e => {
      let uid = e.uid;
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
            break;
          }
        }

        if(!playUrl) {
          //if not existing, push new to array
          this.data.playUrls.push({ key: uid, uid: uid, src: url, rotation: rotation, orientation: this.getOrientation(rotation), loading: true});
        }
        //important, play/push sequence decide the layout z-index
        //to put pusher bottom, we have to wait until pusher loaded
        //and then play other streams
        this.refreshPlayers();
      }, e => {
        Utils.log(`stream subscribed failed ${e} ${e.code} ${e.reason}`);
      });
    });

    client.on("stream-removed", e => {
      let uid = e.uid;
      Utils.log(`stream ${uid} removed`);
      this.stopPlayer(uid);
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
      // let pusher = wx.createLivePusherContext(this);
      // pusher && pusher.stop();
      // this.stopPlayers(this.data.playUrls);
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
        let size = this.layouter.adaptPusherSize(1);
        this.setData({
          pushUrl: url,
          pushWidth: size.width,
          pushHeight: size.height,
          totalUser: 1
        });
      }, e => {
        Utils.log(`client publish failed: ${e.code} ${e.reason}`);
      });
    })
  }
})