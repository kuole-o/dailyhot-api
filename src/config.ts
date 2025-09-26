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
  QINIU_ACCESS_KEY: string;
  QINIU_SECRET_KEY: string;
  WEBDAV_SERVER: string;
  WEBDAV_USERNAME: string;
  WEBDAV_PASSWORD: string;
  WEBDAV_CERT_PATH: string;
  CERT_FILE_NAME: string;
  KEY_FILE_NAME: string;
  SSL_SECRET_KEY: string;
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
const QINIU_ACCESS_KEY = getEnvVariable("QINIU_ACCESS_KEY") || "";
const QINIU_SECRET_KEY = getEnvVariable("QINIU_SECRET_KEY") || "";
const WEBDAV_SERVER = getEnvVariable("WEBDAV_SERVER") || "http://192.168.3.1:18800";
const WEBDAV_USERNAME = getEnvVariable("WEBDAV_USERNAME") || "";
const WEBDAV_PASSWORD = getEnvVariable("WEBDAV_PASSWORD") || "";
const WEBDAV_CERT_PATH = getEnvVariable("WEBDAV_CERT_PATH") || "/";
const CERT_FILE_NAME = getEnvVariable("CERT_FILE_NAME") || "guole.fun.pem";
const KEY_FILE_NAME = getEnvVariable("KEY_FILE_NAME") || "guole.fun.key";
const SSL_SECRET_KEY = getEnvVariable("SSL_SECRET_KEY") || "";

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
  QINIU_ACCESS_KEY,
  QINIU_SECRET_KEY,
  WEBDAV_SERVER,
  WEBDAV_USERNAME,
  WEBDAV_PASSWORD,
  WEBDAV_CERT_PATH,
  CERT_FILE_NAME,
  KEY_FILE_NAME,
  SSL_SECRET_KEY,
};

// 导出 SSL 配置接口和获取函数（可选）
export interface SSLConfig {
  accessKey: string;
  secretKey: string;
  webdav: {
    server: string;
    username: string;
    password: string;
    certPath: string;
  };
  certFileName: string;
  keyFileName: string;
}

export const getSSLConfig = (): SSLConfig => ({
  accessKey: config.QINIU_ACCESS_KEY,
  secretKey: config.QINIU_SECRET_KEY,
  webdav: {
    server: config.WEBDAV_SERVER,
    username: config.WEBDAV_USERNAME,
    password: config.WEBDAV_PASSWORD,
    certPath: config.WEBDAV_CERT_PATH
  },
  certFileName: config.CERT_FILE_NAME,
  keyFileName: config.KEY_FILE_NAME
});