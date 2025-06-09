# Stateless MCP Server on AWS Lambda (CDK 版)

このプロジェクトは、AWS CDK を使用して AWS Lambda と API Gateway 上でステートレスな MCP サーバーを構築します。
[sample-serverless-mcp-servers](https://github.com/aws-samples/sample-serverless-mcp-servers/tree/main/stateless-mcp-on-lambda)の CDK 移植版で、Express.js と Hono (TypeScript) の2つの実装を提供します。

## 前提条件

- AWS CLI (設定済み)
- Node.js 22.x と npm
- AWS CDK

## 📦 セットアップ手順

### 1. 依存関係のインストール

```bash
# メインプロジェクトの依存関係
npm install

# MCP クライアント
(cd src/js/mcpclient && npm install)

# Hono TypeScript MCP サーバー (推奨)
(cd src/ts/mcpserver && npm install)

# Express.js MCP サーバー (オプション)
(cd src/js/mcpserver && npm install)
```

## 🚀 デプロイ手順

### Hono TypeScript 版のデプロイ (推奨)

現在のCDKスタックはHono版を使用するよう設定されています。

```bash
# 1. Hono MCP サーバーをビルド
(cd src/ts/mcpserver && npm run build)

# 2. CDKスタックをデプロイ
npm run build
cdk deploy --region us-east-1
```

### Express.js 版への切り替え

Express.js版を使用したい場合:

1. `lib/serverless-mcp-servers-cdk-stack.ts:33` を編集:
```typescript
// Hono版 (デフォルト)
code: lambda.Code.fromAsset(path.join(__dirname, "../src/ts/mcpserver/dist")),

// Express版に変更
code: lambda.Code.fromAsset(path.join(__dirname, "../src/js/mcpserver")),
```

2. デプロイ:
```bash
npm run build
cdk deploy --region us-east-1
```

## 🔧 ローカル開発・テスト

### Hono TypeScript サーバー

```bash
# 開発サーバー起動 (ホットリロード付き)
(cd src/ts/mcpserver && npm run dev)

# または手動ビルド・実行
(cd src/ts/mcpserver && npm run build && npm start)
```

### Express.js サーバー

```bash
node src/js/mcpserver/index.js
```

### クライアントテスト

```bash
# ローカルサーバーをテスト
node src/js/mcpclient/index.js

# デプロイ済みサーバーをテスト
export MCP_SERVER_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ServerlessMcpServersCdkStack --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='McpEndpoint'].OutputValue" --output text)
node src/js/mcpclient/index.js
```

### Claude & Cursor での設定

```json
{
  "example-local": {
    "command": "/path/to/npx",
    "args": ["mcp-remote", "http://localhost:3000/mcp"]
  },
  "example-remote": {
    "command": "/path/to/npx",
    "args": [
      "mcp-remote",
      "https://{{OutputValue}}.execute-api.us-east-1.amazonaws.com/dev/mcp"
    ]
  }
}
```

## ⚠️ 重要な注意点

- **リージョン制限**: 必ず `us-east-1` リージョンにデプロイしてください (Lambda Web Adapter layer の制約)
- **Honoビルド必須**: Hono版をデプロイする前に必ず `npm run build` を実行してください
- **デプロイ時間**: API Gateway のエンドポイントが利用可能になるまで約1分かかる場合があります

## 📋 利用可能な機能

### MCP Tools
- `ping`: レスポンス時間テスト (100ms/1000msで交互に切り替わり)
- `start-notification-stream`: 定期通知テスト (Hono版のみ)

### MCP Resources
- `greeting-resource`: 静的グリーティングリソース

### MCP Prompts
- `greeting-template`: パーソナライズされたグリーティングプロンプト

## 認証機能

### Bearer Token 認証

MCPサーバーはBearer Token認証をサポートしています。環境変数 `MCP_AUTH_TOKEN` を設定することで認証を有効にできます。

#### 環境変数の設定

```bash
# ローカル開発時
export MCP_AUTH_TOKEN="your-secret-token"
(cd src/ts/mcpserver && npm run dev)

# または .env ファイルで設定
echo "MCP_AUTH_TOKEN=your-secret-token" > src/ts/mcpserver/.env

# AWS Lambda環境変数として設定
# CDKスタックを編集して environment プロパティに追加:
environment: {
  AWS_LWA_PORT: "3000",
  AWS_LAMBDA_EXEC_WRAPPER: "/opt/bootstrap",
  MCP_AUTH_TOKEN: "your-production-token"
}
```

#### クライアントでの認証

```bash
# mcp-remoteクライアントでの使用例
npx mcp-remote --header "Authorization:Bearer your-secret-token" http://localhost:3000/mcp
```

Claude & Cursor設定例:

```json
{
  "example-authenticated": {
    "command": "/path/to/npx",
    "args": [
      "mcp-remote", 
      "--header", "Authorization:Bearer your-secret-token",
      "https://{{OutputValue}}.execute-api.us-east-1.amazonaws.com/dev/mcp"
    ]
  }
}
```

#### 認証エラー

認証に失敗した場合、以下のレスポンスが返されます:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Unauthorized: Bearer token required" // または "Unauthorized: Invalid token"
  },
  "id": null
}
```

### API Gateway カスタム認証

このサンプルには、API Gateway カスタム認証機能も含まれています。デフォルトでは無効になっていますが、CDK スタックファイル内のコメントを解除することで有効にできます。

## 🔄 アーキテクチャの切り替え

### Hono → Express.js への切り替え

1. CDKスタック設定を変更:
```typescript
// lib/serverless-mcp-servers-cdk-stack.ts:33
code: lambda.Code.fromAsset(path.join(__dirname, "../src/js/mcpserver")), // Express
```

2. 再デプロイ:
```bash
npm run build
cdk deploy --region us-east-1
```

### Express.js → Hono への切り替え

1. Honoサーバーをビルド:
```bash
(cd src/ts/mcpserver && npm run build)
```

2. CDKスタック設定を変更:
```typescript
// lib/serverless-mcp-servers-cdk-stack.ts:33
code: lambda.Code.fromAsset(path.join(__dirname, "../src/ts/mcpserver/dist")), // Hono
```

3. 再デプロイ:
```bash
npm run build
cdk deploy --region us-east-1
```

## 🧹 クリーンアップ

評価が終わったら、以下のコマンドでAWSリソースを削除してください:

```bash
cdk destroy --region us-east-1
```

## MCP について詳しく学ぶ

- [イントロダクション](https://modelcontextprotocol.io/introduction)
- [プロトコル仕様](https://modelcontextprotocol.io/specification/2025-03-26)
