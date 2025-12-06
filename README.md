<div align="center">
<h1>个人自用 API 接口集合</h1>
<span>修改自：</span><a href="https://github.com/imsyy/DailyHotApi">DailyHotApi（v2.0.8-c190efd）</a><span>，感谢<b>imsyy<b>的分享！</span>
<br />
<img src="https://img.shields.io/github/last-commit/imsyy/DailyHotApi" alt="last commit"/>
 <img src="https://img.shields.io/github/languages/code-size/imsyy/DailyHotApi" alt="code size"/>
 <img src="https://img.shields.io/docker/image-size/imsyy/dailyhot-api" alt="docker-image-size"/>
<img src="https://github.com/imsyy/DailyHotApi/actions/workflows/docker.yml/badge.svg" alt="Publish Docker image"/>
<img src="https://github.com/imsyy/DailyHotApi/actions/workflows/npm.yml/badge.svg" alt="Publish npm package"/>
</div>

## 🚩 特性

- 极快响应，便于开发
- 支持 RSS 模式和 JSON 模式
- 支持多种部署方式
- 简明的路由目录，便于新增

## 👀 示例

> 这里是使用该 API 的示例站点  
> 示例站点可能由于访问量或者长久未维护而访问异常  
> 若您也使用了本 API 搭建了网站，欢迎提交您的站点链接

