import { createHmac } from 'crypto';
import type { OtherData, ListContext } from "../types.js";
import { get, post, put, del } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { createClient } from "webdav";
import fs from "fs/promises"; // 异步fs API
import path from "path";
import { config, getSSLConfig } from "../config.js";

class QiniuSSLManager {
    private accessKey: string;
    private secretKey: string;
    private webdavClient: any;
    private config: any;

    constructor(config: any) {
        this.config = config;
        this.accessKey = config.accessKey;
        this.secretKey = config.secretKey;

        this.webdavClient = createClient(
            config.webdav.server,
            {
                username: config.webdav.username,
                password: config.webdav.password
            }
        );
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

                // 指数退避策略：延迟时间随重试次数增加
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.warn(`${operationName} 失败，${delay}ms后重试: ${errorMessage}`);

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError!;
    }


    // 生成七牛云 API 认证头
    private generateAuthHeader(url: string, body: string = ''): string {
        // 解析 URL 获取路径和查询参数
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const query = urlObj.search;

        // 生成签名
        const signingStr = path + query + '\n' + body;
        const sign = createHmac('sha1', this.secretKey)
            .update(signingStr)
            .digest('base64');

        return `QBox ${this.accessKey}:${sign}`;
    }

    // 获取域名列表
    async getDomainList(): Promise<string[]> {
        return this.withRetry(async () => {
            const requestURL = 'https://api.qiniu.com/domain';
            const authHeader = this.generateAuthHeader(requestURL, '');

            const response = await get({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                params: {
                    limit: 1000
                },
                noCache: true
            });

            if (response.data && response.data.domains) {
                const domains = response.data.domains;
                logger.info(`获取到 ${domains.length} 个域名`);

                const targetDomains = domains
                    .filter((domain: any) =>
                        domain.name.endsWith('.guole.fun') &&
                        domain.operatingState === 'success'
                    )
                    .map((domain: any) => domain.name);

                logger.info(`找到 ${targetDomains.length} 个 guole.fun 子域名: ${targetDomains.join(', ')}`);
                return targetDomains;
            } else {
                throw new Error('获取域名列表失败：响应格式不正确');
            }
        }, '获取域名列表', 3, 1000);
    }

