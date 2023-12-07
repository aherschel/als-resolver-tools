import { generateResolverAndTypes } from './graphql-schema-builder';
import { print } from 'graphql';

describe('generateResolverAndTypes', () => {
  it('can be invoked', () => {
    const generatedResolverAndTypes = generateResolverAndTypes({
      typeName: 'Query',
      fieldName: 'echo',
      requestType: {
        name: 'EchoRequest',
        fields: [
          {
            name: 'username',
            type: 'string',
          },
        ],
      },
      responseType: {
        name: 'EchoResponse',
        fields: [
          {
            name: 'userid',
            type: 'string',
            isOptional: true,
          },
          {
            name: 'userattributes',
            type: 'number',
            isArray: true,
          }
        ],
      },
    });
    expect(print(generatedResolverAndTypes).length).not.toEqual(0);
  });
});
