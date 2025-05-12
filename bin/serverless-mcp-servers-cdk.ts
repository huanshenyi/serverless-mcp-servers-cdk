#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerlessMcpServersCdkStack } from '../lib/serverless-mcp-servers-cdk-stack';

// 環境変数に関わらず、明示的にus-east-1リージョンを指定
const app = new cdk.App();
new ServerlessMcpServersCdkStack(app, 'ServerlessMcpServersCdkStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID, 
    region: 'us-east-1' // 明示的にus-east-1リージョンを指定
  },
});

// cdk.jsonにも設定を追加するか、以下のようにコマンドラインで指定することも可能:
// cdk deploy --region us-east-1
