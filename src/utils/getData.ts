import type { Get, Post, Response } from "../types.js";
import { config } from "../config.js";
import { getCache, setCache, delCache } from "./cache.js";
import logger from "./logger.js";
import axios from "axios";

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
  logger.info(`🌐 [GET] ${url}`);
  try {
    // 构造包含请求参数的缓存键，确保缓存内容与请求内容相符
    const cacheKey = params && Object.keys(params).length > 0
      ? `${url}?${new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString()}`
      : url;
    // 检查缓存
    if (noCache) await delCache(cacheKey);
    else {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.debug("💾 [CHCHE] The request is cached");
        return {
          fromCache: true,
          updateTime: cachedData.updateTime,
          data: cachedData.data,
          status: undefined,
          headers: undefined
        };
      }
    }
    // 缓存不存在时请求接口
    const response = await request.get(url, { headers, params, responseType });

    logger.debug(`GET ${url} response: ${response}`);

    const responseData = response?.data || response;
    // 存储新获取的数据到缓存
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;
    await setCache(cacheKey, { data, updateTime }, ttl);
    // 返回数据
    logger.info(`✅ [${response?.status}] request was successful`);
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
  logger.info(`🌐 [POST] ${url}`);
  try {
    // 构造包含请求参数的缓存键，确保缓存内容与请求内容相符
    const cacheKey = body && Object.keys(body).length > 0
      ? `${url}?${new URLSearchParams(
        Object.entries(body).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString()}`
      : url;
    // 检查缓存
    if (noCache) await delCache(cacheKey);
    else {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.debug("💾 [CHCHE] The request is cached");
        return {
          fromCache: true,
          updateTime: cachedData.updateTime,
          data: cachedData.data,
          status: undefined,
          headers: undefined
        };
      }
    }
    // 缓存不存在时请求接口
    const response = await request.post(url, body, { headers });
    const responseData = response?.data || response;
    // 存储新获取的数据到缓存
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;
    if (!noCache) {
      await setCache(cacheKey, { data, updateTime }, ttl);
    }
    // 返回数据
    logger.info(`✅ [${response?.status}] request was successful`);
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
    // 构造包含请求参数的缓存键
    const cacheKey = body && Object.keys(body).length > 0
      ? `${url}?${new URLSearchParams(
        Object.entries(body).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString()}`
      : url;

    // 检查缓存，PUT操作不需要缓存
    if (noCache) await delCache(cacheKey);

    // PUT请求不检查缓存，直接发送请求
    const response = await request.put(url, body, { headers });
    const responseData = response?.data || response;

    // 存储新获取的数据到缓存（如果明确不需要缓存则跳过）
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;

    // PUT操作通常不缓存，但根据noCache参数决定
    if (!noCache) {
      await setCache(cacheKey, { data, updateTime }, ttl);
    }

    // 返回数据
    logger.info(`✅ [${response?.status}] PUT request was successful`);
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
    const cacheKey = url;

    if (noCache) await delCache(cacheKey);

    const response = await request.delete(url, {
      headers,
      data: body
    });

    const responseData = response?.data || response;
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;

    logger.info(`✅ [${response?.status}] DELETE request was successful`);
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