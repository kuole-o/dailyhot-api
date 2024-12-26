import type { OtherData, ListContext, Options  } from "../types.js";
import { get } from "../utils/getData.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const token = process.env.UMAMI_TOKEN || c.req.header('Authorization') || '';

  console.log("token: ",token)

  const siteId = c.req.query('siteId') || '';
  const startAt = c.req.query('startAt') || '';
  const endAt = c.req.query('endAt') || '';
  const unit = c.req.query('unit') || '';
  const timezone = c.req.query('timezone') || '';
  const compare = c.req.query('compare') || '';
  const limit = c.req.query('limit') || '10';
  const type = c.req.query('type') || '';

  const listData = await getList(noCache, token, siteId, startAt, endAt, unit, timezone, compare, limit, type );
  const routeData: OtherData = {
    name: "Umami",
    title: "网站统计",
    description: "查询 Umami 网站统计数据",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean, token: string, siteId: string, startAt: string, endAt: string, unit: string, timezone: string, compare: string, limit: string, type: string ) => {
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
    ttl: 1000
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