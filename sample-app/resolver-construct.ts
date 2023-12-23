import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export type GeneratedResolverProps = {
  api: appsync.GraphqlApi;
  lambdaFunction: lambda.Function;
  dynamodbTable: dynamodb.Table;
};

export class GeneratedResolves extends Construct {
  constructor(scope: Construct, id: string, props: GeneratedResolverProps) {
    super(scope, id);

    // Create Data Sources
    const dataSource1 = props.api.addLambdaDataSource('datasource1', props.lambdaFunction);
    const dataSource2 = props.api.addDynamoDbDataSource('datasource2', props.dynamodbTable);

    // Create Functions
    const function1 = new appsync.AppsyncFunction(this, 'function1', {
      name: 'function1',
      api: props.api,
      dataSource: dataSource1,
      code: appsync.Code.fromAsset('Mutation.addUser.1.js'),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });
    const function2 = new appsync.AppsyncFunction(this, 'function2', {
      name: 'function2',
      api: props.api,
      dataSource: dataSource2,
      code: appsync.Code.fromAsset('Mutation.addUser.2.js'),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // Create Resolvers
    props.api.createResolver('addUser', {
      typeName: 'Mutation',
      fieldName: 'addUser',
      code: appsync.Code.fromAsset('Mutation.addUser.js'),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      pipelineConfig: [function1, function2],
    })
  }
}