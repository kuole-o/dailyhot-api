import dotenv from "dotenv";

// 环境变量
dotenv.config();

export type Config = {
  PORT: number;
  DISALLOW_ROBOT: boolean;
  CACHE_TTL: number;
  REQUEST_TIMEOUT: number;
  ALLOWED_DOMAIN: string;
  ALLOWED_HOST: string;
  USE_LOG_FILE: boolean;
  RSS_MODE: boolean;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  ZHIHU_COOKIE: string;
  VERSION: string;
};

// 验证并提取环境变量
const getEnvVariable = (key: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined) return undefined;
  return value;
};

// 将环境变量转换为数值
const getNumericEnvVariable = (key: string, defaultValue: number): number => {
  const value = getEnvVariable(key) ?? String(defaultValue);
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) return defaultValue;
  return parsedValue;
};

// 将环境变量转换为布尔值
const getBooleanEnvVariable = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVariable(key);
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
};

// 分步骤创建配置对象
const PORT = getNumericEnvVariable("PORT", 6688);
const DISALLOW_ROBOT = getBooleanEnvVariable("DISALLOW_ROBOT", true);
const CACHE_TTL = getNumericEnvVariable("CACHE_TTL", 3600);
const REQUEST_TIMEOUT = getNumericEnvVariable("REQUEST_TIMEOUT", 10000);
const ALLOWED_DOMAIN = getEnvVariable("ALLOWED_DOMAIN") || "*";
const USE_LOG_FILE = Boolean(process.env.USE_LOG_FILE) || getBooleanEnvVariable("USE_LOG_FILE", true);
const ALLOWED_HOST = getEnvVariable("ALLOWED_HOST") || "guole.fun";
const RSS_MODE = getBooleanEnvVariable("RSS_MODE", false);
const REDIS_HOST = getEnvVariable("REDIS_HOST") || "127.0.0.1";
const REDIS_PORT = getNumericEnvVariable("REDIS_PORT", 6379);
const REDIS_PASSWORD = getEnvVariable("REDIS_PASSWORD") || "";
const ZHIHU_COOKIE = getEnvVariable("ZHIHU_COOKIE") || "";
const VERSION = getEnvVariable("APP_VERSION") || "";

// 创建配置对象
export const config: Config = {
  PORT,
  DISALLOW_ROBOT,
  CACHE_TTL,
  REQUEST_TIMEOUT,
  ALLOWED_DOMAIN,
  USE_LOG_FILE,
  ALLOWED_HOST,
  RSS_MODE,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  ZHIHU_COOKIE,
  VERSION,
};