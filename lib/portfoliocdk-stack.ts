import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as events from "aws-cdk-lib/aws-events";
import { Construct } from 'constructs';
import * as path from 'path';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class PortfoliocdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /// express server lambda, api gateway
    const expressServerLambda = new lambda.Function(this, "express-server-handler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "../../backend/dist/")),
      handler: "index_prod.handler",
      environment: {
      }
    });

    expressServerLambda.addToRolePolicy(new PolicyStatement({
      actions: ["s3:*", "s3-object-lambda:*"],
      resources: ["*"]
    }));

    const api = new apigateway.RestApi(this, "portfolio-backend", {
      restApiName: "portfolio-backend",
      description: "This server respond to http requests form the frontend"
    });

    const apiGateway = new apigateway.LambdaIntegration(expressServerLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    api.root.addResource("githubcontribution").addMethod("GET", apiGateway); // GET 
    api.root.addResource("projects").addMethod("GET", apiGateway); // GET 

    /// background lambda, event rule
    const backgroundLambda = new lambda.Function(this, "background-handler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "../../background/dist/")),
      handler: "index_prod.handler",
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
    });

    backgroundLambda.addToRolePolicy(new PolicyStatement({
      actions: ["s3:*", "s3-object-lambda:*"],
      resources: ["*"],
    }));

    const eventRule = new events.Rule(this, 'background-trigger-timer', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
    });
    eventRule.addTarget(new targets.LambdaFunction(backgroundLambda))
  }
}
