import type { RouterData, ListContext, Options } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get, post } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";

type Response = {
  code: number;
  message: string;
  objectId: string;
  createdAt: string;
};

const noCache: boolean = false;

// 处理 /newbbtalk 路由
export const handleRoute = async (c: ListContext, noCache: boolean) => {
  let from: string;
  let content: string;
  const appId: string = c.req.header("X-LC-Id");
  const appKey: string = c.req.header("X-LC-Key");

  if (!appId || !appKey) {
    throw new HttpError(401, '访问未经授权');
  }

  if (c.req.method == "POST") {
    const body = await c.req.parseBody();
    if (typeof body.from === 'string' && typeof body.content === 'string') {
      from = body.from;
      content = body.content;
    } else {
      throw new HttpError(500, 'POST 调用参数不合法');
    }
  } else {
    throw new HttpError(405, 'Method Not Allowed');
  }

  const body = JSON.stringify({ from, content });
  const { fromCache, data, updateTime } = await getList({ body, appId, appKey });
  const response: Response = {
    code: (data as any).status as number,
    message: "哔哔成功",
    objectId: (data as any).objectId as string,
    createdAt: (data as any).createdAt as string,
  }
  return response;
};

const getList = async ({ body, appId, appKey }: Options) => {
  try {
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
    await notifyCosFileUpdate();
    return result;
  } catch (error) {
    throw error;
  }
};

const notifyCosFileUpdate = async () => {
  try {
    const url = process.env.BBtalk_Upload_Url;
    const upload_response = await get({
      url,
      noCache,
      headers: {
        "token": process.env.token,
      },
    });
    return upload_response;
  } catch (error) {
    throw new HttpError(500, '通知 cos 更新 json 失败');
  }
}