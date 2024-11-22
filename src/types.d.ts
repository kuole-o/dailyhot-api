import type { Context } from "hono";

// Context
export type ListContext = Context;

// 榜单数据
export type ListItem = {
  id: number | string;
  title: string;
  cover?: string;
  author?: string;
  desc?: string;
  hot: number | null;
  timestamp: number | string | null;
  url: string | undefined;
  mobileUrl: string | undefined;
};

// 路由数据
export type RouterData = {
  name: string;
  title: string;
  type: string;
  description?: string;
  params?: Record<string, string | object>;
  total: number;
  link?: string;
  updateTime: string;
  fromCache: boolean;
  data: ListItem[];
};

// 其他数据
export type OtherData = {
  name: string;
  title: string;
  type: string;
  description?: string;
  params?: Record<string, string | object>;
  total: number;
  link?: string;
  updateTime: string;
  fromCache: boolean;
  data: {
    url: string;
    urlbase: string;
    copyright: string;
    copyrightlink: string;
    startdate: string;
    fullstartdate: string;
    enddate: string;
    title: string;
  };
};

// 请求类型
export type Get = {
  url: string;
  headers?: Record<string, string | string[]>;
  params?: Record<string, string | number>;
  timeout?: number;
  noCache?: boolean;
  ttl?: number;
  originaInfo?: boolean;
};

export type Post = {
  url: string;
  headers?: Record<string, string | string[]>;
  body?: string | object | Buffer | undefined;
  timeout?: number;
  noCache?: boolean;
  ttl?: number;
  originaInfo?: boolean;
};

export type Web = {
  url: string;
  timeout?: number;
  noCache?: boolean;
  ttl?: number;
  userAgent?: string;
};

// 参数类型
export type Options = {
  [key: string]: string | number | undefined;
};