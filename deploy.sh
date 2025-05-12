#!/bin/bash

# 確実にus-east-1リージョンにデプロイするためのスクリプト

# ビルド
npm run build

# 明示的にus-east-1リージョンを指定してデプロイ
npx cdk deploy --region us-east-1
