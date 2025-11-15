import { createHash } from 'crypto';
import logger from './logger.js';

export interface CacheKeyOptions {
  maxKeyLength?: number;
  maxDataLength?: number;
  maxParamsCount?: number;
  enableHashFallback?: boolean;
}

const DEFAULT_OPTIONS: CacheKeyOptions = {
  maxKeyLength: 500,
  maxDataLength: 10000, // 10KB
  maxParamsCount: 50,
  enableHashFallback: true
};

/**
 * 生成安全的缓存键，防止恶意攻击
 */
export const generateSecureCacheKey = (
  method: string, 
  url: string, 
  data?: any,
  options: CacheKeyOptions = {}
): string => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const base = `${method.toUpperCase()}:${url}`;
  
  if (!data) {
    return base;
  }
  
  // 安全检查
  if (!passSecurityCheck(data, opts)) {
    const hash = generateDataHash(data);
    logger.warn(`🚨 [CACHE SECURITY] Security check failed, using hash: ${base}:HASH:${hash}`);
    return `${base}:HASH:${hash}`;
  }
  
  // 正常处理
  const normalizedData = normalizeData(data);
  const dataString = stringifyNormalizedData(normalizedData);
  const fullKey = `${base}:${dataString}`;
  
  // 最终长度检查
  if (fullKey.length > opts.maxKeyLength!) {
    const hash = generateDataHash(data);
    logger.warn(`🚨 [CACHE SECURITY] Key too long, using hash: ${fullKey.length} chars`);
    return `${base}:HASH:${hash}`;
  }
  
  return fullKey;
};

/**
 * 安全检查
 */
const passSecurityCheck = (data: any, options: CacheKeyOptions): boolean => {
  // 长度检查
  if (typeof data === 'string' && data.length > options.maxDataLength!) {
    return false;
  }
  
  if (typeof data === 'object') {
    const dataString = JSON.stringify(data);
    if (dataString.length > options.maxDataLength!) {
      return false;
    }
    
    // 参数数量检查
    const paramCount = countObjectKeys(data);
    if (paramCount > options.maxParamsCount!) {
      return false;
    }
  }
  
  return true;
};

/**
 * 生成数据哈希
 */
const generateDataHash = (data: any): string => {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('md5').update(dataString).digest('hex').substring(0, 16);
};

/**
 * 计算对象键数量（递归）
 */
const countObjectKeys = (obj: any): number => {
  if (typeof obj !== 'object' || obj === null) return 0;
  
  let count = Object.keys(obj).length;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      count += countObjectKeys(obj[key]);
    }
  }
  return count;
};

/**
 * 标准化数据
 */
const normalizeData = (data: any): any => {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return normalizeObject(parsed);
    } catch {
      return data;
    }
  }
  
  if (Array.isArray(data)) {
    return data.map(item => normalizeData(item));
  }
  
  if (data && typeof data === 'object') {
    return normalizeObject(data);
  }
  
  return data;
};

/**
 * 标准化对象
 */
const normalizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sortedObj: Record<string, any> = {};
  
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sortedObj[key] = normalizeData(obj[key]);
    });
  
  return sortedObj;
};

/**
 * 序列化标准化数据
 */
const stringifyNormalizedData = (data: any): string => {
  if (typeof data === 'string') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return `[${data.map(item => stringifyNormalizedData(item)).join(',')}]`;
  }
  
  if (data && typeof data === 'object') {
    const entries = Object.entries(data)
      .map(([key, value]) => `${key}=${stringifyNormalizedData(value)}`);
    return `{${entries.join('&')}}`;
  }
  
  return String(data);
};

/**
 * 估算数据大小
 */
export const estimateDataSize = (data: any): number => {
  if (!data) return 0;
  return Buffer.byteLength(JSON.stringify(data), 'utf8');
};

/**
 * 验证请求参数
 */
export const validateRequestParams = (params: any, body: any): { valid: boolean; reason?: string } => {
  const MAX_REQUEST_SIZE = 50000; // 50KB
  
  const paramsSize = estimateDataSize(params);
  const bodySize = estimateDataSize(body);
  const totalSize = paramsSize + bodySize;
  
  if (totalSize > MAX_REQUEST_SIZE) {
    return {
      valid: false,
      reason: `Request data too large: ${totalSize} bytes (max: ${MAX_REQUEST_SIZE})`
    };
  }
  
  return { valid: true };
};