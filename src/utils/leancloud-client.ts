import AV from 'leancloud-storage';
import { config } from '../config.js';
import logger from './logger.js';
import { getCache, setCache, delCache, delCacheByPattern, getKeysByPattern } from './cache.js';
import type { CacheData } from './cache.js';

export interface BBTalkContent {
    MsgType: string;
    content: string;
    other: any;
    from: string;
    createdAt: Date;
    updatedAt: Date;
    objectId: string;
    url: string;
    mobileUrl: string;
}

export interface CreateContentData {
    from: string;
    content: string;
    MsgType?: string;
    other?: any;
}

export interface QueryOptions {
    page?: number;
    limit?: number;
    descending?: boolean;
    useCache?: boolean;
    cacheKey?: string;
    ttl?: number;
}

export class LeanCloudClient {
    private initialized = false;
    private appId: string;
    private appKey?: string;
    private masterKey?: string;
    private serverURL: string;

    constructor(appId?: string, appKey?: string, appMasterKey?: string, serverURL?: string) {
        this.appId = appId || '';
        this.appKey = appKey || '';
        this.masterKey = appMasterKey;
        this.serverURL = serverURL || config.LEANCLOUD_SERVER_URL || 'https://leancloud.guole.fun';

        // 只有在提供了凭证时才初始化
        if (this.appId && this.appKey) {
            this.initialize();
        }
    }

    private initialize() {
        if (this.initialized) return;

        if (!this.appId || !this.appKey) {
            throw new Error('LeanCloud 配置不完整，请提供有效的 appId 和 appKey');
        }

        AV.init({
            appId: this.appId,
            appKey: this.appKey,
            masterKey: this.masterKey,
            serverURL: this.serverURL,
        });

        if (this.masterKey) {
            AV.Cloud.useMasterKey();
        }

        if (process.env.NODE_ENV === 'development') {
            AV.debug.enable();
        }

        this.initialized = true;
        logger.info(`LeanCloud 客户端初始化完成 (AppId: ${this.appId.substring(0, 8)}...)`);
    }

    // 查询内容数据（支持缓存） - 用于 bbtalk.ts
    async queryContentPublic(options: QueryOptions = {}): Promise<{
        results: BBTalkContent[];
        totalCount: number;
        hasMore: boolean;
        fromCache: boolean;
    }> {
        // 确保服务已初始化
        if (!this.initialized) {
            this.initialize();
        }

        const {
            page = 1,
            limit = 10,
            descending = true,
            useCache = true,
            cacheKey = `leancloud:content:page${page}:limit${limit}:desc${descending}`,
            ttl = 3 * 60 * 1000 // 默认3分钟缓存
        } = options;

        // 检查缓存
        if (useCache) {
            const cachedData = await getCache(cacheKey);
            if (cachedData) {
                logger.info(`从缓存获取 LeanCloud 数据: ${cacheKey}`);
                const cachedResult = cachedData.data as {
                    results: BBTalkContent[];
                    totalCount: number;
                    hasMore: boolean;
                };
                return {
                    ...cachedResult,
                    fromCache: true
                };
            }
        }

        try {
            const query = new AV.Query('content');

            if (descending) {
                query.descending('createdAt');
            } else {
                query.ascending('createdAt');
            }

            const skip = (page - 1) * limit;
            query.limit(limit);
            query.skip(skip);

            // 获取总数和数据
            const [totalCount, results] = await Promise.all([
                query.count(),
                query.find() as unknown as AV.Object[]
            ]);

            logger.info(`查询 LeanCloud 公开数据完成，第 ${page} 页，每页 ${limit} 条，共 ${totalCount} 条`);

            // 转换为标准格式
            const formattedResults = results.map(result => this.formatContent(result));

            const returnData = {
                results: formattedResults,
                totalCount,
                hasMore: skip + limit < totalCount,
                fromCache: false
            };

            // 设置缓存
            if (useCache) {
                const cacheData: CacheData = {
                    updateTime: new Date().toISOString(),
                    data: returnData
                };
                await setCache(cacheKey, cacheData, ttl);
            }

            return returnData;
        } catch (error) {
            logger.error('LeanCloud 公开数据查询失败:', error);

            // 查询失败时清除可能损坏的缓存
            if (useCache) {
                await delCache(cacheKey);
            }
            throw error;
        }
    }

    // 创建内容（不缓存） - 用于 newbbtalk.ts
    async createContent(data: CreateContentData): Promise<{
        objectId: string;
        createdAt: string;
    }> {
        try {
            const Content = AV.Object.extend('content');
            const content = new Content();

            // 设置字段
            content.set('from', data.from);
            content.set('content', data.content);
            content.set('MsgType', data.MsgType || 'text');
            if (data.other) {
                content.set('other', data.other);
            }

            const savedContent = await content.save();
            logger.info('创建 LeanCloud 内容成功');

            // 创建成功后，清除相关的查询缓存
            await this.clearContentCache();

            // 同时清除可能受影响的特定缓存（比如第一页，因为新内容会出现在第一页）
            await this.clearSpecificContentCache(1);

            return {
                objectId: savedContent.id || '',
                createdAt: savedContent.get('createdAt').toISOString(),
            };
        } catch (error) {
            logger.error('LeanCloud 创建内容失败:', error);
            throw error;
        }
    }