- [今日热榜 - https://hot.imsyy.top/](https://hot.imsyy.top/)
- [每日热搜 - https://hot.guole.fun/](https://hot.guole.fun/)

## 📊 接口总览

> 🟢 状态正常 / 🟠 可能失效 / ❌ 无法使用 / ⚠️ 需要科学上网

<details>
<summary>查看全部接口</summary>

> 示例站点运行于海外服务器，部分国内站点可能存在访问异常，请以实际情况为准
| **站点**         | **类别**     | **调用名称**      | **状态**                               |
|------------------|--------------|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|  
| 哔哩哔哩         | 热门榜       | bilibili           | ![https://api.guole.fun/bilibili](https://img.shields.io/website.svg?label=bilibili&url=https://api.guole.fun/bilibili&cacheSeconds=7200)                                                                 |  
| AcFun            | 排行榜       | acfun             | ![https://api.guole.fun/acfun](https://img.shields.io/website.svg?label=acfun&url=https://api.guole.fun/acfun&cacheSeconds=7200)                                                                         |  
| 微博             | 热搜榜       | weibo             | ![https://api.guole.fun/weibo](https://img.shields.io/website.svg?label=weibo&url=https://api.guole.fun/weibo&cacheSeconds=7200)                                                                         |  
| 知乎             | 热榜         | zhihu             | ![https://api.guole.fun/zhihu](https://img.shields.io/website.svg?label=zhihu&url=https://api.guole.fun/zhihu&cacheSeconds=7200)                                                                         |  
| 知乎日报         | 推荐榜       | zhihu-daily       | ![https://api.guole.fun/zhihu-daily](https://img.shields.io/website.svg?label=zhihu-daily&url=https://api.guole.fun/zhihu-daily&cacheSeconds=7200)                                                       |  
| 百度             | 热搜榜       | baidu             | ![https://api.guole.fun/baidu](https://img.shields.io/website.svg?label=baidu&url=https://api.guole.fun/baidu&cacheSeconds=7200)                                                                         |  
| 抖音             | 热点榜       | douyin            | ![https://api.guole.fun/douyin](https://img.shields.io/website.svg?label=douyin&url=https://api.guole.fun/douyin&cacheSeconds=7200)                                                                       |  
| 快手             | 热点榜       | kuaishou          | ![https://api.guole.fun/kuaishou](https://img.shields.io/website.svg?label=kuaishou&url=https://api.guole.fun/kuaishou&cacheSeconds=7200)                                                               |  
| 豆瓣电影         | 新片榜       | douban-movie      | ![https://api.guole.fun/douban-movie](https://img.shields.io/website.svg?label=douban-movie&url=https://api.guole.fun/douban-movie&cacheSeconds=7200)                                                   |  
| 豆瓣讨论小组     | 讨论精选     | douban-group      | ![https://api.guole.fun/douban-group](https://img.shields.io/website.svg?label=douban-group&url=https://api.guole.fun/douban-group&cacheSeconds=7200)                                                   |  
| 百度贴吧         | 热议榜       | tieba             | ![https://api.guole.fun/tieba](https://img.shields.io/website.svg?label=tieba&url=https://api.guole.fun/tieba&cacheSeconds=7200)                                                                         |  
| 少数派           | 热榜         | sspai             | ![https://api.guole.fun/sspai](https://img.shields.io/website.svg?label=sspai&url=https://api.guole.fun/sspai&cacheSeconds=7200)                                                                         |  
| IT之家           | 热榜         | ithome            | ![https://api.guole.fun/ithome](https://img.shields.io/website.svg?label=ithome&url=https://api.guole.fun/ithome&cacheSeconds=7200)                                                                       |  
| IT之家「喜加一」 | 最新动态     | ithome-xijiayi    | ![https://api.guole.fun/ithome-xijiayi](https://img.shields.io/website.svg?label=ithome-xijiayi&url=https://api.guole.fun/ithome-xijiayi&cacheSeconds=7200)                                           |  
| 简书             | 热门推荐     | jianshu           | ![https://api.guole.fun/jianshu](https://img.shields.io/website.svg?label=jianshu&url=https://api.guole.fun/jianshu&cacheSeconds=7200)                                                                 |  
| 果壳             | 热门文章     | guokr             | ![https://api.guole.fun/guokr](https://img.shields.io/website.svg?label=guokr&url=https://api.guole.fun/guokr&cacheSeconds=7200)                                                                         |  
| 澎湃新闻         | 热榜         | thepaper          | ![https://api.guole.fun/thepaper](https://img.shields.io/website.svg?label=thepaper&url=https://api.guole.fun/thepaper&cacheSeconds=7200)                                                               |  
| 今日头条         | 热榜         | toutiao           | ![https://api.guole.fun/toutiao](https://img.shields.io/website.svg?label=toutiao&url=https://api.guole.fun/toutiao&cacheSeconds=7200)                                                                   |  
| 36 氪            | 热榜         | 36kr              | ![https://api.guole.fun/36kr](https://img.shields.io/website.svg?label=36kr&url=https://api.guole.fun/36kr&cacheSeconds=7200)                                                                             |  
| 51CTO            | 推荐榜       | 51cto             | ![https://api.guole.fun/51cto](https://img.shields.io/website.svg?label=51cto&url=https://api.guole.fun/51cto&cacheSeconds=7200)                                                                         |  
| CSDN             | 排行榜       | csdn              | ![https://api.guole.fun/csdn](https://img.shields.io/website.svg?label=csdn&url=https://api.guole.fun/csdn&cacheSeconds=7200)                                                                             |  
| NodeSeek         | 最新动态     | nodeseek          | ![https://api.guole.fun/nodeseek](https://img.shields.io/website.svg?label=nodeseek&url=https://api.guole.fun/nodeseek&cacheSeconds=7200)                                                               |  
| 稀土掘金         | 热榜         | juejin            | ![https://api.guole.fun/juejin](https://img.shields.io/website.svg?label=juejin&url=https://api.guole.fun/juejin&cacheSeconds=7200)                                                                     |  
| 腾讯新闻         | 热点榜       | qq-news           | ![https://api.guole.fun/qq-news](https://img.shields.io/website.svg?label=qq-news&url=https://api.guole.fun/qq-news&cacheSeconds=7200)                                                                   |  
| 新浪网           | 热榜         | sina              | ![https://api.guole.fun/sina](https://img.shields.io/website.svg?label=sina&url=https://api.guole.fun/sina&cacheSeconds=7200)                                                                             |  
| 新浪新闻         | 热点榜       | sina-news         | ![https://api.guole.fun/sina-news](https://img.shields.io/website.svg?label=sina-news&url=https://api.guole.fun/sina-news&cacheSeconds=7200)                                                             |  
| 网易新闻         | 热点榜       | netease-news      | ![https://api.guole.fun/netease-news](https://img.shields.io/website.svg?label=netease-news&url=https://api.guole.fun/netease-news&cacheSeconds=7200)                                                   |  
| 吾爱破解         | 榜单         | 52pojie           | ![https://api.guole.fun/52pojie](https://img.shields.io/website.svg?label=52pojie&url=https://api.guole.fun/52pojie&cacheSeconds=7200)                                                                   |  
| 全球主机交流     | 榜单         | hostloc           | ![https://api.guole.fun/hostloc](https://img.shields.io/website.svg?label=hostloc&url=https://api.guole.fun/hostloc&cacheSeconds=7200)                                                                   |  
| 虎嗅             | 24小时       | huxiu             | ![https://api.guole.fun/huxiu](https://img.shields.io/website.svg?label=huxiu&url=https://api.guole.fun/huxiu&cacheSeconds=7200)                                                                         |  
| 酷安             | 热榜         | coolapk           | ![https://api.guole.fun/coolapk](https://img.shields.io/website.svg?label=coolapk&url=https://api.guole.fun/coolapk&cacheSeconds=7200)                                                                   |  
| 虎扑             | 步行街热帖   | hupu              | ![https://api.guole.fun/hupu](https://img.shields.io/website.svg?label=hupu&url=https://api.guole.fun/hupu&cacheSeconds=7200)                                                                             |  
| 爱范儿           | 快讯         | ifanr            | ![https://api.guole.fun/ifanr](https://img.shields.io/website.svg?label=ifanr&url=https://api.guole.fun/ifanr&cacheSeconds=7200)                                                                           |  
| 英雄联盟         | 更新公告     | lol               | ![https://api.guole.fun/lol](https://img.shields.io/website.svg?label=lol&url=https://api.guole.fun/lol&cacheSeconds=7200)                                                                                 |  
| 米游社           | 最新消息     | miyoushe          | ![https://api.guole.fun/miyoushe](https://img.shields.io/website.svg?label=miyoushe&url=https://api.guole.fun/miyoushe&cacheSeconds=7200)                                                               |  
| 原神             | 最新消息     | genshin           | ![https://api.guole.fun/genshin](https://img.shields.io/website.svg?label=genshin&url=https://api.guole.fun/genshin&cacheSeconds=7200)                                                                     |  
| 崩坏3           | 最新动态     | honkai            | ![https://api.guole.fun/honkai](https://img.shields.io/website.svg?label=honkai&url=https://api.guole.fun/honkai&cacheSeconds=7200)                                                                       |  
| 崩坏：星穹铁道   | 最新动态     | starrail          | ![https://api.guole.fun/starrail](https://img.shields.io/website.svg?label=starrail&url=https://api.guole.fun/starrail&cacheSeconds=7200)                                                                 |  
| 微信读书         | 飙升榜       | weread            | ![https://api.guole.fun/weread](https://img.shields.io/website.svg?label=weread&url=https://api.guole.fun/weread&cacheSeconds=7200)                                                                       |  
| NGA              | 热帖         | ngabbs            | ![https://api.guole.fun/ngabbs](https://img.shields.io/website.svg?label=ngabbs&url=https://api.guole.fun/ngabbs&cacheSeconds=7200)                                                                       |  
| V2EX             | 主题榜       | v2ex              | ![https://api.guole.fun/v2ex](https://img.shields.io/website.svg?label=v2ex&url=https://api.guole.fun/v2ex&cacheSeconds=7200)                                                                               |  
| HelloGitHub      | Trending      | hellogithub       | ![https://api.guole.fun/hellogithub](https://img.shields.io/website.svg?label=hellogithub&url=https://api.guole.fun/hellogithub&cacheSeconds=7200)                                                       |  
| 中央气象台       | 全国气象预警 | weatheralarm      | ![https://api.guole.fun/weatheralarm](https://img.shields.io/website.svg?label=weatheralarm&url=https://api.guole.fun/weatheralarm&cacheSeconds=7200)                                                     |  
| 中国地震台       | 地震速报     | earthquake        | ![https://api.guole.fun/earthquake](https://img.shields.io/website.svg?label=earthquake&url=https://api.guole.fun/earthquake&cacheSeconds=7200)                                                           |  
| 历史上的今天     | 月-日        | history           | ![https://api.guole.fun/history](https://img.shields.io/website.svg?label=history&url=https://api.guole.fun/history&cacheSeconds=7200)                                                                     |  
| Github 提交日历  | 用户名       | github-calendar    | ![https://api.guole.fun/GithubCalendar](https://img.shields.io/website.svg?label=GithubCalendar&url=https://api.guole.fun/GithubCalendar&cacheSeconds=7200)                                               |  
| 哔哔闪念         | 最近哔哔     | bbtalk            | ![https://api.guole.fun/bbtalk](https://img.shields.io/website.svg?label=bbtalk&url=https://api.guole.fun/bbtalk&cacheSeconds=7200)                                                                       |  
| 必应             | 每日一图     | bing              | ![https://api.guole.fun/bing](https://img.shields.io/website.svg?label=bing&url=https://api.guole.fun/bing&cacheSeconds=7200)                                                                             |  
| 高德天气             | 高德天气信息     | gaode-weather              | ![https://api.guole.fun/gaode-weather](https://img.shields.io/website.svg?label=gaode-weather&url=https://api.guole.fun/gaode-weather&cacheSeconds=7200)                                                                             |  
| IP             | 利用 vercel 返回 IP 信息     | ip              | ![https://api.guole.fun/ip](https://img.shields.io/website.svg?label=ip&url=https://api.guole.fun/ip&cacheSeconds=7200)                                                                             |  
| umami             | 查询 umami 网站统计数据     | umami              | ![https://api.guole.fun/umami](https://img.shields.io/website.svg?label=umami&url=https://api.guole.fun/umami&cacheSeconds=7200)                                                                             |  
</details>

## ⚙️ 使用

本项目支持 `Node.js` 调用，可在安装完成后调用 `serveHotApi` 来开启服务器

> 该方式无法使用部分需要 Puppeteer 环境的接口

```bash
pnpm add dailyhot-api
```

```js
import serveHotApi from "dailyhot-api";

/**
 * 启动服务器
 * @param {Number} [port] - 端口号
 * @returns {Promise<void>}
 */
serveHotApi(3000);
```

## ⚙️ 部署

具体使用说明可参考 [我的博客](https://blog.imsyy.top/posts/2024/0408)，下方仅讲解基础操作：

### Docker 部署

> 安装及配置 Docker 将不在此处说明，请自行解决

#### 本地构建

```bash
# 构建
docker build -t dailyhot-api .

# 运行
docker run --restart always -p 37291:6688 -d dailyhot-api
# 或使用 Docker Compose
docker-compose up -d

# 开发-构建镜像
docker build -t dailyhot-api:local-test .

# 开发-导出镜像
docker save -o dailyhot-api.tar dailyhot-api:local-test
```

#### 在线部署

```bash
# 拉取
docker pull kuole-o/dailyhot-api:latest

# 运行
docker run --restart always -p 37291:6688 -d kuole-o/dailyhot-api:latest
```

### 手动部署

最直接的方式，您可以按照以下步骤将 `dailyhot-api` 部署在您的电脑、服务器或者其他任何地方

#### 安装

```bash
git clone https://github.com/kuole-o/api.git
cd DailyHotApi
```

然后再执行安装依赖

```bash
npm install
```

复制 `/.env.example` 文件并重命名为 `/.env` 并修改配置

#### 开发

```bash
npm run dev
```

成功启动后程序会在控制台输出可访问的地址

#### 编译运行

```bash
npm run build
npm run start
```

### pm2 部署

```bash
npm i pm2 -g
sh ./deploy.sh
```

成功启动后程序会在控制台输出可访问的地址

### Vercel 部署

本项目支持通过 `Vercel` 进行一键部署，点击下方按钮或前往 [项目仓库](https://github.com/imsyy/DailyHotApi-Vercel) 进行手动部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/imsyys-projects/clone?repository-url=https%3A%2F%2Fgithub.com%2Fimsyy%2FDailyHotApi-Vercel)

### Railway 部署

本项目支持使用 [Railway](https://railway.app/) 一键部署，请先将本项目 fork 到您的仓库中，即可使用一键部署。

### Zeabur 部署

本项目支持使用 [Zeabur](https://zeabur.com/) 一键部署，请先将本项目 fork 到您的仓库中，即可使用一键部署。

## ⚠️ 须知

- 本项目为了避免频繁请求官方数据，默认对数据做了缓存处理，默认为 `60` 分钟，如需更改，请自行修改配置
- 本项目部分接口使用了 **页面爬虫**，若违反对应页面的相关规则，请 **及时通知我去除该接口**

## 📢 免责声明

- 本项目提供的 `API` 仅供开发者进行技术研究和开发测试使用。使用该 `API` 获取的信息仅供参考，不代表本项目对信息的准确性、可靠性、合法性、完整性作出任何承诺或保证。本项目不对任何因使用该 `API` 获取信息而导致的任何直接或间接损失负责。本项目保留随时更改 `API` 接口地址、接口协议、接口参数及其他相关内容的权利。本项目对使用者使用 `API` 的行为不承担任何直接或间接的法律责任
- 本项目并未与相关信息提供方建立任何关联或合作关系，获取的信息均来自公开渠道，如因使用该 `API` 获取信息而产生的任何法律责任，由使用者自行承担
- 本项目对使用 `API` 获取的信息进行了最大限度的筛选和整理，但不保证信息的准确性和完整性。使用 `API` 获取信息时，请务必自行核实信息的真实性和可靠性，谨慎处理相关事项
- 本项目保留对 `API` 的随时更改、停用、限制使用等措施的权利。任何因使用本 `API` 产生的损失，本项目不负担任何赔偿和责任

## 😘 鸣谢

特此感谢为本项目提供支持与灵感的项目

- [RSSHub](https://github.com/DIYgod/RSSHub)

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=imsyy/DailyHotApi&type=Date)](https://star-history.com/#imsyy/DailyHotApi&Date)