import type { RouterData } from "../types.js";
import type { RouterType } from "../router.types.js";
import { get } from "../utils/getData.js";
import { getTime } from "../utils/getTime.js";

export const handleRoute = async (_: undefined, noCache: boolean) => {
  const listData = await getList(noCache);
  const routeData: RouterData = {
    name: "ifanr",
    title: "爱范儿",
    type: "快讯",
    description: "15秒了解全球新鲜事",
    link: "https://www.ifanr.com/digest/",
    total: listData.data?.length || 0,
    ...listData,
  };
  return routeData;
};

const getList = async (noCache: boolean) => {
  const url = "https://sso.ifanr.com/api/v5/wp/buzz/?limit=20&offset=0";
  const result = await get({ url, noCache });
  const list = result.data.objects;
  //console.log(list)
  return {
    ...result,
    data: list.map((v: RouterType["ifanr"]) => ({
      id: v.id,
      title: v.post_title,
      desc: cleanPostContent(v.post_content),
      timestamp: getTime(v.created_at),
      hot: v.like_count || v.comment_count,
      url: v.buzz_original_url || `https://www.ifanr.com/${v.post_id}`,
      mobileUrl: v.buzz_original_url || `https://www.ifanr.com/digest/${v.post_id}`,
    })),
  };
};

const cleanPostContent = (postContent: string, maxWords: number = 500): string => {
  const text = postContent.replace(/<[^>]*>/g, ''); // 去除 HTML 标签
  const cleanedText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(); // 去除换行符和多余空格
  const words = cleanedText.split(' '); // 按空格分割成单词

  if (words.length <= maxWords) {
      return cleanedText;
  }
  return words.slice(0, maxWords).join(' ') + '...';
}