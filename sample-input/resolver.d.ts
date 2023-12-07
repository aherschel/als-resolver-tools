export type DynamoDbKey = {
  partitionKey: string;
  sortKey?: string;
};

export type DynamoDbPayload = Record<string, string | number | boolean>;

export type LambdaDataSource = {
  invoke: <ResponseType = any>(payload: any) => ResponseType;
};

export type DynamoDbDataSource = {
  put: <DataType = DynamoDbPayload>(key: DynamoDbKey, payload: DynamoDbPayload) => DataType,
  get: <DataType = DynamoDbPayload>(key: DynamoDbKey) => DataType,
};

declare const resolver: {
  getLambdaDataSource: (name: string) => LambdaDataSource,
  getDynamoDbDataSource: (name: string) => DynamoDbDataSource,
};

export default resolver;
