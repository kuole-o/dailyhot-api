import type { RouterData } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";

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
  const url = `https://weibo.com/ajax/side/hotSearch`;
  const result = await get({ url, noCache });
  const list = result.data.data.realtime;
  //console.log(result.data.data)
  return {
    ...result,
    data: list
    .filter((v: RouterType["weibo"]) => 
      Boolean(v.is_ad) === false && Boolean(v.topic_ad) === false
    )
    .map((v: RouterType["weibo"]) => {
      const key = v.word_scheme ? v.word_scheme : `#${v.word}`;
      return {
        id: v.mid,
        title: v.word,
        desc: v.note || v.word_scheme || v.flag_desc || key,
        hot: v.num,
        text: getText(v),
        icon_desc: v.icon_desc || v.label_name || v.small_icon_desc || v.flag_desc,
        icon_color: v.icon_desc_color,
        // icon_width: v.icon_width,
        // icon_height: v.icon_height,
        timestamp: getTime(v.onboard_time || v.stime),
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(key)}&t=31&band_rank=1&Refer=top`,
        mobileUrl: `https://s.weibo.com/weibo?q=${encodeURIComponent(
          key,
        )}&t=31&band_rank=1&Refer=top`,
      };
    }),
  };
};

const getText = (v: RouterType["weibo"]) => {
  const text = v.icon_desc || v.label_name || v.small_icon_desc || v.flag_desc;
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