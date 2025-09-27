import type { OtherData, ListContext } from '../types.js';
import { HttpError } from '../utils/errors.js';
import { createDefaultClient, type BBTalkContent } from '../utils/leancloud-client.js';

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    let page: number;
    let limit: number;
    let type: string | undefined;

    // 解析请求参数
    if (c.req.method == 'GET') {
      page = c.req.query('page') ? Number(c.req.query('page')) : 1;
      limit = c.req.query('limit') ? Number(c.req.query('limit')) : 10;
      type = c.req.query('type') ? c.req.query('type') : '';
    } else if (c.req.method == 'POST') {
      const body = await c.req.json();
      limit = body.limit ? Number(body.limit) : 10;
      page = body.page ? Number(body.page) : 1;
      type = body.type ? String(body.type) : '';
    } else {
      throw new HttpError(405, 'Method Not Allowed');
    }

    // 使用环境变量创建 LeanCloud 客户端
    const client = createDefaultClient();

    // 查询数据（LeanCloudClient 内部处理缓存）
    const { results, totalCount, fromCache } = await client.queryContentPublic({
      page,
      limit,
      descending: true,
      useCache: !noCache, // 根据 noCache 参数决定是否使用缓存
      cacheKey: `bbtalk:page${page}:limit${limit}:type${type || 'default'}`,
      ttl: 3 * 60 * 1000 // 3分钟缓存
    });

    // 格式化返回数据
    let data;
    if (type && type === 'all') {
      data = results.map((item: BBTalkContent) => ({
        createdAt: item.createdAt,
        content: item.content,
        from: item.from,
        MsgType: item.MsgType,
        other: item.other,
        objectId: item.objectId,
        url: `https://blog.guole.fun/bb#${item.objectId}`,
        mobileUrl: `https://blog.guole.fun/bb#${item.objectId}`
      }));
    } else {
      data = results.map((item: BBTalkContent) => ({
        createdAt: item.createdAt,
        content: item.content,
        from: item.from,
        MsgType: item.MsgType
      }));
    }

    // 构建响应数据
    const routeData: OtherData = {
      name: 'BBtalk',
      title: '哔哔闪念',
      type: '最新动态',
      link: 'https://blog.guole.fun/bb',
      total: data.length,
      updateTime: new Date().toISOString(),
      fromCache,
      data,
    };

    return routeData;
  } catch (error) {
    // 统一错误处理
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new HttpError(500, `获取 BBTalk 数据失败: ${errorMessage}`);
  }
};