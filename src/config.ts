import dotenv from "dotenv";

// 环境变量
dotenv.config();

export type Config = {
  PORT: number;
  DISALLOW_ROBOT: boolean;
  CACHE_TTL: number;
  REQUEST_TIMEOUT: number;
  ALLOWED_DOMAIN: string;
  USE_LOG_FILE: boolean;
  RSS_MODE: boolean;
};

// 验证并提取环境变量
const getEnvVariable = (key: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined) {
    return null;
  }
  return value;
};

// 将环境变量转换为数值
const getNumericEnvVariable = (key: string, defaultValue: number): number => {
  const value = getEnvVariable(key) ?? String(defaultValue);
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    return defaultValue;
  }
  return parsedValue;
};

// 将环境变量转换为布尔值
const getBooleanEnvVariable = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVariable(key) ?? String(defaultValue);
  return value.toLowerCase() === "true";
};

// 创建配置对象
export const config: Config = {
  PORT: parseInt(process.env.PORT, 10) || 6688,
  DISALLOW_ROBOT: process.env.DISALLOW_ROBOT?.toLowerCase() === "true" || true,
  CACHE_TTL: parseInt(process.env.CACHE_TTL, 10) || 3600,
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT, 10) || 6000,
  ALLOWED_DOMAIN: process.env.ALLOWED_DOMAIN || "*",
  USE_LOG_FILE: process.env.USE_LOG_FILE?.toLowerCase() === "true" || true,
  RSS_MODE: process.env.RSS_MODE?.toLowerCase() === "true" || false,
};
