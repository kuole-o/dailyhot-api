import { post } from "../utils/getData.js";
import getTime from "../utils/getTime.js";
export const handleRoute = async (c, noCache) => {
    const type = c.req.query("type") || "hot";
    const { fromCache, data, updateTime } = await getList({ type }, noCache);
    const routeData = {
        name: "36kr",
        title: "36氪",
        type: "热榜",
        parameData: {
            type: {
                name: "热榜分类",
                type: {
                    hot: "人气榜",
                    video: "视频榜",
                    comment: "热议榜",
                    collect: "收藏榜",
                },
            },
        },
        link: "https://m.36kr.com/hot-list-m",
        total: data?.length || 0,
        updateTime,
        fromCache,
        data,
    };
    return routeData;
};
const getList = async (options, noCache) => {
    const { type } = options;
    const url = `https://gateway.36kr.com/api/mis/nav/home/nav/rank/${type}`;
    const result = await post({
        url,
        noCache,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        body: {
            partner_id: "wap",
            param: {
                siteId: 1,
                platformId: 2,
            },
            timestamp: new Date().getTime(),
        },
    });
    const listType = {
        hot: "hotRankList",
        video: "videoList",
        comment: "remarkList",
        collect: "collectList",
    };
    const list = result.data.data[listType[type || "hot"]];
    return {
        fromCache: result.fromCache,
        updateTime: result.updateTime,
        data: list.map((v) => {
            const item = v.templateMaterial;
            return {
                id: v.itemId,
                title: item.widgetTitle,
                cover: item.widgetImage,
                author: item.authorName,
                timestamp: getTime(v.publishTime),
                hot: item.statCollect,
                url: `https://www.36kr.com/p/${v.itemId}`,
                mobileUrl: `https://m.36kr.com/p/${v.itemId}`,
            };
        }),
    };
};
