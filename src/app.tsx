import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import { prettyJSON } from "hono/pretty-json";
import { trimTrailingSlash } from "hono/trailing-slash";
import logger from "./utils/logger.js";
import registry from "./registry.js";
import robotstxt from "./robots.txt.js";
import NotFound from "./views/NotFound.js";
import Home from "./views/Home.js";
import Error from "./views/Error.js";
import { HttpError } from './utils/errors.js';

const app = new Hono();

// 压缩响应
app.use(compress());

// prettyJSON
app.use(prettyJSON());

// 尾部斜杠重定向
app.use(trimTrailingSlash());

// 鉴权中间件
// app.use(async (c, next) => {
//   try {
//     let originURL = '';
//     const origin = c.req.header('origin') || '';
//     const referer = c.req.header('referer') || '';

//     if (origin) {
//       originURL = new URL(origin).hostname;
//     } else if (referer) {
//       originURL = new URL(referer).hostname;
//     } else {
//       originURL = '';
//     }

//     console.log("originURL:", originURL);

//     const domain = config.ALLOWED_DOMAIN;
//     const isSame = config.ALLOWED_HOST && origin.endsWith(config.ALLOWED_HOST);

//     if (isSame || domain === "*" || domain.includes(originURL) || originURL === '' || c.req.path === '/newbbtalk') {
//       c.res.headers.set('Access-Control-Allow-Origin', '*');
//       await next();
//     }

//     return c.json({
//       code: 403,
//       message: "访问未经授权",
//     }, 403);
//   } catch (error) {
//     logger.error(`鉴权中间件出现错误：${error}`);
//     return c.json({
//       code: 500,
//       message: "内部服务器错误",
//     }, 500);
//   }
// });

app.use("*", cors({
  origin: (origin, c) => {
    const domain = config.ALLOWED_DOMAIN;
    const isSame = config.ALLOWED_HOST && origin?.endsWith(config.ALLOWED_HOST);
    if (isSame || domain === "*" || (origin && domain.includes(new URL(origin).hostname)) || origin === '' || c.req.path === '/newbbtalk') {
      c.res.headers.set('Access-Control-Allow-Origin', origin);
      return origin;
    }
    c.res.headers.set('Access-Control-Allow-Origin', '');
    return null;
  },
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
}));

// 全局配置响应头
app.use(
  "/*",
  async (c, next) => {
    c.header('Content-Type', 'application/json; charset=UTF-8');
    await next();
  },
);

// 静态资源
app.use(
  "/*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => (path === "/favicon.ico" ? "/favicon.png" : path),
  }),
);

// 主路由
app.route("/", registry);

// robots
app.get("/robots.txt", robotstxt);

const headContent = `
<head>
  <script defer src="https://umami.guole.fun/script.js" data-website-id="45118a74-6cda-4f3e-bd9b-7f68181a2bc1" data-domains="api.guole.fun"></script>
</head>
`;

// 首页
app.get("/", (c) => c.html(headContent + <Home />));

// 404
app.notFound((c) => c.html(headContent + <NotFound />, 404));

// error
app.onError((err, c) => {
  logger.error(`❌ [ERROR] ${err?.message}`);

  if (err instanceof HttpError) {
    const statusCode = err.statusCode;
    const errorMap: { [key: number]: () => Response | Promise<Response> } = {
      400: () => c.html(<Error error={err?.message} />, 400),
      401: () => c.html(<Error error={err?.message} />, 401),
      402: () => c.html(<Error error={err?.message} />, 402),
      403: () => c.html(<Error error={err?.message} />, 403),
      404: () => c.html(<Error error={err?.message} />, 404),
      405: () => c.html(<Error error={err?.message} />, 405),
      500: () => c.html(<Error error={err?.message} />, 500),
      501: () => c.html(<Error error={err?.message} />, 501),
      502: () => c.html(<Error error={err?.message} />, 502),
      503: () => c.html(<Error error={err?.message} />, 503),
      504: () => c.html(<Error error={err?.message} />, 504),
    };
    if (statusCode in errorMap) {
      return errorMap[statusCode]();
    }
  }

  return c.html(headContent + <Error error={err?.message} />, 500);
});

export default app;