import type { OtherData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const key = process.env.GAODE_KEY || '';
  const ip = c.req.header('cf-connecting-ipv6') || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip');

  console.log("请求ip: ", ip)

  const listData = await getList(noCache, key, ip);
  const routeData: OtherData = {
    name: "gaode",
    title: "天气",
    description: "高德地理信息 + 高德天气信息",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getIp = async (noCache: boolean, key: string, ip: string | undefined) => {
  const url = `https://restapi.amap.com/v3/ip`;
  let params;
  if (ip) {
    params = {
      key: key,
      ip: ip,
    }
  } else {
    params = {
      key: key,
    }
  }

  const result = await get({
    url,
    params: params,
    noCache,
    ttl: 60
  });
  const list = result.data;
  return {
    ...result,
    data:
    {
      infocode: list.infocode,
      province: list.province,
      city: list.city,
      rectangle: list.rectangle,
      adcode: list.adcode,
    },
  };
}

const getList = async (noCache: boolean, key: string, ip: string | undefined) => {
  const ipInfo = await getIp(noCache, key, ip);
  console.log("ipInfo: ", ipInfo)
  const url = `https://restapi.amap.com/v3/weather/weatherInfo`;
  const result = await get({
    url,
    params: {
      key: key,
      city: ipInfo.data.city,
    },
    noCache,
    ttl: 60
  });
  console.log("result: ", result)

  if (!result.data || !result.data.lives) {
    return {
      ...result,
      data: [],
    };
  }
  const list = result.data.lives;
  return {
    ...result,
    data: list.map((v: RouterType["gaode"]) => {
      return {
        province: v.province,
        city: v.city,
        adcode: v.adcode,
        rectangle: ipInfo.data.rectangle,
        weather: v.weather,
        temperature: v.temperature,
        winddirection: v.winddirection,
        windpower: v.windpower,
        humidity: v.humidity,
        reporttime: v.reporttime,
        temperature_float: v.temperature_float,
        humidity_float: v.humidity_float,
      };
    }),
  };
};