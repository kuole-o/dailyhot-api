import type { BBTalkContent } from "../utils/leancloud-client.js";
import type { OtherData, ListContext } from "../types.js";
import { HttpError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { config } from "../config.js";
import { LeanCloudClient, createDefaultClient } from "../utils/leancloud-client.js";
import { QiniuStorageManager } from "../utils/qiniu-storage.js";

interface UploadBBTalkOptions {
    pageNum?: number;
    pageSize?: number;
    isRecursive?: boolean;
    bucket?: string;
    cosPath?: string;
    overwrite?: boolean;
}

class BBTalkUploader {
    private defaultPageSize: number;
    private defaultBucket: string;
    private defaultCosPath: string;
    private leancloudClient: LeanCloudClient | null = null;
    private qiniuStorage: QiniuStorageManager | null = null;

    constructor() {
        this.defaultPageSize = parseInt(config.BBTALK_PAGE_SIZE || '12');
        this.defaultBucket = config.QINIU_BUCKET || '';
        this.defaultCosPath = config.BBTALK_JSON_PATH || '';
    }

    // 延迟初始化服务 - 在鉴权通过后才创建
    private async initializeServices(): Promise<void> {
        if (!this.leancloudClient) {
            logger.info('初始化 LeanCloud 客户端...');
            // 使用环境变量创建客户端
            this.leancloudClient = createDefaultClient();
        }

        if (!this.qiniuStorage) {
            logger.info('初始化七牛云存储服务...');
            this.qiniuStorage = new QiniuStorageManager();
        }
    }

    // 重试装饰器
    private async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`执行 ${operationName} (尝试 ${attempt}/${maxRetries})`);
                return await operation();
            } catch (error) {
                lastError = error as Error;
                const errorMessage = error instanceof Error ? error.message : String(error);

                if (attempt === maxRetries) {
                    logger.error(`${operationName} 失败，已达到最大重试次数: ${errorMessage}`);
                    break;
                }

                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.warn(`${operationName} 失败，${delay}ms后重试: ${errorMessage}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError!;
    }

    // 查询内容数据 - 支持递归获取所有数据
    async queryContent(pageNum: number = 1, pageSize: number = 12, isRecursive: boolean = false): Promise<{
        results: BBTalkContent[];
        totalCount: number;
        hasMore: boolean;
    }> {
        // 确保服务已初始化
        await this.initializeServices();

        if (isRecursive) {
            // 递归获取所有数据
            logger.info('开始递归查询所有数据...');
            const allResults: BBTalkContent[] = [];
            let currentPage = 1;
            let hasMore = true;
            let totalCount = 0;

            while (hasMore) {
                const { results, totalCount: pageTotalCount, hasMore: pageHasMore } =
                    await this.leancloudClient!.queryContentPublic({
                        page: currentPage,
                        limit: 1000, // 每次查询1000条
                        useCache: false, // 递归查询不使用缓存
                        descending: true
                    });

                allResults.push(...results);
                totalCount = pageTotalCount;
                hasMore = pageHasMore && results.length === 1000;
                currentPage++;

                logger.info(`递归查询进度: ${allResults.length}/${totalCount}`);

                // 防止无限循环
                if (currentPage > 100) {
                    logger.warn('递归查询超过100页，强制停止');
                    break;
                }
            }

            return {
                results: allResults,
                totalCount: allResults.length,
                hasMore: false
            };
        } else {
            // 普通分页查询
            const { results, totalCount, hasMore } =
                await this.leancloudClient!.queryContentPublic({
                    page: pageNum,
                    limit: pageSize,
                    useCache: false, // 上传操作不使用缓存
                    descending: true
                });

            return { results, totalCount, hasMore };
        }
    }

    // 上传分页数据到七牛云
    async uploadBBTalkData(options: UploadBBTalkOptions = {}): Promise<{
        success: boolean;
        message: string;
        uploadedFiles: string[];
        totalCount: number;
        pageCount: number;
    }> {
        const {
            pageNum = 1,
            pageSize = this.defaultPageSize,
            isRecursive = false,
            bucket = this.defaultBucket,
            cosPath = this.defaultCosPath,
            overwrite = true
        } = options;

        if (!bucket) {
            throw new Error('七牛云存储桶配置缺失，请设置 QINIU_BUCKET');
        }

        // 先验证必要配置
        if (!config.LEANCLOUD_APP_ID || !config.LEANCLOUD_APP_KEY) {
            throw new Error('LeanCloud 配置不完整');
        }

        logger.info('开始处理 BBTalk 数据上传...');

        try {
            // 延迟初始化服务（在验证通过后进行）
            await this.initializeServices();

            // 查询 LeanCloud 数据
            const { results, totalCount } = await this.withRetry(
                () => this.queryContent(pageNum, pageSize, isRecursive),
                '查询 LeanCloud 数据',
                3,
                1000
            );

            const pageCount = Math.ceil(totalCount / pageSize);
            const uploadedFiles: string[] = [];

            logger.info(`数据查询完成，共 ${totalCount} 条数据，${pageCount} 页`);

            if (isRecursive) {
                // 递归模式：上传所有分页
                logger.info('开始上传所有分页数据...');

                for (let i = 1; i <= pageCount; i++) {
                    const startIndex = (i - 1) * pageSize;
                    const endIndex = Math.min(i * pageSize, results.length);
                    const pageResults = results.slice(startIndex, endIndex);

                    await this.uploadPageData(bucket, cosPath, i, pageResults, totalCount, overwrite);
                    uploadedFiles.push(`bbtalk_page${i}.json`);
                }
            } else {
                // 单页模式：只上传指定页面
                const startIndex = (pageNum - 1) * pageSize;
                const endIndex = Math.min(pageNum * pageSize, results.length);
                const pageResults = results.slice(startIndex, endIndex);

                await this.uploadPageData(bucket, cosPath, pageNum, pageResults, totalCount, overwrite);
                uploadedFiles.push(`bbtalk_page${pageNum}.json`);
            }

            logger.info('BBTalk 数据上传完成');

            return {
                success: true,
                message: `BBTalk 最新数据分页 JSON ${overwrite ? '覆盖' : '上传'}成功！`,
                uploadedFiles,
                totalCount,
                pageCount
            };
        } catch (error) {
            logger.error('BBTalk 数据上传失败:', error);
            throw error;
        }
    }

    // 上传单页数据
    private async uploadPageData(
        bucket: string,
        cosPath: string,
        pageNum: number,
        results: BBTalkContent[],
        totalCount: number,
        overwrite: boolean = true
    ): Promise<void> {
        const fileName = `bbtalk_page${pageNum}.json`;
        const key = `${cosPath}/${fileName}`;

        const formattedData = {
            page: pageNum,
            pageSize: results.length,
            totalCount,
            results,
            timestamp: new Date().toISOString(),
        };

        logger.info(`生成 JSON 文件: ${fileName}, 包含 ${results.length} 条数据`);

        await this.withRetry(
            () => this.qiniuStorage!.uploadString({
                bucket,
                key,
                body: JSON.stringify(formattedData, null, 2),
                mimeType: 'application/json',
                overwrite: overwrite
            }),
            `上传文件 ${fileName}`,
            3,
            1500
        );

        logger.info(`JSON 文件${overwrite ? '覆盖' : '上传'}成功: ${fileName}`);
    }
}

// 创建实例（此时不会初始化服务）
const bbTalkUploader = new BBTalkUploader();

export const handleRoute = async (c: ListContext, noCache: boolean): Promise<OtherData> => {
    // 第一步：立即进行鉴权验证（在服务初始化之前）
    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');
    const token = authHeader?.replace('Bearer ', '') || queryToken || '';

    logger.info(`Received token: ${token}`);
    logger.info(`Expected token: ${config.BBTALK_TOKEN}`);

    if (!token || token !== config.BBTALK_TOKEN) {
        logger.error('❌ [ERROR] 访问未经授权 - Token 验证失败');
        throw new HttpError(401, '访问未经授权');
    }

    logger.info('✅ Token 验证通过，开始处理请求...');

    // 第二步：获取参数（在验证通过后进行）
    const pageNum = parseInt(c.req.query('pageNum') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || config.BBTALK_PAGE_SIZE || '12');
    const isRecursive = c.req.query('isRecursive') === 'true';
    const bucket = c.req.query('bucket') || config.QINIU_BUCKET;
    const cosPath = c.req.query('cosPath') || config.BBTALK_JSON_PATH;
    const overwrite = c.req.query('overwrite') !== 'false';

    // 第三步：验证必要配置（在验证通过后进行）
    if (!bucket) {
        throw new HttpError(400, '七牛云存储桶配置缺失');
    }

    try {
        // 第四步：执行上传（服务会在此时延迟初始化）
        const result = await bbTalkUploader.uploadBBTalkData({
            pageNum,
            pageSize,
            isRecursive,
            bucket,
            cosPath,
            overwrite
        });

        // 构建返回数据
        const routeData: OtherData = {
            name: "BBTalk数据上传",
            title: "BBTalk数据上传到七牛云",
            description: `将LeanCloud的BBTalk数据生成JSON分页文件${overwrite ? '覆盖' : '上传'}到七牛云存储桶`,
            code: '200',
            msg: result.message,
            updateTime: new Date().toISOString(),
            fromCache: false,
            data: {
                success: result.success,
                uploadedFiles: result.uploadedFiles,
                totalCount: result.totalCount,
                pageCount: result.pageCount,
                overwrite: overwrite
            }
        };

        return routeData;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`BBTalk数据上传失败: ${errorMessage}`);
        throw new HttpError(500, `BBTalk数据上传失败: ${errorMessage}`);
    }
};

export { BBTalkUploader };