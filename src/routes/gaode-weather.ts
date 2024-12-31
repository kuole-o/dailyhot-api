import type { OtherData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import { HonoRequest } from 'hono';

interface ExtendedHonoRequest extends HonoRequest {
  ip: string;
}

interface IpInfo {
  data: {
    status?: string;
    info?: string;
    infocode?: string;
    province?: string;
    city?: string;
    adcode?: string;
    rectangle?: string;
  }
}

export const handleRoute = async (c: { req: ExtendedHonoRequest }, noCache: boolean) => {
  const key = process.env.GAODE_KEY || c.req.query('key') || '';
  const ip = c.req.query('ip') || c.req.header('cf-connecting-ipv6') || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.req.ip;
  const city = c.req.query('city') || '';
  let listData;

  console.log("请求ip: ", ip)

  if (!ip && !city) {
    listData = await getList(true, key, ip, city);
  } else {
    listData = await getList(noCache, key, ip, city);
  }


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
    noCache
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

const getList = async (noCache: boolean, key: string, ip: string | undefined, city: string | undefined) => {
  let result, ipInfo: IpInfo | undefined;
  const url = `https://restapi.amap.com/v3/weather/weatherInfo`;

  if (city && !ip) {
    result = await get({
      url,
      params: {
        key: key,
        city: city,
      },
      noCache
    });
  } else {
    ipInfo = await getIp(noCache, key, ip);
    console.log("ipInfo: ", ipInfo)
    result = await get({
      url,
      params: {
        key: key,
        city: ipInfo.data.city && ipInfo.data.city.length > 0 ? ipInfo.data.city : '北京',
      },
      noCache
    });
  }
  console.log("result.data: ", result.data)

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
        rectangle: ipInfo?.data.rectangle || '',
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
