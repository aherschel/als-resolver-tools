import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export type GeneratedResolverProps = {
    api: appsync.GraphqlApi;
    getUserIdFunction: lambda.Function;
    userStoreTable: dynamodb.Table;
};
export class GeneratedResolvers extends Construct {
    constructor(scope: Construct, id: string, props: GeneratedResolverProps) {
        super(scope, id);
        // Create DataSources
        const getUserIdDataSource = props.api.addLambdaDataSource('getUserIdDataSource', props.getUserIdFunction);
        const userStoreDataSource = props.api.addDynamoDbDataSource('userStoreDataSource', props.userStoreTable);
        // Create Functions
        const addUserMutationgetUserId = new appsync.AppsyncFunction(this, 'addUserMutationgetUserId', {
            name: 'addUserMutationgetUserId',
            api: props.api,
            dataSource: getUserIdDataSource,
            code: appsync.Code.fromAsset('Mutation.addUser.getUserId.js'),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
        });
        const addUserMutationuserStore = new appsync.AppsyncFunction(this, 'addUserMutationuserStore', {
            name: 'addUserMutationuserStore',
            api: props.api,
            dataSource: userStoreDataSource,
            code: appsync.Code.fromAsset('Mutation.addUser.userStore.js'),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
        });
        const deleteUserMutationgetUserId = new appsync.AppsyncFunction(this, 'deleteUserMutationgetUserId', {
            name: 'deleteUserMutationgetUserId',
            api: props.api,
            dataSource: getUserIdDataSource,
            code: appsync.Code.fromAsset('Mutation.deleteUser.getUserId.js'),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
        });
        const deleteUserMutationuserStore = new appsync.AppsyncFunction(this, 'deleteUserMutationuserStore', {
            name: 'deleteUserMutationuserStore',
            api: props.api,
            dataSource: userStoreDataSource,
            code: appsync.Code.fromAsset('Mutation.deleteUser.userStore.js'),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
        });
        // Create Resolvers
        props.api.createResolver('Mutation.addUser', {
            typeName: 'Mutation',
            fieldName: 'addUser',
            code: appsync.Code.fromAsset('Mutation.addUser.js'),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
            pipelineConfig: [
                addUserMutationgetUserId,
                addUserMutationuserStore,
            ],
        });
        props.api.createResolver('Mutation.deleteUser', {
            typeName: 'Mutation',
            fieldName: 'deleteUser',
            code: appsync.Code.fromAsset('Mutation.deleteUser.js'),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
            pipelineConfig: [
                deleteUserMutationgetUserId,
                deleteUserMutationuserStore,
            ],
        });
    }
}
