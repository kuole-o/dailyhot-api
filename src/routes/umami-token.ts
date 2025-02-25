import type { OtherData, ListContext } from "../types.js";
import { post } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";

const ttl = 60*60*1000;
const name = process.env.UMAMI_USER_NAME || '';
const password = process.env.UMAMI_PASSWORD || '';

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  const url = `https://umami.guole.fun/api/auth/login`;
  const result = await post({
    url,
    body: {
      username: name,
      password: password
    },
    noCache,
    ttl
  });
  const data = result.data;
  if (!result.data || !data.token) {
    throw new HttpError(401, `Umami 用户名或密码不正确！`);
  }
  const routeData: OtherData = {
    ...data,
  };
  return routeData;
};