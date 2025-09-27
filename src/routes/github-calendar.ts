import type { OtherData, RouterData, ListContext, Options } from "../types.js";
import { HttpError } from "../utils/errors.js";
import { get } from "../utils/getData.js";
import * as cheerio from 'cheerio';
import logger from "../utils/logger.js";
import fs from 'fs';

const ttl = 60 * 60 * 1000;

export const handleRoute = async (c: ListContext, noCache: boolean) => {
  try {
    const user: string = c.req.query("user") || '';
    const limit: number = c.req.query("limit") ? Number(c.req.query("limit")) : 0;
    const year: number = c.req.query("year") ? Number(c.req.query("year")) - 1 : new Date().getFullYear() - 1;

    if (!user) {
      throw new HttpError(400, '获取 Github 数据发生错误，请检查 user 参数是否正确。使用示例：https://api.guole.fun/GithubCalendar?user=xxx');
    }

    const { fromCache, updateTime, total, data } = await getList(user, limit, year, noCache);

    const routeData: OtherData = {
      name: "GithubCalendar",
      title: "Github Calendar",
      type: "最新动态",
      link: `https://github.com/${user}`,
      total: total,
      updateTime,
      fromCache,
      data: data,
    };

    return routeData;
  } catch (error) {
    logger.info(error instanceof Error ? error.message : "发生了一个未知错误！");
    throw error;
  }
};

const getList = async (user: string, limit: number, year: number, noCache: boolean) => {
  try {
    let data;
    let result = { fromCache: false, updateTime: '', data: [] };
    const url = `https://github.com/users/${user}/contributions?to=${year}-01-01`;

    if (process.env.NODE_ENV === "development") {
      data = fs.readFileSync('./public/test/github.html', 'utf-8');
    } else {
      result = await get({
        url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
          "Connection": "keep-alive"
        },
        noCache,
        ttl
      });
      data = result.data;
    }

    logger.debug(`result.data: ${JSON.stringify(result.data)}`);

    const $ = cheerio.load(data);
    const contributions: { date: string; level: number; count: number }[] = [];

    const contributionCounts = extractContributionCounts($);
    const { dateMap, levelMap } = extractDateAndLevelData($);

    // 关联数据
    for (const id in contributionCounts) {
      if (dateMap[id] && levelMap[id]) {
        contributions.push({ date: dateMap[id], level: levelMap[id], count: contributionCounts[id] });
      }
    }

    contributions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const total = contributions.reduce((acc, curr) => acc + curr.count, 0);
    const limitedContributions = limit > 0 ? contributions.slice(0, limit) : contributions;
    const contributionsSplit = listSplit(limitedContributions, 7);

    return {
      fromCache: result.fromCache,
      updateTime: result.updateTime,
      total: total,
      data: contributionsSplit,
    };
  } catch (error) {
    throw error;
  }
};

const extractContributionCounts = ($: cheerio.CheerioAPI) => {
  const contributionCounts: { [key: string]: number } = {};
  $('.js-calendar-graph tool-tip').each((i, el) => {
    const id = $(el).attr('for');
    const text = $(el).text().trim().replace(/\s+/g, ' ').match(/^(\d+) contributions?/);
    if (id && text) {
      contributionCounts[id] = parseInt(text[1], 10);
    }
  });
  return contributionCounts;
};

const extractDateAndLevelData = ($: cheerio.CheerioAPI) => {
  const dateMap: { [key: string]: string } = {};
  const levelMap: { [key: string]: number } = {};
  $('.js-calendar-graph td.ContributionCalendar-day').each((i, el) => {
    const id = $(el).attr('id');
    const date = $(el).attr('data-date');
    const level = $(el).attr('data-level');
    if (id && date && level) {
      dateMap[id] = date;
      levelMap[id] = Number(level);
    }
  });
  return { dateMap, levelMap };
};

const listSplit = (items: { date: string; count: number }[], n: number) => {
  const result: { date: string; count: number }[][] = [];
  for (let i = 0; i < items.length; i += n) {
    result.push(items.slice(i, i + n));
  }
  return result;
};