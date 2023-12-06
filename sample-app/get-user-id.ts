import type { AppSyncResolverEvent } from 'aws-lambda';

type EventPayload = {
  username: string;
};

export const handler = async (event: AppSyncResolverEvent<EventPayload>): Promise<string> => {
  console.log(`Retrieving userid for event: ${JSON.stringify(event)}`);
  return `${event.arguments.username}:123`;
};
