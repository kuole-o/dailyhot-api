import type { RouterData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    let page: string;
    let limit: string;
    let type: string;
    if (c.req.method == "GET") {
      page = c.req.query("page") ? c.req.query("page") : "1";
      limit = c.req.query("limit") ? c.req.query("limit") : "10";
      type = c.req.query("type") ? c.req.query("type") : "1";
    } else if (c.req.method == "POST") {
      const body = await c.req.parseBody();
      limit = typeof body.limit === 'string' ? body.limit : "10";
      page = typeof body.page === 'string' ? body.page : "1";
      type = typeof body.type === 'string' ? body.type : "1";
    } else {
      throw new HttpError(405, 'Method Not Allowed');
    }

    const { fromCache, data, updateTime } = await getList({
      page: page.toString(),
      limit: limit.toString(),
      type: type.toString()
  }, noCache);

    const routeData: RouterData = {
      name: "BBtalk",
      title: "哔哔闪念",
      type: "最新动态",
      link: "https://blog.guole.fun/bb",
      total: data?.length || 0,
      updateTime,
      fromCache,
      data,
    };
    return routeData;
  } catch (error) {
    throw error;
  }
};

const getList = async ({ page, limit, type }: Options, noCache: boolean) => {
  try {
    const pageNumber = parseInt(page as string) || 1;
    const limitNumber = parseInt(limit as string) || 10;
    const typeNumber = type || "1";

    const url = `https://leancloud.guole.fun/1.1/classes/content?limit=${limitNumber}&skip=${(pageNumber - 1) * limitNumber}&order=-createdAt&count=1`;
    const result = await get({
      url,
      noCache,
      headers: {
        'X-LC-Id': process.env.LEANCLOUD_APPID,
        'X-LC-Key': process.env.LEANCLOUD_APPKEY,
        'Content-Type': 'text/html;charset=utf-8'
      },
    });
    const data = result.data;
    if (typeNumber == 1) {
      return {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data: data.results.map((item: RouterType["BBtalk"]) => ({
          time: item.createdAt,
          content: item.content,
          from: item.from,
          MsgType: item.MsgType,
          other: item.other,
          objectId: item.objectId,
        })),
      };
    } else {
      return {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data: data.results.map((item: RouterType["BBtalk"]) => ({
          time: item.createdAt,
          content: item.content,
        })),
      }
    };
  } catch (error) {
    throw error;
  }
};