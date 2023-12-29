import resolver from 'als-resolver-tools';

type AddUserRequest = {
  username: string;
};

type AddUserResponse = {
  userId: string;
};

export const handler = ({ username }: AddUserRequest): AddUserResponse => {
  const getUserId = resolver.getLambdaDataSource('getUserId');
  const userStore = resolver.getDynamoDbDataSource('userStore');
   
  const userId = getUserId.invoke<string>({ username });
   
  const processedId = `${userId}${userId}`;
   
  userStore.put(
    { partitionKey: userId },
    { username, processedId, created: 'true', valueX: 2 + 2 },
  );
   
  return { userId };
};
