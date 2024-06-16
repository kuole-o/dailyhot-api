const Router = require("koa-router");
const GithubCalendarRouter = new Router();
const axios = require("axios");
const { get, set, del } = require("../utils/cacheData");

// 接口信息
const routerInfo = {
  name: "GithubCalendar",
  title: "Github",
  subtitle: "Calendar",
};

// 缓存键名
let cacheKey;

// 调用时间
let updateTime = new Date().toISOString();
function getCurrentDate(updateTime) {
  const date = new Date(updateTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function listSplit(items, n) {
  const result = [];
  for (let i = 0; i < items.length; i += n) {
    result.push(items.slice(i, i + n));
  }
  return result;
}

// 获取 Github 方法
const getData = async (name) => {
  const githubUrl = `https://github.com/${name}`;
  try {
    const response = await axios.get(githubUrl);
    if (response.status === 200) {
      const body = response.data;
      const datadateRegex = /data-date="(.*?)" data-level/g;
      const datacountRegex = /data-count="(.*?)" data-date/g;

      let match;
      const datadate = [];
      const datacount = [];

      while ((match = datadateRegex.exec(body)) !== null) {
        datadate.push(match[1]);
      }

      while ((match = datacountRegex.exec(body)) !== null) {
        datacount.push(parseInt(match[1], 10));
      }

      const contributions = datacount.reduce((acc, count) => acc + count, 0);

      const datalist = datadate.map((item, index) => ({
        date: item,
        count: datacount[index],
      }));

      const datalistsplit = listSplit(datalist, 7);

      return {
        total: contributions,
        contributions: datalistsplit,
      };
    }
  } catch (error) {
    console.error('Failed to fetch GitHub data', error);
    throw new Error('Failed to fetch GitHub data');
  }
};

GithubCalendarRouter.get("/GithubCalendar", async (ctx) => {
  const { user } = ctx.query;
  if (!user) {
    ctx.status = 500;
    ctx.body = {
      code: 500,
      ...routerInfo,
      message: "获取 Github 提交日历发生错误，请检查 user 参数是否正确。使用示例：https://api.guole.fun/GithubCalendar?user=xxx",
    };
    return;
  }
  cacheKey = `GithubCalendar-${user}-${getCurrentDate(updateTime)}`;
  console.log("获取 Github 数据");
  try {
    // 从缓存中获取数据
    let data = await get(cacheKey);
    const from = data ? "cache" : "server";
    if (!data) {
      // 如果缓存中不存在数据
      console.log("缓存为空，从 Github 获取数据");
      // 从服务器拉取数据
      data = await getData(user);
      updateTime = new Date().toISOString();
      // 将数据写入缓存
      await set(cacheKey, data);
    }
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
      updateTime,
      data,
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

// Github - 获取最新数据
GithubCalendarRouter.get("/GithubCalendar/new", async (ctx) => {
  const { user = 'kuole-o'} = ctx.query;
  updateTime = new Date().toISOString();
  cacheKey = `GithubCalendar-${user}-${getCurrentDate(updateTime)}`;
  console.log("获取 Github - 最新数据");
  try {
    // 从服务器拉取最新数据
    const newData = await getData(user);
    const from = newData ? "server" : "";
    console.log("从 Github 重新获取数据");

    // 返回最新数据
    ctx.body = {
      code: 200,
      message: "获取成功",
      ...routerInfo,
      from,
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
    const from = cachedData ? "cache" : "server";
    if (cachedData) {
      ctx.body = {
        code: 200,
        message: "获取成功",
        ...routerInfo,
        from,
        updateTime,
        data: cachedData,
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

GithubCalendarRouter.info = routerInfo;
module.exports = GithubCalendarRouter;
