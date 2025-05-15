# Stateless MCP Server on AWS Lambda (CDK 版)

このプロジェクトは、AWS CDK を使用して AWS Lambda と API Gateway 上でステートレスな MCP サーバーを構築します。
[sample-serverless-mcp-servers](https://github.com/aws-samples/sample-serverless-mcp-servers/tree/main/stateless-mcp-on-lambda)の CDK 移植になります。

## 前提条件

- AWS CLI (設定済み)
- Node.js と npm
- AWS CDK

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. MCP サーバーとクライアントの依存関係をインストール

```bash
(cd src/js/mcpclient && npm install)
(cd src/js/mcpserver && npm install)
```

#### Hono

```bash
(cd src/js/mcpclient && npm install)
(cd src/ts/mcpserver && npm install)
```

### 3. ローカルでのテスト

MCP サーバーをローカルで実行:

```bash
node src/js/mcpserver/index.js
```

#### Hono

```bash
(cd src/ts/mcpserver && npm run dev)
```

別のターミナルウィンドウでクライアントを実行:

```bash
node src/js/mcpclient/index.js
```

Claude & Cursor クライアントでテスト

```json
    "example-local": {
      "command": "/path/to/npx",
      "args": ["mcp-remote", "http://localhost:3000/mcp"]
    }
```

### 4. AWS へのデプロイ

```bash
cdk deploy --region us-east-1
```

#### Hono 製の MCP サーバーのデプロイ

cdk deploy する前にまずは実行ファイルを build

```bash
(cd src/ts/mcpserver && npm run build)
```

lib/serverless-mcp-servers-cdk-stack.ts

```typescript
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/ts/mcpserver/dist")), // Hono
```

メインディレクトリに戻って

```bash
cdk deploy --region us-east-1
```

## 重要な注意点

- このプロジェクトは**必ず us-east-1 リージョン**にデプロイされます
- デプロイ後、API Gateway のエンドポイントが利用可能になるまで約 1 分かかる場合があります

## デプロイされた MCP サーバーのテスト

デプロイが完了したら、出力されたエンドポイント URL を使用して MCP クライアントをテストできます:

```bash
export MCP_SERVER_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ServerlessMcpServersCdkStack --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='McpEndpoint'].OutputValue" --output text)
node src/js/mcpclient/index.js
```

## Claude & Cursor クライアントでテスト

```
    "example-remote": {
      "command": "/path/to/npx",
      "args": [
        "mcp-remote",
        "https://{{OutputValue}}.execute-api.us-east-1.amazonaws.com/dev/mcp"
      ]
    }
```

## 認証機能

このサンプルには、API Gateway カスタム認証機能が含まれています。デフォルトでは無効になっていますが、CDK スタックファイル内のコメントを解除することで有効にできます。

## コスト考慮事項

このサンプルは AWS アカウントに有料リソースをプロビジョニングします。評価が終わったら、以下のコマンドでリソースを削除することを忘れないでください:

```bash
cdk destroy --region us-east-1
```

## MCP について詳しく学ぶ

- [イントロダクション](https://modelcontextprotocol.io/introduction)
- [プロトコル仕様](https://modelcontextprotocol.io/specification/2025-03-26)
