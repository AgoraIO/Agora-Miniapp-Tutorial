// pages/meeting/meeting.js
const app = getApp()
const Utils = require('../../utils/util.js')
const AgoraMiniappSDK = require("../../lib/agora-miniapp-sdk.js");
const MAX_USER = 7;
const Layouter = require("../../utils/layout.js");
const { APPID } = require("../../utils/config.js");

// set log level
AgoraMiniappSDK.LOG.setLogLevel(0);
// agora client instance
let client = null

Page({
  data: {
    /**
     * media objects array
     * this involves both player & pusher data
     * we use type to distinguish
     * a sample media object
     * {
     *   key: **important, change this key only when you want to completely refresh your dom**,
     *   type: 0 - pusher, 1 - player,
     *   uid: uid of stream,
     *   holding: when set to true, the block will stay while native control hidden, used when needs a placeholder for media block,
     *   url: url of pusher/player
     *   left: x of pusher/player
     *   top: y of pusher/player
     *   width: width of pusher/player
     *   height: height of pusher/player
     * }
     */
    media: [],
    /**
     * muted
     */
    muted: false,
    /**
     * beauty 0 - 10
     */
    beauty: 0,
    totalUser: 1,
    /**
     * debug
     */
    debug: false,
  },
  onLoad(options) {
    console.log(`onLoad`);
    const { channel, role = "broadcaster" } = options;
    // get channel from page query param
    this.channel = channel;
    // default role to broadcaster
    this.role = role
    // get pre-gened uid, this uid will be different every time the app is started
    this.uid = Utils.getUid();
    // store layouter control
    this.layouter = null;
    // prevent user from clicking leave too fast
    this.leaving = false;
  },
  onShow() {
    console.log(`onShow`);
    let media = this.data.media || [];
    media.forEach(item => {
      if (item.type === 0) {
        //return for pusher
        return;
      }
      let player = this.getPlayerComponent(item.uid);
      if (!player) {
        console.log(`player ${item.uid} component no longer exists`, "error");
      } else {
        // while in background, the player maybe added but not starting
        // in this case we need to start it once come back
        player.start();
      }
    });
  },
  async onReady() {
    console.log(`onReady`);
    // init layouter control
    this.initLayouter();
    try {
      // init agora channel
      const url = await this.initAgoraChannel(this.uid, this.channel)
      let ts = new Date().getTime();
      if (this.isBroadcaster()) {
        // first time init, add pusher media to view
        this.addMedia(0, this.uid, url, {
          key: ts
        });
      }
    } catch (e) {
      wx.showToast({
        title: `客户端初始化失败`,
        icon: 'none',
        duration: 5000
      });
    }
    // page setup
    wx.setNavigationBarTitle({
      title: `${this.channel}(${this.uid})`
    });
    wx.setKeepScreenOn({
      keepScreenOn: true
    });
  },
  onError(e) {
    console.log(`error: ${JSON.stringify(e)}`);
  },
  async onUnload() {
    console.log(`onUnload`);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    // unlock index page join button
    let pages = getCurrentPages();
    if (pages.length > 1) {
      let indexPage = pages[0];
      indexPage.unlockJoin();
    }
    // unpublish 
    if (this.isBroadcaster()) {
      await client.unpublish();
    }
    // update log,remove this if you don't need
    await this.uploadLogs();
    // leave channel
    await client.leave();
  },

  onLeave() {
    console.log("onLeave")
    if (!this.leaving) {
      this.leaving = true;
      this.navigateBack();
    }
  },

  /** 
   * calculate size based on current media length
   * sync the layout info into each media object
   */
  syncLayout(media) {
    let sizes = this.layouter.getSize(media.length);
    for (let i = 0;i < sizes.length;i++) {
      let size = sizes[i];
      let item = media[i];
      if (item.holding) {
        //skip holding item
        continue;
      }
      item.left = parseFloat(size.x).toFixed(2);
      item.top = parseFloat(size.y).toFixed(2);
      item.width = parseFloat(size.width).toFixed(2);
      item.height = parseFloat(size.height).toFixed(2);
    }
    return media;
  },
  /**
   * check if current media list has specified uid & mediaType component
   */
  hasMedia(mediaType, uid) {
    let media = this.data.media || [];
    return media.filter(item => {
      return item.type === mediaType && `${item.uid}` === `${uid}`
    }).length > 0
  },

  /**
   * add media to view
   * type: 0 - pusher, 1 - player
   * *important* here we use ts as key, when the key changes
   * the media component will be COMPLETELY refreshed
   * this is useful when your live-player or live-pusher
   * are in a bad status - say -1307. In this case, update the key
   * property of media object to fully refresh it. The old media
   * component life cycle event detached will be called, and
   * new media component life cycle event ready will then be called
   */
  addMedia(mediaType, uid, url, options) {
    console.log(`add media ${mediaType} ${uid} ${url}`);
    let media = this.data.media || [];

    if (mediaType === 0) {
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
        holding: false,
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

  /**
   * remove media from view
   */
  removeMedia(uid) {
    console.log(`remove media ${uid}`);
    let media = this.data.media || [];
    media = media.filter(item => {
      return `${item.uid}` !== `${uid}`
    });

    if (media.length !== this.data.media.length) {
      media = this.syncLayout(media);
      this.refreshMedia(media);
    } else {
      console.log(`media not changed: ${JSON.stringify(media)}`)
      return Promise.resolve();
    }
  },

  /**
   * update media object
   * the media component will be fully refreshed if you try to update key
   * property.
   */
  updateMedia(uid, options) {
    console.log(`update media ${uid} ${JSON.stringify(options)}`);
    let media = this.data.media || [];
    let changed = false;
    for (let i = 0;i < media.length;i++) {
      let item = media[i];
      if (`${item.uid}` === `${uid}`) {
        media[i] = Object.assign(item, options);
        changed = true;
        console.log(`after update media ${uid} ${JSON.stringify(item)}`)
        break;
      }
    }

    if (changed) {
      return this.refreshMedia(media);
    } else {
      console.log(`media not changed: ${JSON.stringify(media)}`)
      return Promise.resolve();
    }
  },

  /**
   * call setData to update a list of media to this.data.media
   * this will trigger UI re-rendering
   */
  refreshMedia(media) {
    return new Promise((resolve) => {
      for (let i = 0;i < media.length;i++) {
        if (i < MAX_USER) {
          //show
          media[i].holding = false;
        } else {
          //hide 
          media[i].holding = true;
        }
      }

      if (media.length > MAX_USER) {
        wx.showToast({
          title: '由于房内人数超过7人，部分视频未被加载显示',
        });
      }
      console.log(`updating media: ${JSON.stringify(media)}`);
      this.setData({
        media: media
      }, () => {
        resolve();
      });
    });
  },

  /**
   * navigate to previous page
   * if started from shared link, it's possible that
   * we have no page to go back, in this case just redirect
   * to index page
   */
  navigateBack() {
    console.log(`attemps to navigate back`);
    if (getCurrentPages().length > 1) {
      //have pages on stack
      wx.navigateBack({});
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
  onPusherFailed() {
    console.log('pusher failed completely', "error");
    wx.showModal({
      title: '发生错误',
      content: '推流发生错误，请重新进入房间重试',
      showCancel: false,
      success: () => {
        this.navigateBack();
      }
    })
  },

  /**
   * 静音回调
   */
  async onMute() {
    if (!this.data.muted) {
      await client.muteLocal('audio')
    } else {
      await client.unmuteLocal('audio')
    }
    this.setData({
      muted: !this.data.muted
    })
  },

  /**
   * 摄像头方向切换回调
   */
  onSwitchCamera() {
    console.log(`switching camera`);
    // get pusher component via id
    const agoraPusher = this.getPusherComponent();
    agoraPusher && agoraPusher.switchCamera();
  },

  /**
   * 美颜回调
   */
  onMakeup() {
    let beauty = this.data.beauty == 5 ? 0 : 5;
    this.setData({
      beauty: beauty
    })
  },

  /**
   * 上传日志
   */
  async uploadLogs() {
    try {
      await AgoraMiniappSDK.LOG.uploadLogs()
    } catch (err) {
      console.error(err)
      wx.showToast({
        title: `上传失败`,
      });
    }
  },

  /**
   * 上传日志回调
   */
  onMore() {
    let _this = this;
    let mediaAction = this.isBroadcaster() ? "下麦" : "上麦"
    wx.showActionSheet({
      itemList: [mediaAction, "上传日志"],
      success: async res => {
        let tapIndex = res.tapIndex;
        if (tapIndex == 0) {
          if (this.isBroadcaster()) {
            await this.becomeAudience()
            this.removeMedia(this.uid)
          } else {
            let ts = new Date().getTime();
            const url = await this.becomeBroadcaster()
            this.addMedia(0, this.uid, url, {
              key: ts
            });
          }
        } else if (tapIndex === 1) {
          this.setData({
            debug: !this.data.debug
          })
          wx.showModal({
            title: '遇到使用问题?',
            content: '点击确定可以上传日志，帮助我们了解您在使用过程中的问题',
            success: function (res) {
              if (res.confirm) {
                _this.uploadLogs();
              }
            }
          })
        }
      }
    })
  },

  /**
   * 获取屏幕尺寸以用于之后的视窗计算
   */
  initLayouter() {
    // get window size info from systemInfo
    const systemInfo = app.globalData.systemInfo;
    // 64 is the height of bottom toolbar
    this.layouter = new Layouter(systemInfo.windowWidth, systemInfo.windowHeight - 64);
  },

  /**
   * 初始化sdk推流
   */
  async initAgoraChannel(uid, channel) {
    client = new AgoraMiniappSDK.Client()
    //subscribe stream events
    this.subscribeEvents();
    await client.init(APPID)
    await client.setRole(this.role)
    // input your token here if exists
    let token = undefined
    await client.join(token, channel, uid)
    let url = ''
    if (this.isBroadcaster()) {
      url = await client.publish();
    }
    return url
  },

  async reInitAgoraChannel(uid, channel) {
    client = new AgoraMiniappSDK.Client()
    //subscribe stream events
    this.subscribeEvents();
    let uids = this.data.media.map(item => {
      return item.uid;
    });
    await client.init(APPID)
    await client.setRole(this.role);
    // input your token here if exists
    let token = undefined
    await client.rejoin(token, channel, uid, uids)
    let url = ''
    if (this.isBroadcaster()) {
      url = await client.publish()
    }
    return url
  },

  /**
   * return player component via uid
   */
  getPlayerComponent(uid) {
    const agoraPlayer = this.selectComponent(`#rtc-player-${uid}`);
    return agoraPlayer;
  },

  /**
   * return pusher component
   */
  getPusherComponent() {
    const agorapusher = this.selectComponent(`#rtc-pusher`);
    return agorapusher;
  },

  async becomeBroadcaster() {
    this.role = "broadcaster"
    await client.setRole(this.role)
    const url = await client.publish()
    return url
  },

  async becomeAudience() {
    await client.unpublish()
    this.role = "audience"
    await client.setRole(this.role)
  },

  /**
   * reconnect when bad things happens...
   */
  async reconnect() {
    wx.showToast({
      title: `尝试恢复链接...`,
      icon: 'none',
      duration: 5000
    });
    // always destroy client first
    // *important* miniapp supports 5 websockets maximum at same time
    // do remember to destroy old client first before creating new ones
    await client.destroy();
    client = null

    this.reconnectTimer = setTimeout(async () => {
      let uid = this.uid;
      let channel = this.channel;
      try {
        const url = await this.reInitAgoraChannel(uid, channel)
        let ts = new Date().getTime();
        if (this.isBroadcaster()) {
          if (this.hasMedia(0, this.uid)) {
            // pusher already exists in media list
            this.updateMedia(this.uid, {
              url: url,
              key: ts,
            });
          } else {
            // pusher not exists in media list
            console.log(`pusher not yet exists when rejoin...adding`);
            this.addMedia(0, this.uid, url, {
              key: ts
            });
          }
        }
      } catch (e) {
        console.log(`reconnect failed: ${e}`);
        // remember control max reconnect times
        return this.reconnect();
      }
    }, 1 * 1000);
  },

  isBroadcaster() {
    return this.role === "broadcaster";
  },

  onPusherNetstatus: function (e) {
    client.updatePusherNetStatus(e.detail);
  },

  onPusherStatechange: function (e) {
    client.updatePusherStateChange(e.detail);
  },

  onPlayerNetstatus: function (e) {
    // 遍历所有远端流进行数据上报
    let allPlayerStream = this.data.media.filter(m => m.uid !== this.uid);
    allPlayerStream.forEach(item => {
      client.updatePlayerNetStatus(item.uid, e.detail);
    });
  },

  onPlayerStatechange: function (e) {
    let allPlayerStream = this.data.media.filter(m => m.uid !== this.uid);
    // 这里 需要去获取所有远端流的 uid
    allPlayerStream.forEach(item => {
      client.updatePlayerStateChange(item.uid, e.detail);
    });
  },

  /**
   * 注册stream事件
   */
  subscribeEvents() {
    /**
     * sometimes the video could be rotated
     * this event will be fired with ratotion
     * angle so that we can rotate the video
     * NOTE video only supportes vertical or horizontal
     * in case of 270 degrees, the video could be
     * up side down
     */
    client.on("video-rotation", (e) => {
      console.log(`video rotated: ${e.rotation} ${e.uid}`)
      setTimeout(() => {
        const player = this.getPlayerComponent(e.uid);
        player && player.rotate(e.rotation);
      }, 1000);
    });
    /**
     * fired when new stream join the channel
     */
    client.on("stream-added", async e => {
      let uid = e.uid;
      const ts = new Date().getTime();
      console.log(`stream ${uid} added`);
      /**
       * subscribe to get corresponding url
       */
      const { url, rotation } = await client.subscribe(uid);
      let media = this.data.media || [];
      let matchItem = null;
      for (let i = 0;i < media.length;i++) {
        let item = this.data.media[i];
        if (`${item.uid}` === `${uid}`) {
          //if existing, record this as matchItem and break
          matchItem = item;
          break;
        }
      }
      if (!matchItem) {
        //if not existing, add new media
        this.addMedia(1, uid, url, {
          key: ts,
          rotation: rotation
        })
      } else {
        // if existing, update property
        // change key property to refresh live-player
        this.updateMedia(matchItem.uid, {
          url: url,
          key: ts,
        });
      }
    });

    /**
     * remove stream when it leaves the channel
     */
    client.on("stream-removed", e => {
      let uid = e.uid;
      console.log(`stream ${uid} removed`);
      this.removeMedia(uid);
    });

    /**
     * when bad thing happens - we recommend you to do a 
     * full reconnect when meeting such error
     * it's also recommended to wait for few seconds before
     * reconnect attempt
     */
    client.on("error", err => {
      let code = err.code || 0;
      let reason = err.reason || "";
      console.log(`error: ${code}, reason: ${reason}`);
      if (code === 501 || code === 904) {
        this.reconnect();
      }
    });

    /**
     * there are cases when server require you to update
     * player url, when receiving such event, update url into
     * corresponding live-player, REMEMBER to update key property
     * so that live-player is properly refreshed
     * NOTE you can ignore such event if it's for pusher or happens before
     * stream-added
     */
    client.on('update-url', e => {
      console.log(`update-url: ${JSON.stringify(e)}`);
      let uid = e.uid;
      let url = e.url;
      let ts = new Date().getTime();
      if (`${uid}` === `${this.uid}`) {
        // if it's not pusher url, update
        console.log(`ignore update-url`);
      } else {
        this.updateMedia(uid, {
          url: url,
          key: ts,
        });
      }
    });

    client.on("token-privilege-will-expire", () => {
      console.log("当前 token 即将过期，请更新 token");
    });

    client.on("token-privilege-did-expire", () => {
      console.log("当前 token 已过期，请更新 token 并重新加入频道");
    });
  }
})
