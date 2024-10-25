import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch, generateMovieItem, generateMovieCastItem } from "../shared/util"; // Import the specific item generators
import { movies, movieCasts } from "../seed/movies";

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Movies",
    });

    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieCast",
    });

    // Seed data into DynamoDB
    new custom.AwsCustomResource(this, "MoviesDdbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [moviesTable.tableName]: generateBatch(movies, generateMovieItem),  // Specify the movie item generator
            [movieCastsTable.tableName]: generateBatch(movieCasts, generateMovieCastItem),  // Specify the movie cast item generator
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("MoviesDdbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [moviesTable.tableArn, movieCastsTable.tableArn],
      }),
    });

    // Lambda Functions and Permissions
    const getMovieByIdFn = new lambdanode.NodejsFunction(this, "GetMovieByIdFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/getMovieById.ts`,
      environment: { 
        TABLE_NAME: moviesTable.tableName, 
        REGION: cdk.Stack.of(this).region 
      },
    });
    moviesTable.grantReadData(getMovieByIdFn);

    // Set up API Gateway and other lambdas as needed...
  }
}
