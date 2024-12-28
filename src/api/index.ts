import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../app.js";

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 构造 Request 对象给 Hono
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: ["GET", "HEAD"].includes(req.method ?? "") ? null : (req.body as any),
    });

    // 交给 Hono 处理
    const honoResponse = await app.fetch(request);

    // 把 Hono 的 Response 映射回 Vercel 响应
    res.statusCode = honoResponse.status;
    honoResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // 解析 Body 并返回
    const ab = await honoResponse.arrayBuffer();
    res.send(Buffer.from(ab));
  } catch (error) {
    // 如果出错，返回 500
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).send(message);
  }
}