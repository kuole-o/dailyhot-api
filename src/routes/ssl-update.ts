import type { OtherData, ListContext } from "../types.js";
import { get, post, put, del } from "../utils/getData.js";
import { HttpError } from "../utils/errors.js";
import logger from "../utils/logger.js";
import { createClient } from "webdav";
import { config, getSSLConfig } from "../config.js";
import qiniu from 'qiniu';
import * as crypto from 'crypto';

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
    fingerprint?: string;
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

    // 计算 PEM 证书的 SHA1 指纹，不受换行/空格差异影响
    private computeFingerprint(pem: string): string {
        try {
            const b64 = pem
                .replace(/-----BEGIN CERTIFICATE-----/g, '')
                .replace(/-----END CERTIFICATE-----/g, '')
                .replace(/\s/g, '');
            const der = Buffer.from(b64, 'base64');
            return crypto.createHash('sha1').update(der).digest('hex').toLowerCase();
        } catch (error) {
            logger.error(`计算证书指纹失败: ${error}`);
            return '';
        }
    }

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

                if (errorMessage.includes('401') || (error as any)?.response?.status === 401) {
                    logger.error(`🔐 [认证失败] ${operationName}: ${errorMessage}`);
                    throw error;
                }

                // 证书已绑定域名：七牛不允许删除在用证书，不重试
                if (errorMessage.includes('证书已绑定域名')) {
                    logger.warn(`⏭️ [跳过] ${operationName}: ${errorMessage}`);
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

    // 生成带指纹的证书名称，同一天同一证书不会重复上传
    private generateCertName(fingerprint: string): string {
        const now = new Date();
        const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const dateStr = beijingTime.toISOString().slice(0, 10).replace(/-/g, '');
        const shortFp = fingerprint.slice(0, 8);
        return `lucky_${dateStr}_${shortFp}`;
    }

    private isLuckyCert(certName: string): boolean {
        return certName === 'lucky' || certName.startsWith('lucky_');
    }

    private generateAuthHeader(url: string, body: any = ''): string {
        try {
            const accessToken = qiniu.util.generateAccessToken(this.mac, url, body);
            logger.debug(`🔐 [SDK签名] 生成的认证令牌: ${accessToken}`);
            return accessToken;
        } catch (error) {
            logger.error(`🔐 [SDK签名错误] 生成认证令牌失败: ${error}`);
            if (error instanceof Error) {
                logger.error(`🔐 [SDK签名错误] 错误堆栈: ${error.stack}`);
            }
            throw error;
        }
    }

    // 获取域名列表（包含当前绑定的证书ID，用于幂等检查）
    async getDomainList(): Promise<{ name: string; certId?: string }[]> {
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
                noCache: true,
                ttl: 10000
            });

            if (response.data && response.data.domains) {
                const domains = response.data.domains;
                logger.info(`获取到 ${domains.length} 个域名`);

                const targetDomains = domains
                    .filter((domain: any) =>
                        domain.name.endsWith('.guole.fun') &&
                        domain.operatingState === 'success'
                    )
                    .map((domain: any) => ({
                        name: domain.name,
                        certId: domain.certId || domain.cert_id || undefined
                    }));

                logger.info(`找到 ${targetDomains.length} 个 guole.fun 子域名: ${targetDomains.map((d: { name: string; certId?: string }) => d.name).join(', ')}`);
                return targetDomains;
            } else {
                throw new Error('获取域名列表失败：响应格式不正确');
            }
        }, '获取域名列表', 2, 1000);
    }

    async readCertFilesFromWebDAV(): Promise<{ cert: string; key: string }> {
        try {
            logger.info('连接WebDAV服务器获取证书文件...');

            const remoteCertPath = `${this.config.webdav.certPath}/${this.config.certFileName}`;
            const remoteKeyPath = `${this.config.webdav.certPath}/${this.config.keyFileName}`;

            logger.debug(`📁 [WebDAV] 证书文件路径: ${remoteCertPath}`);
            logger.debug(`📁 [WebDAV] 密钥文件路径: ${remoteKeyPath}`);

            const certExists = await this.webdavClient.exists(remoteCertPath);
            const keyExists = await this.webdavClient.exists(remoteKeyPath);

            if (!certExists || !keyExists) {
                throw new Error(`证书文件不存在: ${!certExists ? this.config.certFileName : ''} ${!keyExists ? this.config.keyFileName : ''}`);
            }

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
                noCache: true,
                ttl: 10000
            });

            if (response.data && Array.isArray(response.data.certs)) {
                const certs = response.data.certs as CertInfo[];
                logger.info(`获取到 ${certs.length} 个证书`);

                const luckyCerts = certs.filter(cert => this.isLuckyCert(cert.name));
                logger.info(`找到 ${luckyCerts.length} 个名称为 'lucky' 或 'lucky_*' 的证书`);

                if (luckyCerts.length > 0) {
                    const certNames = luckyCerts.map(cert => cert.name).join(', ');
                    logger.info(`找到的证书名称: ${certNames}`);
                }

                return luckyCerts;
            } else {
                throw new Error('获取证书列表失败：响应格式不正确');
            }
        }, '获取证书列表', 2, 1000);
    }

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
                noCache: true,
                ttl: 10000
            });

            if (response.data) {
                return response.data as CertDetail;
            } else {
                throw new Error(`获取证书详情失败：证书ID ${certId}`);
            }
        }, `获取证书详情 ${certId}`, 2, 1000);
    }

    // 基于 SHA1 指纹比较，不受 PEM 格式差异影响
    async shouldUploadNewCert(localCert: string, localKey: string): Promise<{ shouldUpload: boolean; reason: string; existingCertId?: string }> {
        try {
            const localFingerprint = this.computeFingerprint(localCert);
            if (!localFingerprint) {
                logger.warn('无法计算本地证书指纹，跳过检查');
                return { shouldUpload: true, reason: '无法计算本地证书指纹，继续上传' };
            }

            logger.info(`🔍 [证书指纹] 本地证书指纹: ${localFingerprint}`);

            const certList = await this.getCertList();

            if (certList.length === 0) {
                return { shouldUpload: true, reason: '七牛云上没有找到 lucky 证书，需要上传新证书' };
            }

            // 遍历所有 lucky 证书，找指纹匹配的
            for (const cert of certList) {
                try {
                    const certDetail = await this.getCertDetail(cert.certid);

                    let remoteFingerprint = certDetail.fingerprint;
                    if (!remoteFingerprint) {
                        remoteFingerprint = this.computeFingerprint(certDetail.ca);
                    }

                    logger.info(`🔍 [证书指纹] 远程证书 ${cert.certid} (${cert.name}) 指纹: ${remoteFingerprint}`);

                    if (remoteFingerprint && remoteFingerprint.toLowerCase() === localFingerprint) {
                        logger.info(`✅ [证书匹配] 本地证书与远程证书 ${cert.certid} 指纹一致`);

                        const currentTime = Math.floor(Date.now() / 1000);
                        if (cert.not_after > currentTime) {
                            return {
                                shouldUpload: false,
                                reason: '指纹匹配且证书有效，无需重复上传',
                                existingCertId: cert.certid
                            };
                        } else {
                            logger.warn(`⚠️ [证书过期] 远程证书 ${cert.certid} 已过期，需要上传新证书`);
                            return { shouldUpload: true, reason: '现有证书已过期，需要上传新证书' };
                        }
                    }
                } catch (detailError) {
                    logger.warn(`获取证书 ${cert.certid} 详情失败: ${detailError}，继续检查下一个`);
                    continue;
                }
            }

            const latestCert = certList.reduce((latest, current) =>
                current.create_time > latest.create_time ? current : latest
            );
            const currentTime = Math.floor(Date.now() / 1000);
            if (latestCert.not_after <= currentTime) {
                return { shouldUpload: true, reason: '所有 lucky 证书均已过期，需要上传新证书' };
            }

            return {
                shouldUpload: true,
                reason: '本地证书指纹与七牛云上所有 lucky 证书均不匹配，需要上传新证书'
            };

        } catch (error) {
            logger.error(`检查证书更新状态失败: ${error}`);
            return {
                shouldUpload: true,
                reason: `检查证书状态失败: ${error}`
            };
        }
    }

    // 上传证书到七牛云
    async uploadCert(cert: string, key: string): Promise<string> {
        const localFingerprint = this.computeFingerprint(cert);

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

        // 生成带指纹的证书名称，确保同一证书不会重复上传
        const certName = this.generateCertName(localFingerprint);
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
                noCache: true,
                ttl: 10000
            });

            if (response.data && response.data.certID) {
                logger.info(`新证书上传成功，ID: ${response.data.certID}, 名称: ${certName}`);
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
    }

    // 更新域名SSL配置（幂等：检查当前绑定，相同则跳过）
    async updateDomainCerts(newCertId: string): Promise<{ success: string[], failed: Array<{ domain: string, error: string }> }> {
        const domains = await this.getDomainList();

        if (domains.length === 0) {
            throw new Error('没有找到可用的域名');
        }

        const success: string[] = [];
        const failed: Array<{ domain: string, error: string }> = [];

        for (const domain of domains) {
            try {
                // 检查当前绑定是否已经是目标证书，避免重复绑定
                if (domain.certId === newCertId) {
                    logger.info(`⏭️ [跳过] 域名 ${domain.name} 已绑定证书 ${newCertId}，无需更新`);
                    success.push(domain.name);
                    continue;
                }

                await this.updateDomainHttpsConfig(domain.name, newCertId);
                success.push(domain.name);
                logger.info(`证书已绑定到域名: ${domain.name}`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                failed.push({ domain: domain.name, error: errorMessage });
                logger.error(`绑定域名 ${domain.name} 失败: ${errorMessage}`);
            }
        }

        return { success, failed };
    }

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
                noCache: true,
                ttl: 10000
            });

            return response.data;
        }, `更新域名 ${domain} HTTPS配置`, 2, 1000);
    }

    // 删除旧证书（跳过仍被域名绑定的证书）
    async deleteOldCerts(oldCertIds: string[], excludeCertId?: string): Promise<{ success: string[], failed: Array<{ certId: string, error: string }> }> {
        if (oldCertIds.length === 0) {
            logger.info('无旧证书需要删除');
            return { success: [], failed: [] };
        }

        const success: string[] = [];
        const failed: Array<{ certId: string, error: string }> = [];

        const certsToDelete = excludeCertId
            ? oldCertIds.filter(id => id !== excludeCertId)
            : oldCertIds;

        // 获取当前域名绑定情况，跳过正在使用的证书
        let domainsWithCerts: { name: string; certId?: string }[] = [];
        try {
            domainsWithCerts = await this.getDomainList();
        } catch (error) {
            logger.warn(`获取域名列表失败，将跳过所有"证书已绑定域名"错误: ${error}`);
        }

        const boundCertIds = new Set(domainsWithCerts
            .filter(d => d.certId)
            .map(d => d.certId));

        const trulyUnused = certsToDelete.filter(id => !boundCertIds.has(id));

        if (trulyUnused.length === 0 && certsToDelete.length > 0) {
            logger.info('所有旧证书均被域名绑定中，无需删除');
            return { success: [], failed: [] };
        }

        logger.info(`准备删除 ${trulyUnused.length} 个未被绑定的旧证书: ${trulyUnused.join(', ')}`);

        for (const certId of certsToDelete) {
            if (boundCertIds.has(certId)) {
                logger.info(`⏭️ [跳过] 证书 ${certId} 正在被域名使用，不删除`);
                success.push(certId);
                continue;
            }

            try {
                await this.deleteSingleCert(certId);
                success.push(certId);
                logger.info(`旧证书 ${certId} 已删除`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('证书已绑定域名')) {
                    logger.warn(`⏭️ [跳过] 证书 ${certId} 仍被域名绑定，跳过删除`);
                    success.push(certId);
                } else {
                    failed.push({ certId, error: errorMessage });
                    logger.error(`删除旧证书 ${certId} 失败: ${errorMessage}`);
                }
            }
        }

        return { success, failed };
    }

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
                noCache: true,
                ttl: 10000
            });

            if (response.data) {
                return true;
            } else {
                throw new Error(`删除证书 ${certId} 失败: 响应数据为空`);
            }
        }, `删除证书 ${certId}`, 2, 1000);
    }

    // 主执行函数
    async execute(): Promise<{ code: number; message: string; data: any }> {
        logger.info('开始SSL证书更新流程...');

        const oldCertList = await this.getCertList();
        const oldCertIds = oldCertList.map(cert => cert.certid);
        logger.info(`当前七牛云上有 ${oldCertIds.length} 个名称为 lucky 或 lucky_* 的证书: ${oldCertIds.join(', ')}`);

        const { cert, key } = await this.readCertFilesFromWebDAV();

        const localFingerprint = this.computeFingerprint(cert);
        logger.info(`🔍 [本地证书指纹] ${localFingerprint}`);

        const domains = await this.getDomainList();
        logger.info(`将更新以下域名的证书: ${domains.map(d => d.name).join(', ')}`);

        const newCertId = await this.uploadCert(cert, key);

        const updateResult = await this.updateDomainCerts(newCertId);

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
                failedDeletions: deleteResult.failed,
                localFingerprint
            }
        };
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

    if (!sslConfig.accessKey || !sslConfig.secretKey) {
        logger.error(`❌ [配置检查] AccessKey 或 SecretKey 未设置`);
        throw new HttpError(400, 'QINIU_ACCESS_KEY / QINIU_SECRET_KEY 未知或为空，请检查环境变量配置');
    }

    if (!sslConfig.webdav.username || !sslConfig.webdav.password) {
        logger.error(`❌ [配置检查] WebDAV用户名或密码未设置`);
        throw new HttpError(400, 'WEBDAV_USERNAME / WEBDAV_PASSWORD 环境变量未设置');
    }

    const sslManager = new QiniuSSLManager(sslConfig);
    const result = await sslManager.execute();

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
