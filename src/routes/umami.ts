import type { OtherData, ListContext, Options } from "../types.js";
import { get } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";

const ttl = 60*60*1000;

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const token = process.env.UMAMI_TOKEN || c.req.header('Authorization') || '';

  console.log("token: ", token)

  const siteId = c.req.query('siteId') || '';
  const startAt = c.req.query('startAt') || '';
  const endAt = c.req.query('endAt') || '';
  const unit = c.req.query('unit') || 'hour';
  const timezone = c.req.query('timezone') || 'Asia%2FShanghai';
  const compare = c.req.query('compare') || 'false';
  const limit = c.req.query('limit') || '10';
  const type = c.req.query('type') || 'os';

  if (!siteId || !startAt || !endAt) {
    throw new HttpError(400, '获取 Umami 数据发生错误，请检查参数 siteId / startAt / endAt 是否正确。');
  }

  const listData = await getList(noCache, token, siteId, startAt, endAt, unit, timezone, compare, limit, type);
  const routeData: OtherData = {
    name: "Umami",
    title: "网站统计",
    description: "查询 Umami 网站统计数据",
    count: {
      os: listData.data.os?.length || 0,
      browser: listData.data.browser?.length || 0,
      country: listData.data.country?.length || 0,
      stats: Object.keys(listData.data.stats).length || 0,
    },
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean, token: string, siteId: string, startAt: string, endAt: string, unit: string, timezone: string, compare: string, limit: string, type: string) => {
  const url = `https://umami.guole.fun/api/websites/${siteId}/getWebsiteMetrics`;
  const result = await get({
    url,
    headers: {
      'Authorization': token,
    },
    params: {
      startAt: startAt,
      endAt: endAt,
      unit: unit,
      timezone: timezone,
      compare: compare,
      limit: limit,
      type: type,
    },
    noCache,
    ttl
  });
  const list = result.data;

  if (!result || !result.data) {
    return {
      ...result,
      data: [],
    };
  }
  return {
    ...result,
    data: list,
  };
};