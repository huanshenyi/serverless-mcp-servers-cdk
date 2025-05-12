#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ServerlessMcpServersCdkStack } from "../lib/serverless-mcp-servers-cdk-stack";

const app = new cdk.App();
new ServerlessMcpServersCdkStack(app, "ServerlessMcpServersCdkStack", {});
