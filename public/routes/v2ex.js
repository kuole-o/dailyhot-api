import { get } from "../utils/getData.js";
export const handleRoute = async (c, noCache) => {
    const type = c.req.query("type") || "hot";
    const { fromCache, data, updateTime } = await getList({ type }, noCache);
    const routeData = {
        name: "v2ex",
        title: "V2EX",
        type: "主题榜",
        parameData: {
            type: {
                name: "榜单分类",
                type: {
                    hot: "最热主题",
                    latest: "最新主题",
                },
            },
        },
        link: "https://www.v2ex.com/",
        total: data?.length || 0,
        updateTime,
        fromCache,
        data,
    };
    return routeData;
};
const getList = async (options, noCache) => {
    const { type } = options;
    const url = `https://www.v2ex.com/api/topics/${type}.json`;
    const result = await get({ url, noCache });
    const list = result.data;
    return {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data: list.map((v) => ({
            id: v.id,
            title: v.title,
            desc: v.content,
            author: v.member.username,
            timestamp: null,
            hot: v.replies,
            url: v.url,
            mobileUrl: v.url,
        })),
    };
};
