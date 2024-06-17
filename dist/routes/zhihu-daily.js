import { get } from "../utils/getData.js";
export const handleRoute = async (_, noCache) => {
    const { fromCache, data, updateTime } = await getList(noCache);
    const routeData = {
        name: "zhihu-daily",
        title: "知乎日报",
        type: "推荐榜",
        description: "每天三次，每次七分钟",
        link: "https://daily.zhihu.com/",
        total: data?.length || 0,
        updateTime,
        fromCache,
        data,
    };
    return routeData;
};
const getList = async (noCache) => {
    const url = `https://daily.zhihu.com/api/4/news/latest`;
    const result = await get({
        url,
        noCache,
        headers: {
            Referer: "https://daily.zhihu.com/api/4/news/latest",
            Host: "daily.zhihu.com",
        },
    });
    const list = result.data.stories.filter((el) => el.type === 0);
    return {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data: list.map((v) => ({
            id: v.id,
            title: v.title,
            cover: v.images[0],
            author: v.hint,
            hot: null,
            timestamp: null,
            url: v.url,
            mobileUrl: v.url,
        })),
    };
};
