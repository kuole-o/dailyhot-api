import type { ListItem, RouterData, ListContext, Options } from "../types.js";
import { HttpError } from "../utils/errors.js";
import { get } from "../utils/getData.js";
import * as cheerio from 'cheerio';
import logger from "../utils/logger.js";

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    const user: string = c.req.query("user") || '';

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
    if (error instanceof Error) {
      logger.info(error.message);
    } else {
      logger.info("发生了一个未知错误！");
    }
    throw error;
  }
};

const getList = async ({ user }: Options, noCache: boolean) => {
  try {
    const url = `https://github.com/${user}`;
    const result = await get({
      url,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/605.1.15",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
      },
      noCache
    });
    const data = result.data;

    logger.info(result);

    logger.info(data);

    const $ = cheerio.load(data);
    const contributions: { date: string; count: number }[] = [];

    // 提取提交次数数据
    const contributionCounts: { [key: string]: number } = {};
    const tooltips = $('.js-calendar-graph.ContributionCalendar tool-tip');
    logger.info("tooltips: ",tooltips.length);
    tooltips.each((i, el) => {
      const id = $(el).attr('id');
      const text = $(el).text();

      logger.info("id: ",id);
      logger.info("text: ",text);

      const match = text.match(/^(\d+) contribution/);
      if (id && match) {
        contributionCounts[id] = parseInt(match[1], 10);
      }
    });

    // 提取日期数据
    const dateMap: { [key: string]: string } = {};
    const days = $('.js-calendar-graph.ContributionCalendar td.ContributionCalendar-day');
    logger.info("days: ",days.length);
    days.each((i, el) => {
      const id = $(el).attr('aria-labelledby');
      const date = $(el).attr('data-date');

      logger.info("id: ",id);
      logger.info("date: ",date);

      if (id && date) {
        dateMap[id] = date;
      }
    });

    logger.info("contributionCounts: ",contributionCounts);
    logger.info("dateMap: ",dateMap);

    // 关联数据
    for (const id in contributionCounts) {
      if (dateMap[id]) {
        contributions.push({ date: dateMap[id], count: contributionCounts[id] });
      }
    }

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