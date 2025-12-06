import type { RouterData } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get, cleanPostContent } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";
import logger from "../utils/logger.js";
import { config } from "../config.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "weibo",
    title: "微博",
    type: "热搜榜",
    description: "实时热点，每分钟更新一次",
    link: "https://s.weibo.com/top/summary/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  const url = "https://weibo.com/ajax/side/hotSearch";

  const result = await get({
    url,
    noCache,
    ttl: 60,
    headers: {
      Referer: "https://weibo.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
  });

  if (!result.data?.data?.realtime) {
    return { ...result, data: [] };
  }

  const list = result.data.data.realtime;

  logger.debug(`微博热搜源数据: ${JSON.stringify(list)}`);

  return {
    ...result,
    data: list
      .filter(
        (v: RouterType["weibo"]) =>
          !(
            v?.pic === "https://simg.s.weibo.com/20210408_search_point_orange.png" &&
            config.FILTER_WEIBO_ADVERTISEMENT
          ),
      )
      .map((v: RouterType["weibo"], index: number) => {
        const title = v.word || v.word_scheme || `热搜${index + 1}`;
        return {
          id: v.mid || v.word_scheme || `weibo-${index}`,
          title: title,
          desc: v.word_scheme || `#${title}#`,
          hot: v.num,
          text: getText(v) ? getText(v) : '',
          icon: v.icon,
          icon_color: v.icon_desc_color,
          // icon_width: v.icon_width,
          // icon_height: v.icon_height,
          timestamp: getTime(v.onboard_time || Date.now()),
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
          mobileUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(title)}`,
        };
      }),
  };
};

const getText = (v: RouterType["weibo"]) => {
  const text = v.icon || v.label_name || v.small_icon_desc || v.flag_desc;
  if (text && text.length > 1) {
    switch (text) {
      case '剧集':
        return '剧';
      case '综艺':
        return '综';
      case '电影':
        return '影';
      case '音乐':
        return '音';
      case '谣言':
        return '谣';
      default:
        return '荐';
    }
  }
  return text
}

const getNumber = (desc: Number) => {
  const num = String(desc);
  return num ? Number(num.match(/\d+/g)?.[0]) : 0;
}