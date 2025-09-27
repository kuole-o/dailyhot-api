import qiniu from 'qiniu';
import { config } from '../config.js';
import logger from './logger.js';
import * as crypto from 'crypto';

// 明确定义上传选项接口
export interface QiniuUploadOptions {
    bucket: string;
    key: string;
    body: string | Buffer;
    mimeType?: string;
    overwrite?: boolean;
}

export interface QiniuFileInfo {
    hash: string;
    fsize: number;
    putTime: number;
    mimeType: string;
    type: number;
    status: number;
    md5: string;
}

export class QiniuStorageManager {
    private mac: qiniu.auth.digest.Mac;
    private config: qiniu.conf.Config;

    constructor() {
        // 验证配置
        if (!config.QINIU_ACCESS_KEY || !config.QINIU_SECRET_KEY) {
            throw new Error('七牛云配置不完整，请设置 QINIU_ACCESS_KEY 和 QINIU_SECRET_KEY');
        }

        try {
            this.mac = new qiniu.auth.digest.Mac(
                config.QINIU_ACCESS_KEY,
                config.QINIU_SECRET_KEY
            );
        } catch (error) {
            throw error;
        }

        this.config = new qiniu.conf.Config();

        // 华东-浙江	qiniu.zone.Zone_z0
        // 华东-浙江 2	qiniu.zone.Zone_cn_east_2
        // 华北-河北	qiniu.zone.Zone_z1
        // 华南-广东	qiniu.zone.Zone_z2
        // 北美-洛杉矶	qiniu.zone.Zone_na0
        // 亚太-新加坡（原东南亚）	qiniu.zone.Zone_as0

        this.config.zone = qiniu.zone.Zone_z1;
        this.config.useHttpsDomain = true;
    }

    // 生成上传token
    private generateUploadToken(bucket: string, key?: string, overwrite: boolean = false): string {
        const options: qiniu.rs.PutPolicyOptions = {
            scope: key ? `${bucket}:${key}` : bucket,
        };

        // 如果需要覆盖上传，设置 insertOnly 为 0
        if (overwrite) {
            options.insertOnly = 0; // 设置为 0 表示允许覆盖:cite[3]:cite[6]
        }

        if (key) {
            options.scope = `${bucket}:${key}`;
        }

        const putPolicy = new qiniu.rs.PutPolicy(options);
        return putPolicy.uploadToken(this.mac);
    }

    // 上传字符串内容到七牛云 - 使用明确定义的接口
    async uploadString(options: QiniuUploadOptions): Promise<any> {
        return new Promise((resolve, reject) => {
            const { bucket, key, body, mimeType, overwrite = false } = options;

            // 验证参数
            if (!bucket || !key || !body) {
                reject(new Error('上传参数不完整'));
                return;
            }

            const uploadToken = this.generateUploadToken(bucket, key, overwrite);

            const formUploader = new qiniu.form_up.FormUploader(this.config);
            const putExtra = new qiniu.form_up.PutExtra();

            if (mimeType) {
                putExtra.mimeType = mimeType;
            }

            // 处理 body 类型
            let uploadBody: Buffer;
            if (typeof body === 'string') {
                uploadBody = Buffer.from(body, 'utf8');
            } else {
                uploadBody = body;
            }

            formUploader.put(uploadToken, key, uploadBody, putExtra, (err, body, info) => {
                if (err) {
                    logger.error(`七牛云上传失败: ${err.message}`);
                    reject(err);
                    return;
                }

                if (info.statusCode === 200) {
                    logger.info(`文件上传成功: ${key}`);
                    resolve(body);
                } else {
                    const errorMsg = `上传失败[${info.statusCode}]: ${JSON.stringify(body)}`;
                    logger.error(errorMsg);

                    // 处理特定的错误情况 :cite[4]
                    if (info.statusCode === 614 && !overwrite) {
                        // 614 错误：文件已存在，建议启用覆盖上传
                        reject(new Error(`文件已存在，如需覆盖请设置 overwrite: true`));
                    } else if
                        (info.statusCode === 401) {
                        if (errorMsg.includes('bad token')) {
                            reject(new Error('Token 错误，请检查生成 token 的算法或重新生成 token'));
                        } else if (errorMsg.includes('token out of date')) {
                            reject(new Error('Token 已过期，建议设置 token 过期时间为 3600 秒'));
                        } else {
                            reject(new Error('认证授权失败，请检查密钥信息'));
                        }
                    } else if (info.statusCode === 400 && errorMsg.includes('incorrect region')) {
                        reject(new Error('区域设置错误，请检查存储桶区域配置'));
                    } else {
                        reject(new Error(errorMsg));
                    }
                }
            });
        });
    }

