const Router = require("koa-router");
const weiboRouter = new Router();
const axios = require("axios");
const { get, set, del } = require("../utils/cacheData");

// 接口信息
const routerInfo = {
  name: "weibo",
  title: "微博",
  subtitle: "热搜榜",
};

// 缓存键名
let cacheKey;

// 调用时间
let updateTime = new Date().toISOString();

// 调用路径
const url = "https://weibo.com/ajax/side/hotSearch";

// 数据处理
const getData = (data, limit) => {
  if (!data) return [];
  
  // 过滤广告数据并处理有效数据
  const limitedData = data.reduce((result, v) => {
    if (!(v.is_ad && v.icon_desc !== '辟谣')) {
      const key = v.word_scheme ? v.word_scheme : `#${v.word}`;
      const hot = determineHotness(v);

      result.push({
        title: v.word,
        desc: key,
        hot: hot,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
        mobileUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
        num: v.num,
      });
    }
    return result;
  }, []);
  
  // 截取数组以限制返回的数据条数
  if (limit) {
    return limitedData.slice(0, limit);
  } else {
    return limitedData;
  }
};

// 确定热度属性
const determineHotness = (dataItem) => {
  if (dataItem.flag_desc === "电影") return "影";
  if (dataItem.flag_desc === "剧集") return "剧";
  if (dataItem.flag_desc === "综艺") return "综";
  if (dataItem.flag_desc === "音乐") return "音";
  if (dataItem.icon_desc === "辟谣") return "谣";
  if (dataItem.is_boom) return "爆";
  if (dataItem.is_hot) return "热";
  if (dataItem.is_fei) return "沸";
  if (dataItem.is_new) return "新";
  if (dataItem.is_warm) return "暖";
  return ""; // 没有特殊属性
};

// 微博热搜
weiboRouter.get("/weibo", async (ctx) => {
  const limit = ctx.query ? (ctx.query.limit || '') : '';
  cacheKey = `weiboData-${limit}`;
  console.log("获取微博热搜");
  try {
    // 从缓存中获取数据
    let data = await get(cacheKey);
    const from = data ? "cache" : "server";
    if (!data) {
      // 如果缓存中不存在数据
      console.log("从服务端重新获取微博热搜");
      // 从服务器拉取数据
      const response = await axios.get(url);
      data = getData(response.data.data.realtime, limit);
      updateTime = new Date().toISOString();
      if (!data) {
        ctx.body = {
          code: 500,
          ...routerInfo,
          message: "获取失败",
        };
        return false;
      }
      // 将数据写入缓存
      await set(cacheKey, data);
    }
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      total: data.length,
      updateTime,
      data,
    };
  } catch (error) {
    console.error(error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      ...routerInfo,
      message: "获取失败",
    };
  }
});

// 微博热搜 - 获取最新数据
weiboRouter.get("/weibo/new", async (ctx) => {
  const limit = ctx.query ? (ctx.query.limit || '') : '';
  cacheKey = `weiboData-${limit}`;
  console.log("获取微博热搜 - 最新数据");
  try {
    // 从服务器拉取最新数据
    const response = await axios.get(url);
    const newData = getData(response.data.data.realtime, limit);
    const from = newData ? "server" : "";
    updateTime = new Date().toISOString();
    console.log("从服务端重新获取微博热搜");

    // 返回最新数据
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      total: newData.length,
      updateTime,
      data: newData,
    };

    // 删除旧数据
    await del(cacheKey);
    // 将最新数据写入缓存
    await set(cacheKey, newData);
  } catch (error) {
    // 如果拉取最新数据失败，尝试从缓存中获取数据
    console.error(error);
    const cachedData = await get(cacheKey);
    const from = cachedData ? "cache" : "";
    if (cachedData) {
      ctx.body = {
        code: 200,
        message: "获取成功",
        ...routerInfo,
        from,
        total: cachedData.length,
        updateTime,
        data: cachedData,
      };
    } else {
      // 如果缓存中也没有数据，则返回错误信息
      ctx.status = 500;
      ctx.body = {
        code: 500,
        ...routerInfo,
        message: "获取失败",
      };
    }
  }
});

weiboRouter.info = routerInfo;
module.exports = weiboRouter;
