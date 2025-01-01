#!/bin/bash

echo -e "\033[0;32mDeploying updates to api.guole.fun...\033[0m"

# 检测系统类型
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  # Windows 环境路径
  PROJECT_DIR="d:/src/api"
else
  # macOS 或其他 UNIX 环境路径
  PROJECT_DIR="/Users/guole/Documents/src/api"
fi

# 切换到项目目录
cd "$PROJECT_DIR" || { echo "项目路径不存在: $PROJECT_DIR"; exit 1; }

# 移动 package.json（如需要）
# rm -f public/package.json
# cp node_modules/guole.fun.api/package.json public

# 提交更改
git add .
msg="🏖️ API更新于 $(date '+%Y-%m-%d %H:%M:%S')"
if [ $# -eq 1 ]; then
  msg="$1"
fi
git commit -m "$msg"

# 推送代码
git push github main

# 继续执行（保留 Bash 环境）
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
  exec /bin/bash
fi