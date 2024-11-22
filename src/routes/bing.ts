import type { OtherData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const format = c.req.query("format");
  const { fromCache, data, updateTime } = await getList(noCache);
  const routeData: OtherData = {
    name: "Bing",
    title: "必应",
    type: "每日一图",
    description: "必应精品每日一图，可用作壁纸",
    link: "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1",
    total: 1,
    updateTime,
    fromCache,
    data,
  };
  const imagesData = `https://cn.bing.com${data.url}`;
  if(format && format == 'json') {
    return routeData;
  } else {
    c.status(307);
    c.redirect(imagesData);
    return;
  }
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

  const images = result.data?.images || [];

  if (images.length === 0) {
    throw new Error("No images found in the response");
  }

  const firstImage = images[0];
  console.log(firstImage);

  return {
    fromCache: result.fromCache,
    updateTime: result.updateTime,
    data: {
      title: firstImage.title,
      url: firstImage.url,
      urlbase: firstImage.urlbase,
      copyright: firstImage.copyright,
      copyrightlink: firstImage.copyrightlink,
      startdate: firstImage.startdate,
      fullstartdate: firstImage.fullstartdate,
      enddate: firstImage.enddate,
    },
  };
};