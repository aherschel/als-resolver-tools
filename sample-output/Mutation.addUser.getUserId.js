import { util } from '@aws-appsync/utils';
export function request(ctx) {
    const getUserId = resolver.getLambdaDataSource('getUserId');
    const userStore = resolver.getDynamoDbDataSource('userStore');
    const userId = getUserId.invoke < string > ({ username });
    return {
        operation: 'Invoke',
        payload: {}
    };
}
export function response(ctx) {
    responseBlock;
}
