# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Installation
```bash
# Install main project dependencies
npm install

# Install MCP client dependencies
(cd src/js/mcpclient && npm install)

# Install Hono TypeScript MCP server dependencies (recommended)
(cd src/ts/mcpserver && npm install)

# Install Express.js MCP server dependencies (optional)
(cd src/js/mcpserver && npm install)
```

### Development
```bash
# Run Hono TypeScript development server (hot reload)
(cd src/ts/mcpserver && npm run dev)

# Build Hono TypeScript server
(cd src/ts/mcpserver && npm run build)

# Run Express.js server
node src/js/mcpserver/index.js

# Test client against local server
node src/js/mcpclient/index.js

# Test client against deployed server
export MCP_SERVER_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ServerlessMcpServersCdkStack --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='McpEndpoint'].OutputValue" --output text)
node src/js/mcpclient/index.js
```

### Deployment
```bash
# Build and deploy (to us-east-1 region)
npm run deploy
# or
(cd src/ts/mcpserver && npm run build) && npm run build && cdk deploy --region us-east-1

# Clean up resources
cdk destroy --region us-east-1
```

### Testing
```bash
# Run tests
npm test
```

## Architecture Overview

This project implements a stateless MCP (Model Context Protocol) server using AWS CDK that deploys to AWS Lambda and API Gateway. It provides two different implementations:

1. **Hono TypeScript Implementation** (recommended/default):
   - Located in `src/ts/mcpserver/`
   - Modern TypeScript implementation using Hono framework
   - Supports streamable HTTP transport and notifications
   - Built with esbuild before deployment

2. **Express.js Implementation** (alternative):
   - Located in `src/js/mcpserver/`
   - JavaScript implementation using Express

The CDK stack (`lib/serverless-mcp-servers-cdk-stack.ts`) creates:
- Lambda function for the MCP server
- API Gateway endpoint to expose the MCP server
- Optional authorization layer (commented out by default)

## Important Notes

1. **Region Restriction**: Always deploy to `us-east-1` region due to Lambda Web Adapter layer constraints

2. **Authentication**:
   - Built-in Bearer token authentication can be enabled by setting `MCP_AUTH_TOKEN` environment variable
   - API Gateway custom authorizer is available but commented out by default

3. **Available MCP Features**:
   - **Tools**: `ping` (response time test), `start-notification-stream` (periodic notifications test, Hono only)
   - **Resources**: `greeting-resource` (static greeting)
   - **Prompts**: `greeting-template` (personalized greeting prompt)

4. **Implementation Switching**:
   - To switch between Hono and Express implementations, edit `lib/serverless-mcp-servers-cdk-stack.ts` to change the Lambda code source path

5. **Required Build Step**:
   - Always run `npm run build` in `src/ts/mcpserver` directory before deploying the Hono implementation