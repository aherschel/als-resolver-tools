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
        // TK
        // Create Resolvers
        // TK
    }
}
