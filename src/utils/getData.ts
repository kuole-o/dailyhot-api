import type { Get, Post, Response } from "../types.js";
import { config } from "../config.js";
import { getCache, setCache, delCache } from "./cache.js";
import logger from "./logger.js";
import axios from "axios";
import { 
  generateSecureCacheKey, 
  validateRequestParams 
} from './cacheSecurity.js';

// 基础配置
const request = axios.create({
  // 请求超时设置
  timeout: config.REQUEST_TIMEOUT,
  withCredentials: true,
});

// 请求拦截
request.interceptors.request.use(
  (request) => {
    if (!request.params) request.params = {};
    // 发送请求
    return request;
  },
  (error) => {
    logger.error("❌ [ERROR] request failed");
    return Promise.reject(error);
  },
);

// 响应拦截
request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 继续传递错误
    return Promise.reject(error);
  },
);

// 详细的错误日志函数
const logAxiosError = (error: any, method: string, url: string) => {
  if (axios.isAxiosError(error)) {
    logger.error(`❌ [AXIOS ERROR] ${method} ${url} 失败`);

    // 请求配置信息
    if (error.config) {
      logger.error(`🔧 [请求配置] URL: ${error.config.url}`);
      logger.error(`🔧 [请求配置] 方法: ${error.config.method}`);
      logger.error(`🔧 [请求配置] 超时: ${error.config.timeout}ms`);
      if (error.config.headers) {
        logger.error(`🔧 [请求头] ${JSON.stringify(error.config.headers, null, 2)}`);
      }
    }

    // 响应信息
    if (error.response) {
      logger.error(`📡 [响应状态] ${error.response.status} ${error.response.statusText}`);
      logger.error(`📡 [响应头] ${JSON.stringify(error.response.headers, null, 2)}`);
      if (error.response.data) {
        logger.error(`📡 [响应数据] ${JSON.stringify(error.response.data, null, 2)}`);
      }
    } else if (error.request) {
      logger.error(`📡 [无响应] 请求已发送但未收到响应`);
      logger.error(`📡 [请求对象] ${error.request}`);
    }

    // 错误消息
    logger.error(`💥 [错误消息] ${error.message}`);

    // 错误代码
    if (error.code) {
      logger.error(`🔢 [错误代码] ${error.code}`);
    }
  } else {
    // 非 Axios 错误
    logger.error(`❌ [NON-AXIOS ERROR] ${method} ${url} 失败:`, error);
  }
};

// GET
export const get = async (options: Get): Promise<Response> => {
  const {
    url,
    headers,
    params,
    noCache,
    ttl = config.CACHE_TTL,
    originaInfo = false,
    responseType = "json",
  } = options;

  const validation = validateRequestParams(params, null);
  if (!validation.valid) {
    logger.error(`🚨 [REQUEST SECURITY] ${validation.reason}`);
    throw new Error(validation.reason);
  }

  logger.info(`🌐 [GET] ${url}${noCache ? ' (no-cache)' : ''}`);

  try {
    // 使用改进的缓存键生成方法
    const cacheKey = generateSecureCacheKey('GET', url, params);

    // 记录完整的缓存键用于调试
    logger.debug(`🔑 [CACHE KEY] ${cacheKey}`);

    // 如果不强制刷新缓存，先检查缓存
    if (!noCache) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.debug("💾 [CACHE] The request is cached");

        const cacheHeaders: Record<string, any> = {
          'x-cache': 'HIT',
          'x-cache-time': cachedData.updateTime,
          'content-type': 'application/json',
          ...cachedData.originalHeaders // 合并原始headers（如果存在）
        };

        return {
          fromCache: true,
          updateTime: cachedData.updateTime,
          data: cachedData.data,
          status: cachedData.originalStatus || 200,
          headers: cacheHeaders
        };
      }
    }

    // 缓存不存在或强制刷新时请求接口
    const response = await request.get(url, { headers, params, responseType });
    const responseData = response?.data || response;

    logger.debug(`GET ${url} response: ${responseData}`);

    // 存储新获取的数据到缓存
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;

    await setCache(cacheKey, {
      data,
      updateTime,
      originalStatus: response.status,
      originalHeaders: response.headers
    }, ttl);

    logger.info(`✅ [${response?.status}] request was successful`);

    // 返回数据
    return {
      fromCache: false,
      updateTime,
      data,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    logAxiosError(error, 'GET', url);
    throw error;
  }
};

