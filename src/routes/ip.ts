import { HonoRequest } from 'hono';
import { ipAddress, geolocation } from '@vercel/functions';
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
  raw: HonoRequest['raw'] & {
    geo?: {
      country?: string;
      region?: string;
      city?: string;
      colo?: string;
      latitude?: string;
      longitude?: string;
      timezone?: string;
    }
  };
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

  let vercel_ip = '';
  let vercel_geo: GeoInfo = {};

  try {
    vercel_ip = ipAddress(c.req) || '';
  } catch (error) {
    logger.error('Error getting IP address:', error);
  }

  try {
    vercel_geo = geolocation(c.req) || {};
  } catch (error) {
    logger.error('Error getting geolocation:', error);
  }

  const ip = c.req.header('x-real-ip') || c.req.header('cf-connecting-ipv6') || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.ip || vercel_ip || '未知IP';
  const vercelGeo = c.req.raw.geo || vercel_geo;
  const country = c.req.cf?.country || c.req.header('cf-ipcountry')
  const colo = c.req.header('cf-ray')?.split('-')[1];

  const data: GeoInfo = {
    ip: ip,
    flag: country && getFlag(country),
    country: country || c.req.header('X-Vercel-IP-Country') || vercelGeo.country,
    countryRegion: c.req.cf?.region || c.req.header('cf-region') || c.req.header('X-Vercel-IP-Country-Region') || vercelGeo.region,
    city: c.req.cf?.city || c.req.header('cf-ipcity') || c.req.header('X-Vercel-IP-City') || vercelGeo.city,
    region: c.req.cf?.colo || colo || vercelGeo.region,
    latitude: c.req.cf?.latitude || c.req.header('cf-iplatitude') || vercelGeo.latitude,
    longitude: c.req.cf?.longitude || c.req.header('cf-iplongitude') || vercelGeo.longitude,
    asOrganization: c.req.cf?.asOrganization || c.req.header('x-asn') || c.req.raw.geo?.timezone,
  }

  logger.debug(`geo: ${JSON.stringify(data)}`);

  const decodedData = decodeObject(data);

  let routeData: ipItem = {
    data: decodedData,
  };

  return routeData;
};

const EMOJI_FLAG_UNICODE_STARTING_POSITION = 127397;
const getFlag = (countryCode: string): string | undefined => {
  const regex = new RegExp('^[A-Z]{2}$').test(countryCode);
  if (!countryCode || !regex) return undefined;
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