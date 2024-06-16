import type { ListItem, RouterData, ListContext, Options } from "../types.js";
import { HttpError } from "../utils/errors.js";
import { get } from "../utils/getData.js";
import { load } from 'cheerio';
import logger from "../utils/logger.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    const user: string = c.req.query("user");

    if (!user) {
      throw new HttpError(400, '获取 Github 提交日历发生错误，请检查 user 参数是否正确。使用示例：https://api.guole.fun/GithubCalendar?user=xxx');
    }
  
    const { fromCache, data, updateTime } = await getList({ user }, noCache);

    const routeData: RouterData = {
      name: "GithubCalendar",
      title: "Github Calendar",
      type: "最新动态",
      link: `https://github.com/${user}`,
      total: data[0]?.total || 0,
      updateTime,
      fromCache,
      data: data as unknown as ListItem[],
    };
    return routeData;
  } catch (error) {
    logger.info(error.message);
    throw error;
  }
};

const getList = async ({ user }: Options, noCache: boolean) => {
  try {
    const url = `https://github.com/${user}`;
    const result = await get({
      url,
      noCache,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/605.1.15",
      },
    });
    const data = result.data;
    const $ = load(data);
    const contributions: { date: string; count: number }[] = [];
    $('.js-calendar-graph-svg rect').each((i, el) => {
      const date = $(el).attr('data-date');
      const count = parseInt($(el).attr('data-count') || '0', 10);
      if (date) {
        contributions.push({ date, count });
      }
    });

    const totalContributions = contributions.reduce((acc, curr) => acc + curr.count, 0);
    const contributionsSplit = listSplit(contributions, 7);

    return {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      data: [{
        total: totalContributions,
        contributions: contributionsSplit,
      }],
    };
  } catch (error) {
    throw error;
  }
};

const listSplit = (items: { date: string; count: number }[], n: number) => {
  const result: { date: string; count: number }[][] = [];
  for (let i = 0; i < items.length; i += n) {
    result.push(items.slice(i, i + n));
  }
  return result;
}