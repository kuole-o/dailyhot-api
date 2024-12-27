import type { OtherData, ListContext, Options } from "../types.js";
import { HonoRequest } from 'hono';
import { ipAddress, geolocation, json } from '@vercel/edge';

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

export const handleRoute = async (c: { req: ExtendedHonoRequest }, noCache: boolean) => {
  const ip = c.req.header('cf-connecting-ipv6') || c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || c.req.ip || '未知IP';
  const { pathname } = new URL(c.req.url);
  console.log(ip, pathname);

  const country = c.req.cf?.country || c.req.header('cf-ipcountry')
  const colo = c.req.header('cf-ray')?.split('-')[1];

  const geo: GeoInfo = {
    ip: ip,
    flag: country && getFlag(country),
    country: country,
    countryRegion: c.req.cf?.region || c.req.header('cf-region'),
    city: c.req.cf?.city || c.req.header('cf-ipcity'),
    region: c.req.cf?.colo || colo,
    latitude: c.req.cf?.latitude || c.req.header('cf-iplatitude'),
    longitude: c.req.cf?.longitude || c.req.header('cf-iplongitude'),
    asOrganization: c.req.cf?.asOrganization || c.req.header('x-asn'),
  }

  console.log("geo: ", geo);

  let routeData: OtherData = {
    name: "IP",
    title: "IP 定位信息",
    description: "查询访客请求的 IP 信息及大致地理信息",
    ...geo,
  };

  // const middlewareResponse = middleware(c.req);
  // const middlewareData = await middlewareResponse.json();

  // if (!geo.country || middlewareResponse || middlewareData) {
  //   console.log("middlewareResponse: ", middlewareResponse);
  //   routeData = {
  //     ...routeData,
  //     ...middlewareData,
  //   };
  // }

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

const middleware = (req: ExtendedHonoRequest ): Response => {
  const ip = ipAddress(req);
  const { pathname } = new URL(req.url);
  console.log("pathname: ", pathname);

  const geo = geolocation(req);
  console.log(geo);

  if (ip && geo) {
    return json({
      ip,
      ...geo
    });
  } else {
    return json({});
  }
}