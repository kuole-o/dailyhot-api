FROM node:20-alpine AS base

# 设置时区
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apk del tzdata

ENV NODE_ENV=docker

# 清理缓存
RUN rm -rf /var/cache/apk/*

# 构建阶段
FROM base AS builder

RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

COPY package*json tsconfig.json pnpm-lock.yaml .env.example ./
COPY src ./src
COPY public ./public

# 复制环境变量
RUN [ ! -e ".env" ] && cp .env.example .env || true

# 安装依赖
RUN pnpm install
RUN pnpm build
RUN pnpm prune --production

# 运行阶段
FROM base AS runner

# 从构建命令接收参数
ARG APP_VERSION

# 启用内存过量使用（解决 Redis 警告）
RUN echo "vm.overcommit_memory = 1" >> /etc/sysctl.conf

# 创建用户和组
RUN addgroup --system --gid 114514 nodejs
RUN adduser --system --uid 114514 hono

# 创建日志目录并设置权限
RUN mkdir -p /app/logs && \
    chown -R hono:nodejs /app/logs && \
    chmod -R 775 /app/logs

# 创建符号链接
RUN ln -sf /app/logs /logs && \
    chown -h hono:nodejs /logs

# 复制文件
COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/public /app/public
COPY --from=builder --chown=hono:nodejs /app/.env /app/.env
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

# 环境变量
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    GAODE_KEY='' \
    UMAMI_USER_NAME='admin' \
    UMAMI_USER_PASSWORD='password' \
    UMAMI_TOKEN='' \
    LEANCLOUD_APPID='' \
    LEANCLOUD_APPKEY='' \
    REDIS_HOST='' \
    REDIS_PORT='' \
    REDIS_PASSWORD='' \
    USE_LOG_FILE=true \
    LOG_LEVEL=info \
    APP_VERSION=${APP_VERSION} \
    QINIU_ACCESS_KEY='七牛云AccessKey' \
    QINIU_SECRET_KEY='七牛云SecretKey' \
    QINIU_BUCKET='七牛云存储桶名称' \
    WEBDAV_SERVER='WebDAV服务器地址' \
    WEBDAV_USERNAME='WebDAV用户名' \
    WEBDAV_PASSWORD='WebDAV密码' \
    WEBDAV_CERT_PATH='WebDAV证书路径' \
    CERT_FILE_NAME='证书文件名' \
    KEY_FILE_NAME='私钥文件名' \
    DATA_DIR='旧证书id存储路径' \
    SSL_SECRET_KEY='证书更新接口的鉴权token' \
    BBTALK_TOKEN='自定义授权秘钥' \
    BBTALK_PAGE_SIZE=10 \
    BBTALK_JSON_PATH='存储桶上传目标路径' \
    LEANCLOUD_APP_ID='LeanCloud应用ID' \
    LEANCLOUD_APP_KEY='LeanCloud应用Key' \
    LEANCLOUD_MASTER_KEY='LeanCloud主密钥' \
    LEANCLOUD_SERVER_URL='自定义leancloud服务地址'


# 切换用户
USER hono

# 暴露端口
EXPOSE 6688

# 运行
CMD ["node", "/app/dist/index.js"]