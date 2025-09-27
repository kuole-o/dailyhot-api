import type { ListContext } from "../types.js";
import { HttpError } from "../utils/errors.js";
import { LeanCloudClient } from "../utils/leancloud-client.js";
import { BBTalkUploader } from "./upload-bbtalk-json.js";

type Response = {
  code: number;
  message: string;
  objectId: string;
  createdAt: string;
};

// 处理 /newbbtalk 路由
export const handleRoute = async (c: ListContext, noCache: boolean) => {
  let from: string;
  let content: string;

  // 从请求头获取 LeanCloud 凭证（严禁使用环境变量）
  const appId: string | undefined = c.req.header("X-LC-Id");
  const appKey: string | undefined = c.req.header("X-LC-Key");

  // 验证凭证类型和存在性
  if (typeof appId !== 'string' || typeof appKey !== 'string') {
    throw new HttpError(400, '访问未经授权 - 缺少必要凭证');
  } else if (!appId || !appKey) {
    throw new HttpError(401, '访问未经授权 - 缺少必要凭证');
  }

  // 解析请求体
  if (c.req.method == "POST") {
    let body: any;
    const contentType = c.req.header('Content-Type') || '';
    // 根据 Content-Type 选择合适的解析方法
    if (contentType.includes('application/json')) {
      // JSON 格式请求体
      body = await c.req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')) {
      // 表单格式请求体
      body = await c.req.parseBody();
    } else {
      // 默认尝试 JSON，如果失败尝试表单
      try {
        body = await c.req.json();
      } catch (jsonError) {
        body = await c.req.parseBody();
      }
    }

    if (typeof body.from === 'string' && typeof body.content === 'string') {
      from = body.from;
      content = body.content;
    } else {
      throw new HttpError(400, 'POST 调用参数不合法');
    }
  } else {
    throw new HttpError(405, 'Method Not Allowed');
  }

  try {
    // 使用请求头中的凭证创建 LeanCloud 客户端
    const client = new LeanCloudClient(appId, appKey);

    // 调用 LeanCloud 创建新数据（不缓存结果）
    const { objectId, createdAt } = await client.createContent({ from, content });

    // 创建成功后，调用上传接口更新 JSON 文件
    await triggerBBTalkJsonUpdate();

    // 构建响应
    const response: Response = {
      code: 200,
      message: "哔哔成功",
      objectId,
      createdAt,
    };

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new HttpError(500, `创建 BBTalk 内容失败: ${errorMessage}`);
  }
};

// 触发 BBTalk JSON 文件更新
const triggerBBTalkJsonUpdate = async (): Promise<void> => {
  try {
    // 创建上传器实例（使用环境变量凭证）
    const uploader = new BBTalkUploader();

    // 调用上传方法更新所有分页数据
    await uploader.uploadBBTalkData({
      isRecursive: true, // 递归更新所有分页
      overwrite: true    // 覆盖已存在的文件
    });

    console.log('BBTalk JSON 文件更新成功');
  } catch (error) {
    console.error('触发 BBTalk JSON 更新失败:', error);
    // 这里不抛出错误，因为主要内容创建已经成功，JSON 更新是辅助操作
    // 可以记录日志但不影响主流程
  }
};