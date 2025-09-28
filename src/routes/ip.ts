import { HonoRequest } from 'hono';
import logger from "../utils/logger.js";

const decodeObject = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      result[key] = decodeURIComponent(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = decodeObject(obj[key]); // 递归解码嵌套对象
    } else {
      result[key] = obj[key];
    }
  }
  return result;
};

interface ExtendedHonoRequest extends HonoRequest {
  ip: string;
  cf?: {
    country?: string;
    region?: string;
    city?: string;
    colo?: string;
    latitude?: string;
    longitude?: string;
    asOrganization?: string;
  };
  headers: Headers;
}

interface GeoInfo {
  ip?: string;
  flag?: string;
  country?: string;
  countryRegion?: string;
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  asOrganization?: string;
}

interface ipItem {
  data: GeoInfo;
}

export const handleRoute = async (c: { req: ExtendedHonoRequest }, noCache: boolean) => {
  // 获取客户端IP - 从常见的请求头中获取
  const xForwardedFor = c.req.header('x-forwarded-for') || '';
  const ip = c.req.header('x-real-ip') || 
             xForwardedFor.split(',').map(ip => ip.trim())[0] || 
             c.req.ip || 
             c.req.header('cf-connecting-ip') || 
             c.req.header('cf-connecting-ipv6') || 
             c.req.header('x-client-ip') || // 通用客户端IP头
             c.req.header('x-forwarded-host') || // 转发主机头
             '未知IP';

  // 尝试从七牛云CDN或其他CDN的请求头获取地理信息
  // 七牛云CDN可能的地理信息头字段（根据实际CDN配置可能会有所不同）
  const data: GeoInfo = {
    ip: ip,
    flag: getFlag(c.req.header('x-country-code') || c.req.cf?.country || c.req.header('cf-ipcountry')),
    country: c.req.header('x-country') || c.req.cf?.country || c.req.header('cf-ipcountry') || c.req.header('x-country-name'),
    countryRegion: c.req.cf?.region || c.req.header('cf-region') || c.req.header('x-region'),
    city: c.req.cf?.city || c.req.header('cf-ipcity') || c.req.header('x-city'),
    region: c.req.cf?.colo || c.req.header('cf-ray')?.split('-')[1] || c.req.header('x-region-code'),
    latitude: c.req.cf?.latitude || c.req.header('cf-iplatitude') || c.req.header('x-latitude'),
    longitude: c.req.cf?.longitude || c.req.header('cf-iplongitude') || c.req.header('x-longitude'),
    asOrganization: c.req.cf?.asOrganization || c.req.header('x-asn') || c.req.header('x-organization'),
  }

  logger.debug(`geo: ${JSON.stringify(data)}`);

  const decodedData = decodeObject(data);

  let routeData: ipItem = {
    data: decodedData,
  };

  return routeData;
};

const EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397;
const getFlag = (countryCode: string | undefined): string | undefined => {
  if (!countryCode) return undefined;
  
  // 确保国家代码是2位大写字母
  const regex = new RegExp('^[A-Z]{2}$');
  if (!regex.test(countryCode)) return undefined;
  
  try {
    return String.fromCodePoint(
      ...countryCode
        .split('')
        .map((char) => EMOJI_FLAG_UNICODE_STARTING_POSITION + char.charCodeAt(0))
    );
  } catch (error) {
    return undefined;
  }
}