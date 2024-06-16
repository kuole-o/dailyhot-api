const Router = require("koa-router");
const BBtalkRouter = new Router();
const axios = require("axios");
const { get, set, del } = require("../utils/cacheData");

// 接口信息
const routerInfo = {
  name: "BBtalk",
  title: "哔哔",
  subtitle: "闪念",
};

// 缓存键名
let cacheKey;

// 调用时间
let updateTime = new Date().toISOString();

// 获取 BBtalk 方法
const getData = async (ctx) => {
  try {
    const { page = 1, limit = 10 , type = 0} = ctx.query;
    const header = {
      'X-LC-Id': process.env.LEANCLOUD_APPID,
      'X-LC-Key': process.env.LEANCLOUD_APPKEY,
      'Content-Type': 'text/html;charset=utf-8'
    };
    const url = `https://leancloud.guole.fun/1.1/classes/content?limit=${limit}&skip=${(page - 1) * limit}&order=-createdAt&count=1`;
    const response = await axios.get(url, { headers: header });
    const data = response.data;
  
    // 获取数据总数
    const dataCount = data.count;
    let content;
    // type：1 返回全部字段；type: 2 仅返回内容和创建时间
    if (type == 1) {
      content = data.results.map(item => ({
        time: item.createdAt,
        content: item.content,
        from: item.from,
        MsgType: item.MsgType,
        other: item.other,
        objectId: item.objectId
      }));
    } else {
      content = data.results.map(item => ({
        content: item.content,
        time: item.createdAt
      }));
    }
    return {
      data: content,
      count: dataCount,
    };
  } catch (error) {
    console.error('Failed to fetch LeanCloud data', error);
    throw new Error('Failed to fetch LeanCloud data');
  }
};

BBtalkRouter.get("/bbtalk", async (ctx) => {
  const { page = 1, limit = 10 , type = 0} = ctx.query;
  cacheKey = `BBtalk-${page}-${limit}-${type}`;
  console.log("获取 BBtalk 数据");
  try {
    // 从缓存中获取数据
    let data = await get(cacheKey);
    const from = data ? "cache" : "server";
    if (!data) {
      // 如果缓存中不存在数据
      console.log("缓存为空，从 LeanCloud 获取 BBtalk");
      // 从服务器拉取数据
      data = await getData(ctx);
      updateTime = new Date().toISOString();
      // 将数据写入缓存
      await set(cacheKey, data);
    }
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      total: data.data.length,
      updateTime,
      results: data
    };
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

// BBtalk - 获取最新数据
BBtalkRouter.get("/bbtalk/new", async (ctx) => {
  const { page = 1, limit = 10 , type = 0} = ctx.query;
  cacheKey = `BBtalk-${page}-${limit}-${type}`;
  console.log("获取 BBtalk - 最新数据");
  try {
    // 从服务器拉取最新数据
    const newData = await getData(ctx);
    const from = newData ? "server" : "";
    updateTime = new Date().toISOString();
    console.log("从 LeanCloud 重新获取 BBtalk");

    // 返回最新数据
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      total: newData.data.length,
      updateTime,
      results: newData,
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
        total: cachedData.data.length,
        updateTime,
        results: cachedData,
      };
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

BBtalkRouter.post("/newbbtalk", async (ctx) => {
  console.log("尝试发送 BBtalk 闪念");
  var { 'x-lc-id':appid, 'x-lc-key':appkey } = ctx.headers;
  // appkey = appkey + ',master'
  const { from, content } = ctx.request.body;
  const leancloudUrl = 'https://leancloud.guole.fun/1.1/classes/content';
  const leancloudHeaders = {
    'X-LC-Id': appid,
    'X-LC-Key': appkey,
    'Content-Type': 'application/json'
  };
  const requestBody = JSON.stringify({ from, content });
  try {
    await axios.post(leancloudUrl, requestBody, { headers: leancloudHeaders });
  } catch (error) {
    console.error(error);
    const response = error.response;
    const responseData = response ? response.data : null;
    ctx.body = {
      message: error.message, 
      body: ctx.request.body,
      'X-LC-Id':appid, 
      'X-LC-Key':appkey, 
      header: ctx.headers, 
      "responseData": responseData
    }
    ctx.status = 500;
  }

  // 通知 cos 更新 JSON
  const requestData = {
    "token": process.env.token,
  };
  const upload_url = process.env.BBtalk_Upload_Url;
  try {
    const upload_response = await axios.post(upload_url, null, { headers: requestData });
    ctx.body = upload_response.data;
    ctx.status = 200;
  } catch (error) {
    console.error(error);
    ctx.body = error.response ? error.response.data : null;
    ctx.status = 500;
  }
});

BBtalkRouter.get("/newbbtalk", async (ctx) => {
  ctx.body = {
    code: 405,
    message: "Method not allowed. Use POST instead.",
    date: updateTime,
  }
  ctx.status = 405;
});

BBtalkRouter.info = routerInfo;
module.exports = BBtalkRouter;
