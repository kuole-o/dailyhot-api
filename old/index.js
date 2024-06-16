require("dotenv").config();
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const cors = require("koa2-cors");
const serve = require("koa-static");
const views = require("koa-views");

const app = new Koa();
const net = require("net");
const router = require("./routes");

// 配置信息
let domain = process.env.ALLOWED_DOMAIN || "*";
let port = process.env.PORT || 8859;

// 解析请求体
app.use(bodyParser());

// 静态文件目录
app.use(serve(__dirname + "/public"));
app.use(views(__dirname + "/public"));

// 跨域
app.use(
  cors({
    origin: '*',
  })
);

app.use(async (ctx, next) => {
  let originURL;
  if (ctx.headers.origin) {
    originURL = new URL(ctx.headers.origin).hostname;
  } else if (ctx.headers.referer) {
    originURL = new URL(ctx.headers.referer).hostname;
  } else if (ctx.headers.host) {
    originURL = ctx.headers.host.split(":")[0];
  } else {
    originURL = '';
  }
  console.log("originURL：",originURL)
  if (domain === "*" || domain.indexOf(originURL) >= 0 || originURL === '' || ctx.path === '/newbbtalk') {
    await next();
  } else {
    ctx.status = 403;
    ctx.body = {
      code: 403,
      message: "访问未经授权",
    }
  }
});

// 使用路由中间件
app.use(router.routes());
app.use(router.allowedMethods());

// 404 路由
app.use(async (ctx) => {
  await ctx.render("404");
});

// 启动应用程序并监听端口
const startApp = (port) => {
  app.listen(port, () => {
    console.info(`成功在 ${port} 端口上运行`);
  });
};

// 检测端口是否被占用
const checkPort = (port) => {
  return new Promise((resolve, reject) => {
    const server = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.info(`端口 ${port} 已被占用, 正在尝试其他端口...`);
          server.close();
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once("listening", () => {
        server.close();
        resolve(true);
      })
      .listen(port);
  });
};

// 尝试启动应用程序
const tryStartApp = async (port) => {
  let isPortAvailable = await checkPort(port);
  while (!isPortAvailable) {
    port++;
    isPortAvailable = await checkPort(port);
  }
  startApp(port);
};

tryStartApp(port);
