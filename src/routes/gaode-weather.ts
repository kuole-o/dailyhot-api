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
  const city = c.req.query('city');
  
  // 获取客户端IP
  const xForwardedFor = c.req.header('x-forwarded-for') || '';
  const clientIp = c.req.ip || c.req.header('cf-connecting-ip') || c.req.header('cf-connecting-ipv6') || c.req.header('x-real-ip') || xForwardedFor.split(',').map(ip => ip.trim())[0] || '';

  logger.debug(`解析ip: ${clientIp}`);
  logger.debug(`用户传入ip: ${ip}`);
  logger.debug(`用户传入city: ${city}`);
  
  const listData = await getList(noCache, key, ip, clientIp, city);

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
    data: {
      infocode: list.infocode,
      province: list.province,
      city: list.city,
      rectangle: list.rectangle,
      adcode: list.adcode,
    },
  };
}

const getList = async (noCache: boolean, key: string, ip: string | undefined, clientIp: string | undefined, city: string | undefined) => {
  const url = `https://restapi.amap.com/v3/weather/weatherInfo`;
  let result, ipInfo: IpInfo | undefined;
  let targetCity = city;
  let useCache = noCache;

  // 如果有city参数，优先使用city，忽略ip
  if (city) {
    logger.debug(`使用用户提供的city: ${city}`);
    // 有city参数，可以缓存
    useCache = noCache;
    result = await get({
      url,
      params: {
        key: key,
        city: city,
      },
      noCache: useCache
    });
  } else {
    // 没有city参数，需要根据IP查询城市
    const targetIp = ip || clientIp;
    logger.debug(`根据IP查询城市，IP: ${targetIp}`);
    
    // 确定是否使用缓存：只有当用户明确提供了ip参数时才使用缓存
    // 如果用户提供了ip参数，可以缓存；如果只靠解析的客户端IP，不能缓存
    const shouldUseCacheForIp = !!(ip);
    useCache = shouldUseCacheForIp ? noCache : true; // true表示不使用缓存
    
    ipInfo = await getIp(useCache, key, targetIp);
    logger.debug(`IP查询结果: ${JSON.stringify(ipInfo.data)}`);
    
    // 检查IP查询结果中的城市是否有效
    if (ipInfo.data.city && ipInfo.data.city.length > 0 && ipInfo.data.city !== '[]') {
      targetCity = ipInfo.data.city;
      logger.debug(`使用IP解析的城市: ${targetCity}`);
      
      // 如果是通过用户提供的IP解析出的城市，可以缓存
      // 如果是通过自动解析的客户端IP解析出的城市，不能缓存
      const shouldUseCacheForWeather = !!(ip);
      useCache = shouldUseCacheForWeather ? noCache : true;
    } else {
      // IP查询返回的城市无效，使用默认城市
      targetCity = '北京';
      logger.debug(`IP解析城市无效，使用默认城市: ${targetCity}`);
      // 使用默认城市查询，不能缓存
      useCache = true;
    }

    result = await get({
      url,
      params: {
        key: key,
        city: targetCity,
      },
      noCache: useCache
    });
  }

  logger.debug(`天气接口返回: ${JSON.stringify(result.data)}`);

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