import { config } from "../config.js";
import { stringify, parse } from "flatted";
import logger from "./logger.js";
import NodeCache from "node-cache";
import Redis from "ioredis";

interface CacheData {
  updateTime: string;
  data: unknown;
}

// init NodeCache
const cache = new NodeCache({
  stdTTL: config.CACHE_TTL,
  checkperiod: 600,
  useClones: false,
  maxKeys: 100,
});

// Redis 连接状态
let isRedisAvailable: boolean = false;
let redisConnectionAttempts: number = 0;
const MAX_REDIS_CONNECTION_ATTEMPTS = 5;

// init Redis client
const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    // 限制重试次数
    if (times >= MAX_REDIS_CONNECTION_ATTEMPTS) {
      logger.warn(`📦 [Redis] Maximum connection attempts (${MAX_REDIS_CONNECTION_ATTEMPTS}) reached. Giving up.`);
      return null; // 停止重试
    }
    const delay = Math.min(times * 100, 3000);
    logger.info(`📦 [Redis] Retrying connection in ${delay}ms (attempt ${times + 1}/${MAX_REDIS_CONNECTION_ATTEMPTS})`);
    return delay;
  },
  // 移除 lazyConnect，让连接立即建立
  lazyConnect: false,
  // 添加连接超时
  connectTimeout: 5000,
  // 添加命令超时
  commandTimeout: 3000,
});

// Redis 事件监听
redis.on("error", (err: Error) => {
  if (err.message.includes("ECONNREFUSED")) {
    redisConnectionAttempts++;
    logger.error(`📦 [Redis] Connection refused: ${err.message}`);
  } else {
    logger.error(`📦 [Redis] Error: ${err.message}`);
  }
});

redis.on("close", () => {
  isRedisAvailable = false;
  logger.info("📦 [Redis] Connection closed.");
});

redis.on("reconnecting", (time: number) => {
  logger.info(`📦 [Redis] Reconnecting in ${time}ms...`);
});

redis.on("ready", () => {
  isRedisAvailable = true;
  redisConnectionAttempts = 0; // 重置尝试次数
  logger.info("📦 [Redis] Connected successfully.");
});

redis.on("end", () => {
  isRedisAvailable = false;
  logger.info("📦 [Redis] Connection ended.");
});

// 初始化 Redis 连接
const initRedisConnection = async () => {
  try {
    // 如果已经连接或正在连接，不需要做任何事
    if (redis.status === "ready" || redis.status === "connecting") {
      logger.info(`📦 [Redis] Status: ${redis.status}`);
      return;
    }
    
    // 尝试连接
    await redis.connect();
    isRedisAvailable = true;
    logger.info("📦 [Redis] Connected successfully during initialization.");
  } catch (error) {
    isRedisAvailable = false;
    if (error instanceof Error) {
      // 忽略"已经连接"的错误，只记录其他错误
      if (!error.message.includes("already connecting/connected")) {
        logger.error(
          `📦 [Redis] Initial connection failed: ${error.message}`,
        );
      }
    }
  }
};

// 立即尝试连接 Redis
initRedisConnection().catch(() => {
  // 初始化连接失败，但应用可以继续运行
  logger.warn("📦 [Redis] Initial connection failed, but application will continue with NodeCache only.");
});

// NodeCache 事件监听
cache.on("expired", (key) => {
  logger.info(`⏳ [NodeCache] Key "${key}" has expired.`);
});

cache.on("del", (key) => {
  logger.info(`🗑️ [NodeCache] Key "${key}" has been deleted.`);
});

/**
 * 从缓存中获取数据
 * @param key 缓存键
 * @returns 缓存数据
 */
export const getCache = async (key: string): Promise<CacheData | undefined> => {
  // 如果 Redis 可用且未达到最大尝试次数，尝试从 Redis 获取
  if (isRedisAvailable && redisConnectionAttempts < MAX_REDIS_CONNECTION_ATTEMPTS) {
    try {
      const redisResult = await redis.get(key);
      if (redisResult) {
        logger.info(`💾 [Redis] Cache hit for key: ${key}`);
        return parse(redisResult) as CacheData;
      } else {
        logger.info(`💾 [Redis] Cache miss for key: ${key}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          `📦 [Redis] Get error: ${error.message}`,
        );
        // 只在特定错误类型下标记为不可用
        if (error.message.includes("ECONNREFUSED") || error.message.includes("Connection is closed")) {
          isRedisAvailable = false;
        }
      } else {
        logger.error(`📦 [Redis] Get error: Unknown error`);
      }
    }
  }
  
  // 回退到 NodeCache
  const nodeCacheResult = cache.get(key);
  if (nodeCacheResult) {
    logger.info(`💾 [NodeCache] Cache hit for key: ${key}`);
    // 类型断言，因为我们知道存入的是 CacheData 类型
    return nodeCacheResult as CacheData;
  } else {
    logger.info(`💾 [NodeCache] Cache miss for key: ${key}`);
    return undefined;
  }
};

/**
 * 将数据写入缓存
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 缓存过期时间（ 秒 ）
 * @returns 是否写入成功
 */
export const setCache = async (
  key: string,
  value: CacheData,
  ttl: number = config.CACHE_TTL,
): Promise<boolean> => {
  let redisSuccess = false;
  
  // 尝试写入 Redis（如果可用且未达到最大尝试次数）
  if (isRedisAvailable && redisConnectionAttempts < MAX_REDIS_CONNECTION_ATTEMPTS && !Buffer.isBuffer(value?.data)) {
    try {
      await redis.set(key, stringify(value), "EX", ttl);
      redisSuccess = true;
      logger.info(`💾 [Redis] Cache set for key: ${key}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          `📦 [Redis] Set error: ${error.message}`,
        );
        // 只在特定错误类型下标记为不可用
        if (error.message.includes("ECONNREFUSED") || error.message.includes("Connection is closed")) {
          isRedisAvailable = false;
        }
      } else {
        logger.error(`📦 [Redis] Set error: Unknown error`);
      }
    }
  }
  
  // 总是写入 NodeCache
  const nodeCacheSuccess = cache.set(key, value, ttl);
  if (nodeCacheSuccess) {
    logger.info(`💾 [NodeCache] Cache set for key: ${key}`);
  }
  
  return redisSuccess || nodeCacheSuccess;
};

/**
 * 从缓存中删除数据
 * @param key 缓存键
 * @returns 是否删除成功
 */
export const delCache = async (key: string): Promise<boolean> => {
  let redisSuccess = false;
  
  // 尝试从 Redis 删除（如果可用且未达到最大尝试次数）
  if (isRedisAvailable && redisConnectionAttempts < MAX_REDIS_CONNECTION_ATTEMPTS) {
    try {
      await redis.del(key);
      redisSuccess = true;
      logger.info(`🗑️ [Redis] ${key} has been deleted from Redis`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          `📦 [Redis] Del error: ${error.message}`,
        );
        // 只在特定错误类型下标记为不可用
        if (error.message.includes("ECONNREFUSED") || error.message.includes("Connection is closed")) {
          isRedisAvailable = false;
        }
      } else {
        logger.error(`📦 [Redis] Del error: Unknown error`);
      }
    }
  }
  
  // 总是从 NodeCache 删除
  const nodeCacheSuccess = cache.del(key) > 0;
  if (nodeCacheSuccess) {
    logger.info(`🗑️ [NodeCache] ${key} has been deleted from NodeCache`);
  }
  
  return redisSuccess || nodeCacheSuccess;
};