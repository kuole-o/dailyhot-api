import type { OtherData } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import { HonoRequest } from 'hono';
import logger from "../utils/logger.js";

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
  const key = c.req.query('key') || process.env.GAODE_KEY || '';
  const ip = c.req.query('ip');
  const clientIp = c.req.header('cf-connecting-ipv6') || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.req.ip;
  const city = c.req.query('city');
  let listData;

  logger.debug(`vercel解析ip: ${clientIp}`);
  logger.debug(`用户传入ip: ${ip}`);
  logger.debug(`用户传入city: ${city}`);
  
  listData = await getList(noCache, key, ip, clientIp, city);

  const routeData: OtherData = {
    name: "gaode",
    title: "天气",
    description: "高德地理信息 + 高德天气信息",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getIp = async (cache: boolean, key: string, ip: string | undefined) => {
  const url = `https://restapi.amap.com/v3/ip`;
  let params;
  if (ip && ip.length > 0) {
    params = {
      key: key,
      ip: ip,
    };
  } else {
    params = {
      key: key,
    };
  }

  const result = await get({
    url,
    params: params,
    noCache: cache
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

const getList = async (noCache: boolean, key: string, ip: string | undefined, clientIp: string | undefined, city: string | undefined) => {
  let result, cache, ipInfo: IpInfo | undefined;
  const url = `https://restapi.amap.com/v3/weather/weatherInfo`;

  if (!ip && !city) {
    cache = false;
  } else {
    cache = noCache;
  }

  if (city) {
    result = await get({
      url,
      params: {
        key: key,
        city: city,
      },
      noCache: cache
    });
  } else {
    ipInfo = await getIp(cache, key, ip ? ip : clientIp);
    logger.debug(`ipInfo: ${ipInfo}`);

    result = await get({
      url,
      params: {
        key: key,
        city: ipInfo.data.city && ipInfo.data.city.length > 0 ? ipInfo.data.city : '北京',
      },
      noCache: cache
    });
  }

  logger.debug(`天气接口返回: ${result.data.lives}`);

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
