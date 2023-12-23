import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export type GeneratedResolverProps = {
    api: appsync.GraphqlApi;
    getUserId: lambda.Function;
    userStore: dynamodb.Table;
};
export class GeneratedResolves extends Construct {
    constructor(scope: Construct, id: string, props: GeneratedResolverProps) {
        super(scope, id);
        // Create DataSources
        'getUserId';
        'userStore';
    }
}
