import type { OtherData, ListContext, Options } from "../types.js";
import { HonoRequest } from 'hono';

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

export const handleRoute = async (c: { req: ExtendedHonoRequest }, noCache: boolean) => {
  const ip = c.req.header('cf-connecting-ipv6') || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.req.ip || '未知IP';
  const vercelGeo = c.req.raw.geo || {};
  const { pathname } = new URL(c.req.url);
  console.log(ip, pathname);

  const country = c.req.cf?.country || c.req.header('cf-ipcountry')
  const colo = c.req.header('cf-ray')?.split('-')[1];

  const data: GeoInfo = {
    ip: ip,
    flag: country && getFlag(country),
    country: country || c.req.header('X-Vercel-IP-Country') || vercelGeo.country,
    countryRegion: c.req.cf?.region || c.req.header('cf-region') || c.req.header('X-Vercel-IP-Country-Region') || vercelGeo.region,
    city: c.req.cf?.city || c.req.header('cf-ipcity') || c.req.header('X-Vercel-IP-City')|| vercelGeo.city,
    region: c.req.cf?.colo || colo || vercelGeo.region,
    latitude: c.req.cf?.latitude || c.req.header('cf-iplatitude') || vercelGeo.latitude,
    longitude: c.req.cf?.longitude || c.req.header('cf-iplongitude') || vercelGeo.longitude,
    asOrganization: c.req.cf?.asOrganization || c.req.header('x-asn') || vercelGeo.timezone,
  }

  console.log("geo: ", data);

  let routeData: OtherData = {
    data,
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