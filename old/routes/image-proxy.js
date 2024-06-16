const Router = require("koa-router");
const imageCalendarRouter = new Router();
const axios = require("axios");
const { get, set, del } = require("../utils/cacheData");

// 接口信息
const routerInfo = {
  name: "image-proxy",
  title: "image",
  subtitle: "proxy",
};

// 缓存键名
let cacheKey;

// 调用时间
let updateTime = new Date().toISOString();

// 限制的缓存大小（字节）
const maxCacheSize = 100 * 1024 * 1024; // 默认 100MB

// 缓存队列
const cacheQueue = [];

// 获取 image 方法
const getData = async (url) => {
  try {
    const image = await axios.get(url, { responseType: "arraybuffer" });
    const contentType = image.headers['content-type'] || image.headers['Content-Type'];
    return {
      "Content-Type": contentType,
      body: image.data
    };
  } catch (error) {
    console.error('Failed to fetch image data', error);
    throw new error(error);
  }
};

// 清理缓存直到大小低于限制
const cleanCache = async () => {
  let totalSize = 0;
  while (cacheQueue.length > 0 && totalSize + cacheQueue[0].size > maxCacheSize) {
    const item = cacheQueue.shift();
    totalSize -= item.size;
    await del(item.cacheKey);
  }
};

imageCalendarRouter.get("/image-proxy", async (ctx) => {
  const { url } = ctx.query;
  if (!url) {
    ctx.status = 500;
    ctx.body = {
      code: 500,
      ...routerInfo,
      message: "获取图像发生错误，请检查 url 参数是否正确。使用示例：https://api.guole.fun/image-proxy?url=xxx",
    };
    return;
  }
  cacheKey = url;
  console.log("获取 image 数据");
  try {
    // 从缓存中获取数据
    let data = await get(cacheKey);
    const status = data ? 304 : 200;
    if (!data) {
      // 如果缓存中不存在数据
      console.log("缓存为空，获取 image 数据");
      // 从服务器拉取数据
      data = await getData(url);
      updateTime = new Date().toISOString();

      // 计算缓存大小
      const cacheSize = data.body.length;

      // 清理缓存直到大小低于限制
      while (cacheQueue.length > 0 && cacheQueue[0].size + cacheSize > maxCacheSize) {
        const item = cacheQueue.shift();
        await del(item.cacheKey);
        console.log(`清理旧缓存完成，确保不超过缓存最大阈值。maxCacheSize：${maxCacheSize}`)
      }

      // 添加到缓存队列
      cacheQueue.push({ cacheKey, size: cacheSize });
      await set(cacheKey, data);

      // 自动清理缓存
      cleanCache();
    }
    ctx.set("Content-Type", data["Content-Type"]);
    ctx.body = data.body;
    ctx.status = status;
  } catch (error) {
    console.error(error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      ...routerInfo,
      message: error.message,
    };
  }
});

// image - 获取最新数据
imageCalendarRouter.get("/image-proxy/new", async (ctx) => {
  const { url } = ctx.query;
  cacheKey = url;
  updateTime = new Date().toISOString();
  console.log("获取 image - 最新数据");
  try {
    // 从服务器拉取最新数据
    const newData = await getData(url);
    const status = newData ? 304 : 200;
    console.log("重新获取 image 数据");

    // 返回最新数据
    ctx.set("Content-Type", newData["Content-Type"]);
    ctx.body = newData.body;
    ctx.status = status;

    // 删除旧数据
    await del(cacheKey);
    // 将最新数据写入缓存
    await set(cacheKey, newData);
  } catch (error) {
    // 如果拉取最新数据失败，尝试从缓存中获取数据
    console.error(error);
    const cachedData = await get(url);
    const status = cachedData ? 304 : 200;
    if (cachedData) {
      ctx.set("Content-Type", cachedData["Content-Type"]);
      ctx.body = cachedData.body;
      ctx.status = status;
    } else {
      // 如果缓存中也没有数据，则返回错误信息
      ctx.status = 500;
      ctx.body = {
        code: 500,
        ...routerInfo,
        message: error.message,
      };
    }
  }
});

imageCalendarRouter.info = routerInfo;
module.exports = imageCalendarRouter;
