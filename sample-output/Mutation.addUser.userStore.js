import { util } from '@aws-appsync/utils';
export function request(ctx) {
    const processedId = `${userId}${userId}`;
    userStore.put({ partitionKey: userId }, { username, processedId, created: 'true', valueX: 2 + 2 });
    return {
        operation: 'PutItem',
        key: { partitionKey: userId },
        attributeValues: { username, processedId, created: , valueX: + }
    };
}
export function response(ctx) {
    responseBlock;
}
