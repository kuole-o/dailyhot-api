import type { BBTalkContent } from "../utils/leancloud-client.js";
import type { OtherData, ListContext } from "../types.js";
import { HttpError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { config } from "../config.js";
import { LeanCloudClient } from "../utils/leancloud-client.js";
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
        this.defaultCosPath = config.BBTALK_JSON_PATH || 'bbtalk';
    }

    // 延迟初始化服务
    private async initializeServices(): Promise<void> {
        if (!this.leancloudClient) {
            logger.info('初始化 LeanCloud 客户端...');
            this.leancloudClient = new LeanCloudClient();
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
                () => this.leancloudClient!.queryContent(pageNum, pageSize, isRecursive),
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

                    await this.uploadPageData(bucket, cosPath, i, pageResults, totalCount);
                    uploadedFiles.push(`bbtalk_page${i}.json`);
                }
            } else {
                // 单页模式：只上传指定页面
                const startIndex = (pageNum - 1) * pageSize;
                const endIndex = Math.min(pageNum * pageSize, results.length);
                const pageResults = results.slice(startIndex, endIndex);

                await this.uploadPageData(bucket, cosPath, pageNum, pageResults, totalCount);
                uploadedFiles.push(`bbtalk_page${pageNum}.json`);
            }

            logger.info('BBTalk 数据上传完成');

            return {
                success: true,
                message: 'BBTalk 最新数据分页 JSON 上传成功！',
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
    // 鉴权验证
    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');
    const token = authHeader?.replace('Bearer ', '') || queryToken || '';

    logger.info(`Received token: ${token}`);

    if (!token || token !== config.BBTALK_TOKEN) {
        throw new HttpError(401, '访问未经授权');
    }

    // 获取参数
    const pageNum = parseInt(c.req.query('pageNum') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || config.BBTALK_PAGE_SIZE || '12');
    const isRecursive = c.req.query('isRecursive') === 'true';
    const bucket = c.req.query('bucket') || config.QINIU_BUCKET;
    const cosPath = c.req.query('cosPath') || config.BBTALK_JSON_PATH;
    const overwrite = c.req.query('overwrite') !== 'false';

    // 验证必要配置
    if (!config.LEANCLOUD_APP_ID || !config.LEANCLOUD_APP_KEY) {
        throw new HttpError(400, 'LeanCloud 配置不完整');
    }

    if (!bucket) {
        throw new HttpError(400, '七牛云存储桶配置缺失');
    }

    try {
        // 执行上传
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
            description: "将LeanCloud的BBTalk数据生成JSON分页文件上传到七牛云存储桶",
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