    // 上传本地文件到七牛云
    async uploadFile(bucket: string, key: string, localFile: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const uploadToken = this.generateUploadToken(bucket, key);
            const formUploader = new qiniu.form_up.FormUploader(this.config);
            const putExtra = new qiniu.form_up.PutExtra();

            formUploader.putFile(uploadToken, key, localFile, putExtra, (err, body, info) => {
                if (err) {
                    logger.error(`七牛云文件上传失败: ${err.message}`);
                    reject(err);
                    return;
                }
                if (info.statusCode === 200) {
                    logger.info(`本地文件上传成功: ${key}`);
                    resolve(body);
                } else {
                    const errorMsg = `文件上传失败[${info.statusCode}]: ${JSON.stringify(body)}`;
                    logger.error(errorMsg);
                    reject(new Error(errorMsg));
                }
            });
        });
    }

    // 删除文件
    async deleteFile(bucket: string, key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

            bucketManager.delete(bucket, key, (err, body, info) => {
                if (err) {
                    logger.error(`七牛云文件删除失败: ${err.message}`);
                    reject(err);
                    return;
                }
                if (info.statusCode === 200) {
                    logger.info(`文件删除成功: ${key}`);
                    resolve();
                } else {
                    const errorMsg = `删除失败[${info.statusCode}]: ${JSON.stringify(body)}`;
                    logger.error(errorMsg);
                    reject(new Error(errorMsg));
                }
            });
        });
    }

    // 获取文件信息
    async getFileInfo(bucket: string, key: string): Promise<QiniuFileInfo> {
        return new Promise((resolve, reject) => {
            const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

            bucketManager.stat(bucket, key, (err, body, info) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (info.statusCode === 200) {
                    resolve(body as QiniuFileInfo);
                } else {
                    reject(new Error(`获取文件信息失败[${info.statusCode}]: ${JSON.stringify(body)}`));
                }
            });
        });
    }

    // 生成下载URL（私有空间需要）
    generateDownloadUrl(domain: string, key: string, expires: number = 3600): string {
        try {
            const bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
            const deadline = Math.floor(Date.now() / 1000) + expires;

            // 使用正确的参数顺序：domain, key, deadline
            return bucketManager.privateDownloadUrl(domain, key, deadline);
        } catch (error) {
            logger.warn('使用 BucketManager 生成下载URL失败，尝试备用方法', error);

            // 备用方法：手动构造下载URL
            return this.generateManualDownloadUrl(domain, key, expires);
        }
    }

    // 手动生成下载URL
    private generateManualDownloadUrl(domain: string, key: string, expires: number = 3600): string {
        const baseUrl = `https://${domain}/${key}`;
        const deadline = Math.floor(Date.now() / 1000) + expires;

        // 构造待签名的字符串
        const urlToSign = `${baseUrl}?e=${deadline}`;

        // 使用 HMAC-SHA1 签名 :cite[1]
        const sign = this.generateSignature(urlToSign);
        const encodedSign = this.safeEncode(sign);

        return `${urlToSign}&token=${config.QINIU_ACCESS_KEY}:${encodedSign}`;
    }

    // 生成签名 - 使用HMAC-SHA1
    private generateSignature(str: string): string {
        const hmac = crypto.createHmac('sha1', config.QINIU_SECRET_KEY);
        hmac.update(str);
        return hmac.digest('base64');
    }

    // 安全编码函数 :cite[1]
    private safeEncode(str: string): string {
        return str
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // 检查配置有效性
    validateConfig(): boolean {
        return !!(config.QINIU_ACCESS_KEY && config.QINIU_SECRET_KEY && config.QINIU_BUCKET);
    }

    // 获取配置信息（用于调试）
    getConfigInfo(): { hasAccessKey: boolean; hasSecretKey: boolean; hasBucket: boolean } {
        return {
            hasAccessKey: !!config.QINIU_ACCESS_KEY,
            hasSecretKey: !!config.QINIU_SECRET_KEY,
            hasBucket: !!config.QINIU_BUCKET
        };
    }
}