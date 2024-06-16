import type { RouterData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { post } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";

// 处理 /newbbtalk 路由
export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    let from: string;
    let content: string;
    const appId: string = c.req.header("X-LC-Id");
    const appKey: string = c.req.header("X-LC-Key");

    if (!appId || !appKey) {
      throw new HttpError(401, '访问未经授权');
    }

    if (c.req.method == "POST") {
      const body = await c.req.parseBody();
      if (typeof body.from === 'string' && typeof body.content === 'string' ) {
        from = body.from;
        content = body.content;
      } else {
        throw new HttpError(500, 'POST 调用参数不合法');
      }
    } else {
      throw new HttpError(405, 'Method Not Allowed');
    }

    const body = JSON.stringify({ from, content });
    const { fromCache, data, updateTime, status } = await getList({ body, appId, appKey });
    const response: Response = {
      code: status,
      message: "哔哔成功",
      objectId: data.objectId,
      createdAt: data.createdAt,
    }
    return response;
  } catch (error) {
    throw new HttpError(500, '服务器内部错误，获取 body 参数失败');
  }
};

const getList = async ({ body, appId, appKey }: Options) => {
  try {
    const noCache: boolean = false;
    // 调用 LeanCloud API 提交新数据
    const url = 'https://leancloud.guole.fun/1.1/classes/content';
    const result = await post({
      url,
      headers: {
        'X-LC-Id': appId,
        'X-LC-Key': appKey,
        'Content-Type': 'application/json'
      },
      body: body,
      noCache,
    });
    return result;
  } catch (error) {
    throw error;
  }
};