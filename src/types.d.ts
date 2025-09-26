import type { Context } from "hono";
import type { ResponseType } from "axios";

// Context
export type ListContext = Context;

// 榜单数据
export interface ListItem {
  id: number | string;
  title: string;
  cover?: string;
  author?: string;
  desc?: string;
  hot: number | undefined;
  timestamp: number | undefined;
  url: string;
  mobileUrl: string;
}

// 路由接口数据
export interface RouterResType {
  updateTime: string | number;
  fromCache: boolean;
  data: ListItem[];
  message?: string;
}

// 路由数据
export interface RouterData extends RouterResType {
  name: string;
  title: string;
  type: string;
  description?: string;
  params?: Record<string, string | object>;
  total: number;
  link?: string;
}

// 其他数据 自定义
export interface OtherData {
  name?: string;
  title?: string;
  type?: string;
  description?: string;
  params?: Record<string, string | object>;
  total?: number;
  link?: string;
  updateTime?: string;
  fromCache?: boolean;
  count?: {
    os: number;
    browser: number;
    country: number;
    stats: number;
  };
  data?: {
    url?: string;
    urlbase?: string;
    copyright?: string;
    copyrightlink?: string;
    startdate?: string;
    fullstartdate?: string;
    enddate?: string;
    title?: string;
    ip?: string;
    flag?: string;
    country?: string;
    countryRegion?: string;
    city?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
    asOrganization?: string;
    newCertId?: string;
    oldCertId?: string;
    updatedDomains?: string[];
    error?: string;
  };
  code?: string | number;
  msg?: string;
  token?: string;
  user?: {
    id: string;
    username: string;
    createdAt: string;
    isAdmin: boolean;
  }
  updateTime?: string;
}

// 请求类型
export interface Get {
  url: string;
  headers?: Record<string, string | string[]>;
  params?: Record<string, string | number>;
  timeout?: number;
  noCache?: boolean;
  ttl?: number;
  originaInfo?: boolean;
  responseType?: ResponseType;
}

export interface Post {
  url: string;
  headers?: Record<string, string | string[]>;
  body?: string | object | Buffer | undefined;
  timeout?: number;
  noCache?: boolean;
  ttl?: number;
  originaInfo?: boolean;
}

// 参数类型
export interface Options {
  [key: string]: string | number | undefined;
}