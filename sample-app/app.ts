#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as nodejsfunction from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const stack = new cdk.Stack(new cdk.App(), 'SampleAppStack', {
  env: { region: 'us-west-2' },
});

const api = new appsync.GraphqlApi(stack, 'Api', {
  name: 'SampleApp',
  definition: appsync.Definition.fromFile(path.join(__dirname, 'schema.graphql')),
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: appsync.AuthorizationType.API_KEY,
    }
  },
});

const getUserIdFunction = new nodejsfunction.NodejsFunction(stack, 'GetUserIdFunction', {
  entry: path.join(__dirname, 'get-user-id.ts'),
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  architecture: lambda.Architecture.ARM_64,
});
const getUserIdDataSource = api.addLambdaDataSource('GetUserIdDataSource', getUserIdFunction);

const userStoreTable = new dynamodb.Table(stack, 'UserStoreTable', {
  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING,
  },
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
const userStoreDataSource = api.addDynamoDbDataSource('UserStoreDatasource', userStoreTable);

api.createResolver('Mutation.addUser', {
  typeName: 'Mutation',
  fieldName: 'addUser',
  code: appsync.Code.fromAsset(path.join(__dirname, 'Mutation.addUser.js')),
  runtime: appsync.FunctionRuntime.JS_1_0_0,
  pipelineConfig: [
    new appsync.AppsyncFunction(stack, 'Mutation.addUser.1', {
      api,
      name: 'MutationaddUserOne',
      dataSource: getUserIdDataSource,
      code: appsync.Code.fromAsset(path.join(__dirname, 'Mutation.addUser.1.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    }),
    new appsync.AppsyncFunction(stack, 'Mutation.addUser.2', {
      api,
      name: 'MutationaddUserTwo',
      dataSource: userStoreDataSource,
      code: appsync.Code.fromAsset(path.join(__dirname, 'Mutation.addUser.2.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    }),
  ],
});
