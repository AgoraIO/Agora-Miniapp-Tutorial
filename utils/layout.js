class Layouter{
  constructor(containerWidth, containerHeight){
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
  }

  adaptPusherSize(userCount) {
    let videoContainerHeight = this.containerHeight;
    let videoContainerWidth = this.containerWidth;

    switch (userCount) {
      case 1:
      case 2:
      case 3:
      case 4:
        return {
          width: videoContainerWidth,
          height: videoContainerHeight
        };
      case 5:
      case 6:
        return {
          width: videoContainerWidth * 2 / 3,
          height: videoContainerHeight * 3 / 5
        };
      case 7:
      default:
        return {
          width: videoContainerWidth / 2,
          height: videoContainerHeight / 3
        };
    }

    return height;
  }

  adaptPlayerSize(urlObjs) {
    let videoContainerHeight = this.containerHeight;
    let videoContainerWidth = this.containerWidth;
    let size = {
      width: videoContainerWidth,
      height: videoContainerHeight
    };
    let pusherSize = this.adaptPusherSize(1 + urlObjs.length);
    if (urlObjs.length > 0 && urlObjs.length <= 3) {
      urlObjs[0].width = size.width / 4;
      urlObjs[0].height = size.height / 4;
      urlObjs[0].top = size.height - urlObjs[0].height - 10;
      urlObjs[0].left = (size.width / 3 - urlObjs[0].width) / 2;

      if (urlObjs.length >= 2) {
        urlObjs[1].width = size.width / 4;
        urlObjs[1].height = size.height / 4;
        urlObjs[1].top = size.height - urlObjs[1].height - 10;
        urlObjs[1].left = size.width / 3 + urlObjs[0].left;
      }

      if (urlObjs.length === 3) {
        urlObjs[2].width = size.width / 4;
        urlObjs[2].height = size.height / 4;
        urlObjs[2].top = size.height - urlObjs[1].height - 10;
        urlObjs[2].left = size.width * 2 / 3 + urlObjs[0].left;
      }
    } else if (urlObjs.length === 4) {
      urlObjs[0].width = pusherSize.width;
      urlObjs[0].height = pusherSize.height;
      urlObjs[0].top = 0;
      urlObjs[0].left = pusherSize.width;

      urlObjs[1].width = size.width / 3;
      urlObjs[1].height = size.height - pusherSize.height;
      urlObjs[1].top = pusherSize.height;
      urlObjs[1].left = 0;

      urlObjs[2].width = size.width / 3;
      urlObjs[2].height = size.height - pusherSize.height;
      urlObjs[2].top = pusherSize.height;
      urlObjs[2].left = size.width / 3;

      urlObjs[3].width = size.width / 3;
      urlObjs[3].height = size.height - pusherSize.height;
      urlObjs[3].top = pusherSize.height;
      urlObjs[3].left = size.width * 2 / 3;
    } else if (urlObjs.length === 5) {
      urlObjs[0].width = pusherSize.width;
      urlObjs[0].height = pusherSize.height / 2;
      urlObjs[0].top = 0;
      urlObjs[0].left = pusherSize.width;

      urlObjs[1].width = pusherSize.width;
      urlObjs[1].height = pusherSize.height / 2;
      urlObjs[1].top = pusherSize.height / 2;
      urlObjs[1].left = pusherSize.width;

      urlObjs[2].width = size.width / 3;
      urlObjs[2].height = size.height - pusherSize.height;
      urlObjs[2].top = pusherSize.height;
      urlObjs[2].left = 0;

      urlObjs[3].width = size.width / 3;
      urlObjs[3].height = size.height - pusherSize.height;
      urlObjs[3].top = pusherSize.height;
      urlObjs[3].left = size.width / 3;

      urlObjs[4].width = size.width / 3;
      urlObjs[4].height = size.height - pusherSize.height;
      urlObjs[4].top = pusherSize.height;
      urlObjs[4].left = size.width * 2 / 3;
    } else if (urlObjs.length === 6) {
      urlObjs[0].width = pusherSize.width;
      urlObjs[0].height = pusherSize.height;
      urlObjs[0].top = 0;
      urlObjs[0].left = pusherSize.width;

      urlObjs[1].width = pusherSize.width;
      urlObjs[1].height = pusherSize.height;
      urlObjs[1].top = pusherSize.height;
      urlObjs[1].left = 0;

      urlObjs[2].width = pusherSize.width;
      urlObjs[2].height = pusherSize.height;
      urlObjs[2].top = pusherSize.height;
      urlObjs[2].left = pusherSize.width;

      urlObjs[3].width = size.width / 3;
      urlObjs[3].height = size.height - pusherSize.height * 2;
      urlObjs[3].top = pusherSize.height * 2;
      urlObjs[3].left = 0;

      urlObjs[4].width = size.width / 3;
      urlObjs[4].height = size.height - pusherSize.height * 2;
      urlObjs[4].top = pusherSize.height * 2;
      urlObjs[4].left = size.width / 3;

      urlObjs[5].width = size.width / 3;
      urlObjs[5].height = size.height - pusherSize.height * 2;
      urlObjs[5].top = pusherSize.height * 2;
      urlObjs[5].left = size.width * 2 / 3;
    }
    return urlObjs;
  }

}


module.exports = Layouter;