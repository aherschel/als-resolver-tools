import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
export type GeneratedResolverProps = {
    api: appsync.GraphqlApi;
    'getUserId': appsync.BaseDataSource;
    'userStore': appsync.BaseDataSource;
    'getUserId': appsync.BaseDataSource;
    'userStore': appsync.BaseDataSource;
};
export class GeneratedResolves extends Construct {
    constructor(scope: Construct, id: string, props: GeneratedResolverProps) {
        super(scope, id);
    }
}
