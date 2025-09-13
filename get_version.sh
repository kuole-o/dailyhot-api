#!/bin/bash
VERSION=$(node -p "require('./package.json').version")
echo "PACKAGE_VERSION=$VERSION" >> $GITHUB_OUTPUT