import { jsx as _jsx } from "hono/jsx/jsx-runtime";
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
// 鉴权中间件
app.use(async (c, next) => {
    try {
        let originURL;
        const origin = c.req.header('origin');
        const referer = c.req.header('referer');
        const host = c.req.header('host');
        if (origin) {
            originURL = new URL(origin).hostname;
        }
        else if (referer) {
            originURL = new URL(referer).hostname;
        }
        else if (host) {
            originURL = host.split(":")[0];
        }
        else {
            originURL = '';
        }
        console.log("originURL:", originURL);
        const domain = config.ALLOWED_DOMAIN;
        if (domain === "*" || domain.includes(originURL) || originURL === '' || c.req.path === '/newbbtalk') {
            await next();
        }
        else {
            return c.json({
                code: 403,
                message: "访问未经授权",
            }, 403);
        }
    }
    catch (error) {
        logger.error(`鉴权中间件出现错误：${error}`);
        return c.json({
            code: 500,
            message: "内部服务器错误",
        }, 500);
    }
});
// 压缩响应
app.use(compress());
// prettyJSON
app.use(prettyJSON());
// 尾部斜杠重定向
app.use(trimTrailingSlash());
// CORS
app.use("*", cors({
    origin: config.ALLOWED_DOMAIN,
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["X-Custom-Header", "Upgrade-Insecure-Requests"],
    credentials: true,
}));
// 静态资源
app.use("/*", serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => (path === "/favicon.ico" ? "/favicon.png" : path),
}));
// 主路由
app.route("/", registry);
// robots
app.get("/robots.txt", robotstxt);
// 首页
app.get("/", (c) => c.html(_jsx(Home, {})));
// 404
app.notFound((c) => c.html(_jsx(NotFound, {}), 404));
// error
app.onError((err, c) => {
    logger.error(`出现致命错误：${err}`);
    if (err instanceof HttpError) {
        switch (err.statusCode) {
            case 400:
                return c.html(_jsx(Error, { error: err?.message }), 400);
                break;
            case 401:
                return c.html(_jsx(Error, { error: err?.message }), 401);
                break;
            case 405:
                return c.html(_jsx(Error, { error: err?.message }), 405);
                break;
            case 500:
                return c.html(_jsx(Error, { error: err?.message }), 500);
                break;
        }
    }
    return c.html(_jsx(Error, { error: err?.message }), 500);
});
export default app;
