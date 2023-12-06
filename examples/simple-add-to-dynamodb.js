import { util } from '@aws-appsync/utils'
import * as ddb from '@aws-appsync/utils/dynamodb'
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Utilities exposed elsewhere, part of the DSL
const datasource = {
  lambda: (name) => ({
    invoke: async (payload) => console.log(`Invoking lambda ${name} with payload ${payload}`),
  }),
  dynamodb: (name) => ({
    put: async (id) => console.log(`Putting item with id ${id} in dynamodb ${name}`),
    get: async (id) => console.log(`Getting item with id ${id} from dynamodb ${name}`),
  }),
};

// Example userspace code
export const handler = async ({ username }) => {
 const getUserId = datasource.lambda('getUserId');
 const userStore = datasource.dynamodb('userStore');

 const userId = await getUserId.invoke({ username });

 const processedId = `${userId}${userId}`;

 await userStore.put({
  id: userId,
  username,
  processedId,
});

 return userId;
};

// Example generated resolver pipeline code and CDK
const _ = /* GraphQL */ `
  type Mutation {
    addUser(username: String!): String!
  }
`;

class GeneratedPipelineResolver {
  request() {}
  response(ctx) {
    return ctx.prev.result;
  }
}

class GeneratedLambdaResolver {
  request(ctx) {
    return {
      operation: "Invoke",
      payload: {
        fieldName: ctx.info.fieldName,
        parentTypeName: ctx.info.parentTypeName,
        variables: ctx.info.variables,
        arguments: ctx.arguments,
        selectionSetList: ctx.info.selectionSetList,
        selectionSetGraphQL: ctx.info.selectionSetGraphQL,
      },
    };
  }
  response(ctx) {
    const { result, error } = ctx;
    if (error) {
      util.error(error.message, error.type, result);
    }
    return result;
  }
}

class GeneratedDynamodbResolver {
  request(ctx) {
    const id = ctx.prev.result;
    const key = { id };
    const attributeValues = ctx.args;
    attributeValues.processedId = `${userId}${userId}`;
    return {
      operation: "PutItem",
      key: util.dynamodb.toMapValues(key),
      attributeValues: util.dynamodb.toMapValues(attributeValues),
    };
  }
  response(ctx) {
    if (ctx.error) {
      util.error(ctx.error.message, ctx.error.type);
    }
    return ctx.result;
  }
}

declare api;

new appsync.Resolver(null, 'GeneratedResolver', {
  api,
  typeName: 'Mutation',
  fieldName: 'addUser',
  code: appsync.Code.fromInline(GeneratedPipelineResolver.toString()),
  runtime: appsync.Runtime.JS_1_0_0,
  pipelineConfig: [
    new appsync.AppsyncFunction(null, 'GeneratedLambdaResolverFunction', {
      api,
      name: 'GeneratedLambdaResolverFunction',
      dataSource: new appsync.LambdaDataSource(null, 'GeneratedLambdaDataSource', {
        api,
        lambdaFunction: lambda.Function.fromFunctionName('getUserId'),
      }),
      code: Code.fromInline(GeneratedLambdaResolver.toString()),
      runtime: appsync.Runtime.JS_1_0_0,
    }),
    new appsync.AppsyncFunction(null, 'GeneratedDynamodbResolverFunction', {
      api,
      name: 'GeneratedDynamodbResolverFunction',
      dataSource: new appsync.DynamoDbDataSource(null, 'GeneratedDynamoDbDataSource', {
        api,
        table: dynamodb.Table.fromTableName('userStore'),
      }),
      code: Code.fromInline(GeneratedDynamodbResolver.toString()),
      runtime: appsync.Runtime.JS_1_0_0,
    }),
  ],
});