    // 递归查询所有内容（不使用缓存） - 用于 upload-bbtalk-json.ts
    async queryAllContent(descending: boolean = true): Promise<{
        results: BBTalkContent[];
        totalCount: number;
    }> {
        // 确保服务已初始化
        if (!this.initialized) {
            this.initialize();
        }

        try {
            const query = new AV.Query('content');

            if (descending) {
                query.descending('createdAt');
            } else {
                query.ascending('createdAt');
            }

            // 先获取总数
            const totalCount = await query.count();
            logger.info(`开始递归查询所有数据，共 ${totalCount} 条`);

            const allResults: AV.Object[] = [];
            let skip = 0;
            const limit = 1000; // LeanCloud 单次查询最大限制

            while (skip < totalCount) {
                query.limit(limit);
                query.skip(skip);

                const pageResults = await query.find() as unknown as AV.Object[];
                allResults.push(...pageResults);
                skip += pageResults.length;

                logger.info(`递归查询进度: ${allResults.length}/${totalCount}`);

                if (pageResults.length < limit) {
                    break;
                }
            }

            // 转换为标准格式
            const formattedResults = allResults.map(result => this.formatContent(result));

            logger.info(`递归查询完成，共获取 ${formattedResults.length} 条数据`);

            return {
                results: formattedResults,
                totalCount: formattedResults.length
            };
        } catch (error) {
            logger.error('LeanCloud 递归查询失败:', error);
            throw error;
        }
    }

    // 清除内容缓存
    private async clearContentCache(): Promise<void> {
        try {
            logger.info('开始清除 LeanCloud 内容相关缓存');

            // 定义要清除的缓存模式
            const patterns = [
                'leancloud:content:*', // 清除所有 LeanCloud 内容缓存
                'bbtalk:*' // 清除所有 BBTalk 相关缓存
            ];

            let totalDeleted = 0;

            // 先获取匹配的键列表（用于日志）
            for (const pattern of patterns) {
                const matchedKeys = await getKeysByPattern(pattern);
                if (matchedKeys.length > 0) {
                    logger.info(`找到匹配模式 ${pattern} 的键: ${matchedKeys.join(', ')}`);
                }
            }

            // 执行批量删除
            for (const pattern of patterns) {
                const deletedCount = await delCacheByPattern(pattern);
                totalDeleted += deletedCount;

                if (deletedCount > 0) {
                    logger.info(`清除模式 ${pattern} 的缓存，删除 ${deletedCount} 个键`);
                }
            }

            logger.info(`LeanCloud 内容缓存清除完成，共删除 ${totalDeleted} 个缓存键`);

        } catch (error) {
            logger.warn('清除缓存失败:', error);
        }
    }

    // 添加一个更精确的缓存清除方法，用于特定页面和限制
    public async clearSpecificContentCache(page?: number, limit?: number): Promise<void> {
        try {
            let patterns: string[] = [];

            if (page !== undefined && limit !== undefined) {
                // 清除特定页面和限制的缓存
                patterns = [
                    `leancloud:content:page${page}:limit${limit}:*`,
                    `bbtalk:page${page}:limit${limit}:*`
                ];
            } else if (page !== undefined) {
                // 清除特定页面的所有限制的缓存
                patterns = [
                    `leancloud:content:page${page}:limit*:*`,
                    `bbtalk:page${page}:limit*:*`
                ];
            } else {
                // 清除所有缓存
                return this.clearContentCache();
            }

            let totalDeleted = 0;
            for (const pattern of patterns) {
                const deletedCount = await delCacheByPattern(pattern);
                totalDeleted += deletedCount;
            }

            logger.info(`清除特定内容缓存完成，删除 ${totalDeleted} 个键`);

        } catch (error) {
            logger.warn('清除特定内容缓存失败:', error);
        }
    }

    // 格式化内容数据
    private formatContent(result: AV.Object): BBTalkContent {
        const objectId = result.id;
        if (!objectId) {
            logger.warn('查询到的对象缺少 objectId');
        }

        const formattedResult: BBTalkContent = {
            MsgType: result.get('MsgType') || '',
            content: result.get('content') || '',
            other: result.get('other') || null,
            from: result.get('from') || '',
            createdAt: result.get('createdAt') || new Date(),
            updatedAt: result.get('updatedAt') || new Date(),
            objectId: objectId || 'unknown-id',
            url: `https://blog.guole.fun/bb#${objectId}`,
            mobileUrl: `https://blog.guole.fun/bb#${objectId}`
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

    // 获取客户端信息（用于调试）
    getClientInfo() {
        return {
            appId: this.appId ? `${this.appId.substring(0, 8)}...` : '未设置',
            serverURL: this.serverURL,
            initialized: this.initialized
        };
    }
}

// 创建使用环境变量的默认实例（用于只读操作）
export const createDefaultClient = () => {
    if (!config.LEANCLOUD_APP_ID || !config.LEANCLOUD_APP_KEY) {
        throw new Error('LeanCloud 环境变量未配置');
    }
    return new LeanCloudClient(config.LEANCLOUD_APP_ID, config.LEANCLOUD_APP_KEY);
};