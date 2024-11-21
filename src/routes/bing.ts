import type { RouterData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const { fromCache, data, updateTime } = await getList(noCache);
  const routeData: RouterData = {
    name: "Bing",
    title: "必应",
    type: "每日一图",
    description: "必应精品每日一图，可用作壁纸",
    link: "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1",
    total: data?.length || 0,
    updateTime,
    fromCache,
    data,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  const url = `https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1`;
  const result = await get({
    url,
    noCache,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/605.1.15",
    },
  });

  const list = result.data.images[0];
  return {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data: list.map((v: RouterType["bing"]) => ({
      url: v.url,
      urlbase: v.urlbase,
      copyright: v.copyright,
      copyrightlink: v.copyrightlink,
      startdate: v.startdate,
      fullstartdate: v.fullstartdate,
      enddate: v.enddate,
      quiz: v.quiz,
    })),
  };
};
