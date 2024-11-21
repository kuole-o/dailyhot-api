#!/bin/bash
echo -e "\033[0;32mDeploying updates to api.guole.fun...\033[0m"

cd d:/src/api

# 定义目标目录
TARGET_DIR="public"
# 拷贝当前目录下的 package.json 到目标目录
cp package.json "$TARGET_DIR/package.json"
# 检查拷贝是否成功
if [ $? -eq 0 ]; then
  echo "已成功将 package.json 拷贝到 $TARGET_DIR/"
else
  echo "拷贝 package.json 失败"
  exit 1
fi

git add .
msg="🏖️ API更新于 `date`"
if [ $# -eq 1 ]
  then msg="$1"
fi
git commit -m "$msg"

# Push source and build repos.
git push github main

#./deplay.bat

# push执行完成，不自动退出
exec /bin/bash