    // 从WebDAV读取证书文件
    async readCertFilesFromWebDAV(): Promise<{ cert: string; key: string }> {
        try {
            logger.info('连接WebDAV服务器获取证书文件...');

            const remoteCertPath = `${this.config.webdav.certPath}/${this.config.certFileName}`;
            const remoteKeyPath = `${this.config.webdav.certPath}/${this.config.keyFileName}`;

            // 检查文件是否存在
            const certExists = await this.webdavClient.exists(remoteCertPath);
            const keyExists = await this.webdavClient.exists(remoteKeyPath);

            if (!certExists || !keyExists) {
                throw new Error(`证书文件不存在: ${!certExists ? this.config.certFileName : ''} ${!keyExists ? this.config.keyFileName : ''}`);
            }

            // 读取文件内容
            const certBuffer = await this.webdavClient.getFileContents(remoteCertPath);
            const keyBuffer = await this.webdavClient.getFileContents(remoteKeyPath);

            const cert = certBuffer.toString('utf-8');
            const key = keyBuffer.toString('utf-8');

            logger.info('证书文件读取成功');
            return { cert, key };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`从WebDAV读取证书文件失败: ${errorMessage}`);
            throw new Error(`读取证书文件失败: ${errorMessage}`);
        }
    }

    // 上传证书到七牛云
    async uploadCert(cert: string, key: string): Promise<string> {
        return this.withRetry(async () => {
            const certName = '*.guole.fun';
            const requestURL = 'https://api.qiniu.com/sslcert';

            const requestBody = JSON.stringify({
                name: certName,
                common_name: 'guole.fun',
                pri: key,
                ca: cert
            });

            const authHeader = this.generateAuthHeader(requestURL, requestBody);

            const response = await post({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: requestBody,
                noCache: true
            });

            if (response.data && response.data.certID) {
                logger.info(`新证书上传成功，ID: ${response.data.certID}`);
                return response.data.certID;
            } else {
                throw new Error('上传证书失败：响应中缺少certID');
            }
        }, '上传证书到七牛云', 3, 1500);
    }
    // 更新域名SSL配置
    async updateDomainCerts(newCertId: string, cert: string, key: string): Promise<{ success: string[], failed: Array<{ domain: string, error: string }> }> {
        const domains = await this.getDomainList();

        if (domains.length === 0) {
            throw new Error('没有找到可用的域名');
        }

        const success: string[] = [];
        const failed: Array<{ domain: string, error: string }> = [];

        // 对每个域名的更新操作单独进行重试
        for (const domain of domains) {
            try {
                await this.updateDomainHttpsConfig(domain, newCertId);
                success.push(domain);
                logger.info(`证书已绑定到域名: ${domain}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                failed.push({ domain, error: errorMessage });
                logger.error(`绑定域名 ${domain} 失败: ${errorMessage}`);
            }
        }

        return { success, failed };
    }

    // 更新域名HTTPS配置
    private async updateDomainHttpsConfig(domain: string, certId: string): Promise<any> {
        return this.withRetry(async () => {
            const requestURL = `https://api.qiniu.com/domain/${domain}/httpsconf`;

            const requestBody = JSON.stringify({
                certId: certId,
                forceHttps: true,
                http2Enable: true
            });

            const authHeader = this.generateAuthHeader(requestURL, requestBody);

            const response = await put({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: requestBody,
                noCache: true
            });

            return response.data;
        }, `更新域名 ${domain} HTTPS配置`, 3, 1000);
    }

    // 删除旧证书
    async deleteOldCert(oldCertId: string | null): Promise<boolean> {
        if (!oldCertId) {
            logger.info('无旧证书需要删除');
            return true;
        }

        return this.withRetry(async () => {
            const requestURL = `https://api.qiniu.com/sslcert/${oldCertId}`;
            const authHeader = this.generateAuthHeader(requestURL, '');

            const response = await del({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                noCache: true
            });

            if (response.data) {
                logger.info(`旧证书 ${oldCertId} 已删除`);
                return true;
            } else {
                throw new Error(`删除旧证书 ${oldCertId} 失败: 响应数据为空`);
            }
        }, `删除旧证书 ${oldCertId}`, 3, 1000);
    }

    // 读取旧证书记录
    private async readCertRecord(): Promise<{ oldCertId: string | null; updateTime: string | null }> {
        try {
            const recordFile = path.join(process.cwd(), 'data', 'cert_record.json');

            try {
                await fs.access(recordFile);
            } catch {
                return { oldCertId: null, updateTime: null };
            }

            const data = await fs.readFile(recordFile, 'utf8');
            const record = JSON.parse(data);
            logger.info(`读取到旧证书记录: ${record.oldCertId}`);
            return record;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`读取证书记录失败: ${errorMessage}`);
            return { oldCertId: null, updateTime: null };
        }
    }

    // 写入新证书记录
    private async writeCertRecord(newCertId: string): Promise<boolean> {
        try {
            const dataDir = path.join(process.cwd(), 'data');

            try {
                await fs.access(dataDir);
            } catch {
                await fs.mkdir(dataDir, { recursive: true });
            }

            const recordFile = path.join(dataDir, 'cert_record.json');
            const record = {
                oldCertId: newCertId,
                updateTime: new Date().toISOString(),
                domains: this.config.domains
            };

            await fs.writeFile(recordFile, JSON.stringify(record, null, 2));
            logger.info(`新证书ID已保存: ${newCertId}`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`保存证书记录失败: ${errorMessage}`);
            return false;
        }
    }

    // 主执行函数
    async execute(): Promise<{ code: number; message: string; data: any }> {
        // 对整个流程也添加重试，但次数较少（2次），延迟较长
        return this.withRetry(async () => {
            logger.info('开始SSL证书更新流程...');

            // 读取旧证书记录
            const record = await this.readCertRecord();
            const oldCertId = record.oldCertId;

            // 从WebDAV读取证书
            const { cert, key } = await this.readCertFilesFromWebDAV();

            // 上传新证书到七牛云
            const newCertId = await this.uploadCert(cert, key);

            // 更新域名证书配置
            const updateResult = await this.updateDomainCerts(newCertId, cert, key);

            // 删除旧证书（如果存在）
            if (oldCertId) {
                await this.deleteOldCert(oldCertId);
            }

            // 保存新证书记录
            await this.writeCertRecord(newCertId);

            logger.info('SSL证书更新流程完成');

            return {
                code: 200,
                message: 'SSL证书更新成功',
                data: {
                    newCertId,
                    oldCertId,
                    updatedDomains: updateResult.success,
                    failedDomains: updateResult.failed,
                    recordSaved: true
                }
            };
        }, 'SSL证书更新整体流程', 2, 3000); // 整体流程重试2次，延迟3秒
    }
}

export const handleRoute = async (c: ListContext, noCache: boolean): Promise<OtherData> => {
    const sslConfig = getSSLConfig();

    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');
    const token = authHeader || queryToken || '';
    logger.info(`token: ${token}`);


    if (!token || token !== config.SSL_SECRET_KEY) {
        logger.warn(`token 验证失败: 提供的 token="${token}", 期望的 token 长度=${config.SSL_SECRET_KEY?.length}`);
        throw new HttpError(401, `${c.req.path} 访问未经授权`);
    }

    // 验证必要的配置
    if (!sslConfig.accessKey || !sslConfig.secretKey) {
        throw new HttpError(400, 'QINIU_ACCESS_KEY / QINIU_SECRET_KEY 未知或为空，请检查环境变量配置');
    }

    if (!sslConfig.webdav.username || !sslConfig.webdav.password) {
        throw new HttpError(400, 'WEBDAV_USERNAME / WEBDAV_PASSWORD 环境变量未设置');
    }

    // 执行SSL更新
    const sslManager = new QiniuSSLManager(sslConfig);
    const result = await sslManager.execute();

    // 构建返回数据
    const routeData: OtherData = {
        name: "SSL证书更新",
        title: "七牛云SSL证书自动更新",
        description: "自动从WebDAV获取证书并更新到七牛云CDN",
        code: result.code.toString(),
        msg: result.message,
        data: result.data
    };

    return routeData;
};