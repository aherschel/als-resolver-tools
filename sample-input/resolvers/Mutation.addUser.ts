import resolver from '../resolver';

type HandlerInput = {
  username: string;
};

type HandlerOutput = {
  userId: string;
};

export const handler = ({ username }: HandlerInput): HandlerOutput => {
    const getUserId = resolver.getLambdaDataSource('getUserId');
  const userStore = resolver.getDynamoDbDataSource('userStore');
   
  const userId = getUserId.invoke<string>({ username });
   
  const processedId = `${userId}${userId}`;
   
  userStore.put(
    { partitionKey: userId },
    { username, processedId },
  );
   
  return { userId };
};