// POST
export const post = async (options: Post): Promise<Response> => {
  const { url, headers, body, noCache, ttl = config.CACHE_TTL, originaInfo = false } = options;

  const validation = validateRequestParams(null, body);
  if (!validation.valid) {
    logger.error(`🚨 [REQUEST SECURITY] ${validation.reason}`);
    throw new Error(validation.reason);
  }

  logger.info(`🌐 [POST] ${url}${noCache ? ' (no-cache)' : ''}`);

  try {
    // 使用改进的缓存键生成方法
    const cacheKey = generateSecureCacheKey('POST', url, body);

    // 记录完整的缓存键用于调试
    logger.debug(`🔑 [CACHE KEY] ${cacheKey}`);

    // 处理请求体，确保传递给 axios 的格式正确
    let requestBody = body;
    if (typeof body === 'string') {
      try {
        // 如果是 JSON 字符串，解析为对象供 axios 使用
        requestBody = JSON.parse(body);
      } catch {
        // 如果不是 JSON，保持原样
        requestBody = body;
      }
    }

    // 如果不强制刷新缓存，先检查缓存
    if (!noCache) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.debug("💾 [CACHE] The request is cached");

        const cacheHeaders: Record<string, any> = {
          'x-cache': 'HIT',
          'x-cache-time': cachedData.updateTime,
          'content-type': 'application/json',
          ...cachedData.originalHeaders // 合并原始headers（如果存在）
        };

        return {
          fromCache: true,
          updateTime: cachedData.updateTime,
          data: cachedData.data,
          status: cachedData.originalStatus || 200,
          headers: cacheHeaders
        };
      }
    }

    // 缓存不存在时请求接口
    const response = await request.post(url, body, { headers });
    const responseData = response?.data || response;

    logger.debug(`POST ${url} response: ${responseData}`);

    // 存储新获取的数据到缓存
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;

    await setCache(cacheKey, {
      data,
      updateTime,
      originalStatus: response.status,
      originalHeaders: response.headers
    }, ttl);

    logger.info(`✅ [${response?.status}] request was successful`);

    // 返回数据
    return {
      fromCache: false,
      updateTime,
      data,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    logAxiosError(error, 'POST', url);
    throw error;
  }
};

// PUT 请求 - 不需要缓存
export const put = async (options: Post): Promise<Response> => {
  const { url, headers, body, noCache, ttl = config.CACHE_TTL, originaInfo = false } = options;

  logger.info(`🌐 [PUT] ${url}`);

  try {
    // PUT请求不检查缓存，直接发送请求
    const response = await request.put(url, body, { headers });
    const responseData = response?.data || response;

    // 存储新获取的数据到缓存（如果明确不需要缓存则跳过）
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;

    logger.info(`✅ [${response?.status}] PUT request was successful`);

    // 返回数据
    return {
      fromCache: false,
      updateTime,
      data,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    logAxiosError(error, 'PUT', url);
    throw error;
  }
};

export const del = async (options: Omit<Get, 'params'> & { body?: any }): Promise<Response> => {
  const { url, headers, body, noCache, originaInfo = false } = options;

  logger.info(`🌐 [DELETE] ${url}`);

  try {
    // DELETE 请求不检查缓存，直接发送请求
    const response = await request.delete(url, {
      headers,
      data: body
    });

    const responseData = response?.data || response;
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;

    logger.info(`✅ [${response?.status}] DELETE request was successful`);

    // DELETE 操作不缓存响应数据
    return {
      fromCache: false,
      updateTime,
      data,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    logAxiosError(error, 'DELETE', url);
    throw error;
  }
};

export const cleanPostContent = (postContent: string, maxWords: number = 600): string => {
  const text = postContent.replace(/<[^>]*>/g, ''); // 去除 HTML 标签
  const cleanedText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(); // 去除换行符和多余空格
  const words = cleanedText.split(' '); // 按空格分割成单词

  if (words.length <= maxWords) {
    return cleanedText;
  }
  return words.slice(0, maxWords).join(' ') + '...';
}