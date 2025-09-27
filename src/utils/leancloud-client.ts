import AV from 'leancloud-storage';
import { config } from '../config.js';
import logger from './logger.js';

export interface BBTalkContent {
    MsgType: string;
    content: string;
    other: any;
    from: string;
    createdAt: Date;
    updatedAt: Date;
    objectId: string;
}

export class LeanCloudClient {
    private initialized = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        if (this.initialized) return;

        const appId = config.LEANCLOUD_APP_ID;
        const appKey = config.LEANCLOUD_APP_KEY;
        const masterKey = config.LEANCLOUD_MASTER_KEY;

        if (!appId || !appKey) {
            throw new Error('LeanCloud 配置不完整，请设置 LEANCLOUD_APP_ID 和 LEANCLOUD_APP_KEY');
        }

        AV.init({
            appId,
            appKey,
            masterKey,
            serverURL: config.LEANCLOUD_SERVER_URL || 'https://leancloud.guole.fun', // 修正为 serverURL
        });

        if (masterKey) {
            AV.Cloud.useMasterKey();
        }

        // 根据环境变量控制调试模式
        if (process.env.NODE_ENV === 'development') {
            AV.debug.enable();
        }

        this.initialized = true;
        logger.info('LeanCloud 客户端初始化完成');
    }

    // 查询内容数据
    async queryContent(pageNum: number = 1, pageSize: number = 12, isRecursive: boolean = false): Promise<{
        results: BBTalkContent[];
        totalCount: number;
        hasMore: boolean;
    }> {
        try {
            const query = new AV.Query('content');
            query.descending('createdAt');

            // 先获取总数
            const totalCount = await query.count();
            logger.info(`查询到总数据量: ${totalCount} 条`);

            let results: AV.Object[] = [];

            if (isRecursive) {
                // 递归获取所有数据
                logger.info('开始递归查询所有数据...');
                let skip = 0;
                const limit = 1000; // LeanCloud 单次查询最大限制

                while (skip < totalCount) {
                    query.limit(limit);
                    query.skip(skip);

                    const pageResults = await query.find() as unknown as AV.Object[]; // 类型断言
                    results.push(...pageResults);
                    skip += pageResults.length;

                    logger.info(`递归查询进度: ${results.length}/${totalCount}`);

                    if (pageResults.length < limit) {
                        break;
                    }
                }
            } else {
                // 分页查询
                const skip = (pageNum - 1) * pageSize;
                query.limit(pageSize);
                query.skip(skip);
                results = await query.find() as unknown as AV.Object[]; // 类型断言
            }

            logger.info(`查询完成，共获取 ${results.length} 条数据`);

            // 转换为标准格式
            const formattedResults = results.map(result => this.formatContent(result));

            return {
                results: formattedResults,
                totalCount,
                hasMore: isRecursive ? false : (pageNum * pageSize) < totalCount
            };
        } catch (error) {
            logger.error('LeanCloud 查询失败:', error);
            throw error;
        }
    }

    // 格式化内容数据
    private formatContent(result: AV.Object): BBTalkContent {
        const objectId = result.id;
        if (!objectId) {
            logger.warn('查询到的对象缺少 objectId，使用默认值');
        }

        const formattedResult: BBTalkContent = {
            MsgType: result.get('MsgType') || '',
            content: result.get('content') || '',
            other: result.get('other') || null,
            from: result.get('from') || '',
            createdAt: result.get('createdAt') || new Date(),
            updatedAt: result.get('updatedAt') || new Date(),
            objectId: objectId || 'unknown-id', // 提供默认值
        };

        // 特殊处理 music 类型的 other 字段
        if (formattedResult.MsgType === 'music' && typeof formattedResult.other === 'string') {
            try {
                formattedResult.other = JSON.parse(formattedResult.other);
            } catch (error) {
                logger.warn(`解析 music other 字段失败: ${formattedResult.other}`);
            }
        }

        return formattedResult;
    }
}