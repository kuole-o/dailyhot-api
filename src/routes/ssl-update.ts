import type { OtherData, ListContext } from "../types.js";
import { get, post, put, del } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { createClient } from "webdav";
import { config, getSSLConfig } from "../config.js";
import qiniu from 'qiniu';

// 定义证书信息接口
interface CertInfo {
    certid: string;
    name: string;
    common_name: string;
    dnsnames: string[];
    not_before: number;
    not_after: number;
    create_time: number;
}

interface CertDetail extends Omit<CertInfo, 'certid'> {
    pri: string;
    ca: string;
}

class QiniuSSLManager {
    private accessKey: string;
    private secretKey: string;
    private webdavClient: any;
    private config: any;
    private mac: qiniu.auth.digest.Mac;

    constructor(config: any) {
        this.config = config;
        this.accessKey = config.accessKey;
        this.secretKey = config.secretKey;

        // 初始化七牛云认证对象
        this.mac = new qiniu.auth.digest.Mac(this.accessKey, this.secretKey);

        logger.info(`🔐 [配置检查] AccessKey 长度: ${this.accessKey?.length}, 前5位: ${this.accessKey?.substring(0, 5)}...`);
        logger.info(`🔐 [配置检查] SecretKey 长度: ${this.secretKey?.length}, 前5位: ${this.secretKey?.substring(0, 5)}...`);
        logger.info(`🔐 [配置检查] WebDAV 服务器: ${config.webdav?.server}`);

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

                // 如果是401错误，立即失败不重试
                if (errorMessage.includes('401') || (error as any)?.response?.status === 401) {
                    logger.error(`🔐 [认证失败] ${operationName}: ${errorMessage}`);
                    throw error;
                }

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

    // 使用七牛云SDK生成认证头
    private generateAuthHeader(url: string, body: any = ''): string {
        try {
            // 确保body是字符串
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

            logger.debug(`🔐 [SDK签名] 生成认证令牌, URL: ${url}, Body长度: ${bodyStr.length}`);
            logger.debug(`🔐 [密钥信息] AccessKey: ${this.accessKey.substring(0, 10)}..., SecretKey: ${this.secretKey.substring(0, 10)}...`);
            logger.debug(`🔐 [SDK签名] Body类型: ${typeof body}, 转换后类型: ${typeof bodyStr}`);

            // 使用七牛云SDK生成认证令牌
            const accessToken = qiniu.util.generateAccessToken(this.mac, url, body);

            logger.debug(`🔐 [SDK签名] 生成的认证令牌: ${accessToken}`);
            return accessToken;
        } catch (error) {
            logger.error(`🔐 [SDK签名错误] 生成认证令牌失败: ${error}`);
            // 记录详细的错误信息
            if (error instanceof Error) {
                logger.error(`🔐 [SDK签名错误] 错误堆栈: ${error.stack}`);
            }
            throw error;
        }
    }

    // 生成带日期的证书名称
    private generateCertName(): string {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD格式
        return `lucky_${dateStr}`;
    }

    // 检查证书名称是否匹配lucky模式
    private isLuckyCert(certName: string): boolean {
        return certName === 'lucky' || certName.startsWith('lucky_');
    }

    // 获取域名列表
    async getDomainList(): Promise<string[]> {
        return this.withRetry(async () => {
            const requestURL = 'https://api.qiniu.com/domain';
            logger.info(`🌐 [API调用] 获取域名列表: ${requestURL}`);

            const authHeader = this.generateAuthHeader(requestURL, '');

            const response = await get({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
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

            logger.debug(`📁 [WebDAV] 证书文件路径: ${remoteCertPath}`);
            logger.debug(`📁 [WebDAV] 密钥文件路径: ${remoteKeyPath}`);

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

    // 获取证书列表（包括所有lucky和lucky_开头的证书）
    async getCertList(): Promise<CertInfo[]> {
        return this.withRetry(async () => {
            const requestURL = 'https://api.qiniu.com/sslcert';
            logger.info(`🌐 [API调用] 获取证书列表: ${requestURL}`);

            const authHeader = this.generateAuthHeader(requestURL, '');

            const response = await get({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                noCache: true
            });

            if (response.data && Array.isArray(response.data.certs)) {
                const certs = response.data.certs as CertInfo[];
                logger.info(`获取到 ${certs.length} 个证书`);

                // 筛选名称为 'lucky' 或以 'lucky_' 开头的证书
                const luckyCerts = certs.filter(cert => this.isLuckyCert(cert.name));
                logger.info(`找到 ${luckyCerts.length} 个名称为 'lucky' 或 'lucky_*' 的证书`);
                
                // 记录找到的证书名称
                if (luckyCerts.length > 0) {
                    const certNames = luckyCerts.map(cert => cert.name).join(', ');
                    logger.info(`找到的证书名称: ${certNames}`);
                }

                return luckyCerts;
            } else {
                throw new Error('获取证书列表失败：响应格式不正确');
            }
        }, '获取证书列表', 3, 1000);
    }

    // 获取证书详情
    async getCertDetail(certId: string): Promise<CertDetail> {
        return this.withRetry(async () => {
            const requestURL = `https://api.qiniu.com/sslcert/${certId}`;
            logger.info(`🌐 [API调用] 获取证书详情: ${requestURL}`);

            const authHeader = this.generateAuthHeader(requestURL, '');

            const response = await get({
                url: requestURL,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                noCache: true
            });

            if (response.data) {
                return response.data as CertDetail;
            } else {
                throw new Error(`获取证书详情失败：证书ID ${certId}`);
            }
        }, `获取证书详情 ${certId}`, 3, 1000);
    }

    // 检查证书是否需要更新
    async shouldUploadNewCert(localCert: string, localKey: string): Promise<{ shouldUpload: boolean; reason: string; existingCertId?: string }> {
        try {
            const certList = await this.getCertList();

            if (certList.length === 0) {
                return { shouldUpload: true, reason: '七牛云上没有找到名称为 lucky 或 lucky_* 的证书，需要上传新证书' };
            }

            // 如果有多个 lucky 证书，选择最新的（创建时间最晚的）
            const latestCert = certList.reduce((latest, current) =>
                current.create_time > latest.create_time ? current : latest
            );

            // 获取证书详情进行比较
            const certDetail = await this.getCertDetail(latestCert.certid);

            // 比较证书内容
            if (certDetail.ca === localCert && certDetail.pri === localKey) {
                return {
                    shouldUpload: false,
                    reason: '本地证书与七牛云上最新证书内容完全相同，无需重复上传',
                    existingCertId: latestCert.certid
                };
            }

            // 检查证书有效期
            const currentTime = Math.floor(Date.now() / 1000);
            if (latestCert.not_after <= currentTime) {
                return {
                    shouldUpload: true,
                    reason: '七牛云上证书已过期，需要上传新证书'
                };
            }

            // 如果本地证书的有效期更短，给出警告但继续上传
            // 注意：从本地证书解析有效期比较复杂，暂时只比较内容

            return {
                shouldUpload: true,
                reason: '本地证书与七牛云上证书内容不同，需要上传新证书'
            };

        } catch (error) {
            logger.error(`检查证书更新状态失败: ${error}`);
            // 如果检查失败，保守策略是继续上传
            return {
                shouldUpload: true,
                reason: `检查证书状态失败: ${error}`
            };
        }
    }

    // 上传证书到七牛云
    async uploadCert(cert: string, key: string): Promise<string> {
        return this.withRetry(async () => {
            // 先检查是否需要上传
            const checkResult = await this.shouldUploadNewCert(cert, key);

            if (!checkResult.shouldUpload) {
                logger.info(`📋 [证书检查] ${checkResult.reason}`);
                if (checkResult.existingCertId) {
                    logger.info(`📋 [证书检查] 将使用现有证书ID: ${checkResult.existingCertId}`);
                    return checkResult.existingCertId;
                }
            }

            logger.info(`📋 [证书检查] ${checkResult.reason}`);

            // 生成带日期的证书名称
            const certName = this.generateCertName();
            const requestURL = 'https://api.qiniu.com/sslcert';
            logger.info(`🌐 [API调用] 上传证书: ${requestURL}, 证书名称: ${certName}`);

            const requestBody = JSON.stringify({
                name: certName,
                common_name: '*.guole.fun',
                pri: key,
                ca: cert
            });

            const authHeader = this.generateAuthHeader(requestURL, '');

            try {
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
                    logger.error(`上传证书失败，响应数据: ${JSON.stringify(response.data)}`);
                    throw new Error('上传证书失败：响应中缺少certID');
                }
            } catch (error: any) {
                logger.error(`🌐 [上传证书详细错误]`);
                logger.error(`🔐 [认证头调试] 请求Body长度: ${requestBody.length}`);
                if (error.response) {
                    logger.error(`🌐 [错误响应] 状态: ${error.response.status}`);
                    logger.error(`🌐 [错误响应] 数据: ${JSON.stringify(error.response.data)}`);
                }
                throw error;
            }
        }, '上传证书到七牛云', 3, 1500);
    }

    // 更新域名SSL配置
    async updateDomainCerts(newCertId: string): Promise<{ success: string[], failed: Array<{ domain: string, error: string }> }> {
        const domains = await this.getDomainList();

        if (domains.length === 0) {
            throw new Error('没有找到可用的域名');
        }

        const success: string[] = [];
        const failed: Array<{ domain: string, error: string }> = [];

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
            logger.info(`🌐 [API调用] 更新HTTPS配置: ${requestURL}`);

            const requestBody = JSON.stringify({
                certId: certId,
                forceHttps: true,
                http2Enable: true
            });

            const authHeader = this.generateAuthHeader(requestURL, '');

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

    // 删除旧证书（支持批量删除）
    async deleteOldCerts(oldCertIds: string[], excludeCertId?: string): Promise<{ success: string[], failed: Array<{ certId: string, error: string }> }> {
        if (oldCertIds.length === 0) {
            logger.info('无旧证书需要删除');
            return { success: [], failed: [] };
        }

        const success: string[] = [];
        const failed: Array<{ certId: string, error: string }> = [];

        // 过滤掉要排除的证书ID（当前正在使用的证书）
        const certsToDelete = excludeCertId
            ? oldCertIds.filter(id => id !== excludeCertId)
            : oldCertIds;

        if (certsToDelete.length === 0) {
            logger.info('没有需要删除的旧证书（所有证书都在使用中）');
            return { success: [], failed: [] };
        }

        logger.info(`准备删除 ${certsToDelete.length} 个旧证书: ${certsToDelete.join(', ')}`);

        for (const certId of certsToDelete) {
            try {
                await this.deleteSingleCert(certId);
                success.push(certId);
                logger.info(`旧证书 ${certId} 已删除`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                failed.push({ certId, error: errorMessage });
                logger.error(`删除旧证书 ${certId} 失败: ${errorMessage}`);
            }
        }

        return { success, failed };
    }

    // 删除单个证书
    private async deleteSingleCert(certId: string): Promise<boolean> {
        return this.withRetry(async () => {
            const requestURL = `https://api.qiniu.com/sslcert/${certId}`;
            logger.info(`🌐 [API调用] 删除证书: ${requestURL}`);

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
                return true;
            } else {
                throw new Error(`删除证书 ${certId} 失败: 响应数据为空`);
            }
        }, `删除证书 ${certId}`, 3, 1000);
    }

    // 主执行函数
    async execute(): Promise<{ code: number; message: string; data: any }> {
        return this.withRetry(async () => {
            logger.info('开始SSL证书更新流程...');

            // 获取现有证书列表
            const oldCertList = await this.getCertList();
            const oldCertIds = oldCertList.map(cert => cert.certid);
            logger.info(`当前七牛云上有 ${oldCertIds.length} 个名称为 lucky 的证书: ${oldCertIds.join(', ')}`);

            // 从WebDAV读取证书
            const { cert, key } = await this.readCertFilesFromWebDAV();

            const domains = await this.getDomainList();
            logger.info(`将更新以下域名的证书: ${domains.join(', ')}`);

            // 上传新证书到七牛云（内部会检查是否需要上传）
            const newCertId = await this.uploadCert(cert, key);

            // 更新域名证书配置
            const updateResult = await this.updateDomainCerts(newCertId);

            // 删除旧证书（排除当前正在使用的新证书）
            const deleteResult = await this.deleteOldCerts(oldCertIds, newCertId);

            logger.info('SSL证书更新流程完成');

            return {
                code: 200,
                message: 'SSL证书更新成功',
                data: {
                    newCertId,
                    oldCertIds,
                    updatedDomains: updateResult.success,
                    failedDomains: updateResult.failed,
                    deletedCerts: deleteResult.success,
                    failedDeletions: deleteResult.failed
                }
            };
        }, 'SSL证书更新整体流程', 2, 3000);
    }
}

export const handleRoute = async (c: ListContext, noCache: boolean): Promise<OtherData> => {
    const sslConfig = getSSLConfig();

    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');
    const token = authHeader || queryToken || '';

    if (!token || token !== config.SSL_SECRET_KEY) {
        logger.warn(`🔑 [Token验证失败] 访问未经授权`);
        throw new HttpError(401, `${c.req.path} 访问未经授权`);
    }

    // 验证必要的配置
    if (!sslConfig.accessKey || !sslConfig.secretKey) {
        logger.error(`❌ [配置检查] AccessKey 或 SecretKey 未设置`);
        throw new HttpError(400, 'QINIU_ACCESS_KEY / QINIU_SECRET_KEY 未知或为空，请检查环境变量配置');
    }

    if (!sslConfig.webdav.username || !sslConfig.webdav.password) {
        logger.error(`❌ [配置检查] WebDAV用户名或密码未设置`);
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