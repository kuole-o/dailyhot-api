import type { OtherData } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const key = process.env.GAODE_KEY || '';
  const listData = await getList(noCache, key);
  const routeData: OtherData = {
    name: "gaode",
    title: "天气",
    description: "高德地理信息 + 高德天气信息",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getIp = async (noCache: boolean, key: string) => {
  const url = `https://restapi.amap.com/v3/ip`;
  const result = await get({
    url,
    params: {
      key: key,
    },
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

const getList = async (noCache: boolean, key: string) => {
  const ip = await getIp(noCache, key);
  const url = `https://restapi.amap.com/v3/weather/weatherInfo`;
  const result = await get({
    url,
    params: {
      key: key,
      city: ip.data.city,
    },
    noCache,
    ttl: 60
  });

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
        rectangle: ip.data.rectangle,
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