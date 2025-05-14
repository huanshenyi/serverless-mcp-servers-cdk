import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "node:path";

export class ServerlessMcpServersCdkStack extends cdk.Stack {
  public readonly mcpEndpoint: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const projectName = "stateless-mcp-on-lambda";

    // MCP Server Lambda Function
    const mcpServerRole = new iam.Role(this, "McpServerRole", {
      roleName: projectName,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    mcpServerRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    const mcpServerFunction = new lambda.Function(this, "McpServerFunction", {
      functionName: projectName,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "run.sh",
      // code: lambda.Code.fromAsset(path.join(__dirname, "../src/js/mcpserver")),   // Express
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/ts/mcpserver/dist")), // Hono
      role: mcpServerRole,
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          "LambdaAdapterLayer",
          `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerX86:25`
        ),
      ],
      environment: {
        AWS_LWA_PORT: "3000",
        AWS_LAMBDA_EXEC_WRAPPER: "/opt/bootstrap",
      },
    });

    // Authorizer Lambda Function
    const authorizerRole = new iam.Role(this, "AuthorizerRole", {
      roleName: `${projectName}-authorizer`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    authorizerRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    // const authorizerFunction = new lambda.Function(this, "AuthorizerFunction", {
    //   functionName: `${projectName}-authorizer`,
    //   runtime: lambda.Runtime.NODEJS_22_X,
    //   handler: "index.handler",
    //   code: lambda.Code.fromAsset(path.join(__dirname, "../src/js/authorizer")),
    //   role: authorizerRole,
    //   memorySize: 256,
    //   timeout: cdk.Duration.seconds(5),
    // });

    // API Gateway
    const api = new apigateway.RestApi(this, "McpApi", {
      restApiName: projectName,
      deployOptions: {
        stageName: "dev",
      },
    });

    const mcpResource = api.root.addResource("mcp");

    // Create the custom authorizer
    // const authorizer = new apigateway.TokenAuthorizer(this, "McpAuthorizer", {
    //   handler: authorizerFunction,
    //   authorizerName: "mcp-authorizer",
    //   resultsCacheTtl: cdk.Duration.seconds(0),
    // });

    // Add ANY method with Lambda integration
    // Note: By default, authorization is set to NONE
    // To enable custom authorization, uncomment the authorizer property
    mcpResource.addMethod(
      "ANY",
      new apigateway.LambdaIntegration(mcpServerFunction),
      {
        // authorizer: authorizer, // Uncomment to enable custom authorization
      }
    );

    // Output the MCP endpoint URL
    this.mcpEndpoint = new cdk.CfnOutput(this, "McpEndpoint", {
      value: `${api.deploymentStage.urlForPath()}/${mcpResource.path}`,
    });
  }
}
