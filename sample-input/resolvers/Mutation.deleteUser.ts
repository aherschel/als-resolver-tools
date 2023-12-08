import resolver from 'als-resolver-tools';

type DeleteUserRequest = {
  username: string;
};

type DeleteUserResponse = {
  userId: string;
};

export const handler = ({ username }: DeleteUserRequest): DeleteUserResponse => {
  const getUserId = resolver.getLambdaDataSource('getUserId');
  const userStore = resolver.getDynamoDbDataSource('userStore');
   
  const userId = getUserId.invoke<string>({ username });
      
  userStore.delete({ partitionKey: userId });
   
  return { userId };
};
