import type { OtherData, ListContext, Options } from "../types.js";
import { post } from '../utils/getData.js';
import { HttpError } from "../utils/errors.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  console.log("请求方式： ", c.req.method)
  if (c.req.method !== 'POST') {
    throw new HttpError(405, 'Method Not Allowed');
  }

  const body = await c.req.json();
  console.log("body: ",body)

  const key = c.req.header("X-API-Token") || body.key || c.req.query("key") || '';
  const content: string = body?.content ? body?.content : '';

  console.log("key: ",key)
  console.log("content: ",content)

  if (!key && !content) {
    throw new HttpError(400, '缺少必要参数：token / content');
  }

  const res = await wecomBot(key, content);

  const routeData: OtherData = {
    code: res?.errcode,
    msg: res?.errmsg
  };

  return routeData;
};


const wecomBot = async (key: string, content: string) => {
  try {
    const noCache = false;
    const url = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`;

    const result = await post({
      url,
      noCache,
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: {
        msgtype: 'text',
        text: {
          content: content,
        }
      }
    });
    const data = result.data;

    return {
      errcode: data.errcode, 
      errmsg: data.errmsg
    }
  } catch (error) {
    throw error;
  }
}