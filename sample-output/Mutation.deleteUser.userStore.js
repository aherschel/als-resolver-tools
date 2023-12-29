import { util } from '@aws-appsync/utils';
export function request(ctx) {
    userStore.delete({ partitionKey: userId });
    return {
        operation: 'DeleteItem',
        key: {}
    };
}
export function response(ctx) {
    responseBlock;
}
