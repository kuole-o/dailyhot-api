import type { RouterData, ListContext, Options } from '../types.js';
import type { RouterType } from '../router.types.js';
import { get } from '../utils/getData.js';
import { HttpError } from '../utils/errors.js';

const ttl = 3 * 60 * 1000;

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    let page: number;
    let limit: number;
    let type: string | undefined;
    if (c.req.method == 'GET') {
      page = c.req.query('page') ? Number(c.req.query('page')) : 1;
      limit = c.req.query('limit') ? Number(c.req.query('limit')) : 10;
      type = c.req.query('type') ? c.req.query('type') : '';
    } else if (c.req.method == 'POST') {
      const body = await c.req.parseBody();
      limit = body.limit ? Number(body.limit) : 10;
      page = body.page ? Number(body.page) : 1;
      type = body.type ? String(body.type) : '';
    } else {
      throw new HttpError(405, 'Method Not Allowed');
    }

    const { fromCache, data, updateTime } = await getList(page, limit, type, noCache);

    const routeData: RouterData = {
      name: 'BBtalk',
      title: '哔哔闪念',
      type: '最新动态',
      link: 'https://blog.guole.fun/bb',
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

const getList = async (page: number, limit: number, type: string | undefined, noCache: boolean) => {
  try {
    const url = `https://leancloud.guole.fun/1.1/classes/content?limit=${limit}&skip=${(page - 1) * limit}&order=-createdAt&count=1`;
    const result = await get({
      url,
      headers: {
        'X-LC-Id': process.env.LEANCLOUD_APPID || '',
        'X-LC-Key': process.env.LEANCLOUD_APPKEY || '',
        'Content-Type': 'text/html;charset=utf-8'
      },
      noCache,
      ttl
    });
    const data = result.data;

    if (type && type === 'all') {
      return {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data: data.results.map((item: RouterType['BBtalk']) => ({
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
        data: data.results.map((item: RouterType['BBtalk']) => ({
          time: item.createdAt,
          content: item.content,
        })),
      }
    };
  } catch (error) {
    throw error;
  }
};