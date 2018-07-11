// components/agora-pusher.js
const Utils = require("../../utils/util.js")

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    minBitrate: {
      type: Number,
      value: 200
    },
    maxBitrate: {
      type: Number,
      value: 500
    },
    width: {
      type: Number,
      value: 0
    },
    height: {
      type: Number,
      value: 0
    },
    x: {
      type: Number,
      value: 0
    },
    y: {
      type: Number,
      value: 0
    },
    muted: {
      type: Boolean,
      value: !1
    },
    debug: {
      type: Boolean,
      value: !1
    },
    beauty: {
      type: String,
      value: 0
    },
    aspect: {
      type: String,
      value: "3:4"
    },
    loading: {
      type: Boolean,
      value: 1
    },
    url: {
      type: String,
      value: "",
      observer: function (newVal, oldVal, changedPath) {
        // 属性被改变时执行的函数（可选），也可以写成在methods段中定义的方法名字符串, 如：'_propertyChange'
        // 通常 newVal 就是新设置的数据， oldVal 是旧数据
        if(!this.data.pusherContext) {
          Utils.log(`url updated but context not yet ready`, "error");
          return;
        }
        Utils.log(`pusher url changed from ${oldVal} to ${newVal}, path: ${changedPath}`);
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    pusherContext: null
  },

  /**
   * 组件的方法列表
   */
  methods: {
    start() {
      Utils.log(`starting pusher`);
      this.data.pusherContext.start();
    },

    stop() {
      Utils.log(`stopping pusher`);
      this.data.pusherContext.stop();
    },

    switchCamera() {
      if (!this.data.pusherContext) {
        Utils.log(`pusher context not exist`, "error");
        return;
      }
      this.data.pusherContext.switchCamera();
    },

    /**
     * 推流状态更新回调
     */
    recorderStateChange: function (e) {
      Utils.log(`live-pusher code: ${e.detail.code}`)
      if (e.detail.code === -1307) {
        //re-push
        Utils.log('live-pusher stopped', "error");
        //complete stop pusher first when failed
        this.data.pusherContext.stop({
          complete: () => {
            //empty url after
            this.setData({
              url: ""
            }, () => {
              //emit event
              this.triggerEvent('pushfailed');
            });
          }
        });
      }
      if (e.detail.code === 1008) {
        //started
        Utils.log(`live-pusher started`);
      }
    }
  },

  /**
   * 组件生命周期
   */
  ready: function () {
    Utils.log("pusher ready");
    this.data.pusherContext || (this.data.pusherContext = wx.createLivePusherContext(this));
    // if we already have url when component mounted, start directly
    if (this.data.url) {
      this.start();
    }
  },
  moved: function () {
    Utils.log("pusher moved");
   },
  detached: function () {
    Utils.log("pusher detached");
    // auto stop pusher when detached
    this.data.pusherContext && this.data.pusherContext.stop();
  }
})
