import { InputObjectTypeDefinitionNode, ObjectTypeDefinitionNode } from 'graphql';

export type FieldDefinition = {
  name: string;
  type: string;
  isOptional?: boolean;
  isArray?: boolean;
};

export type TypeDefinition = {
  name: string;
  fields: FieldDefinition[],
};

export type DataSourceType = 'lambda' | 'dynamodb';

export type DataSourceRef = {
  variableName: string;
  dataSourceName: string;
  dataSourceType: DataSourceType;
};

export type PipelineFunctionDef = {
  name: string;
  methodName: string;
  args: any;
  statements: string[];
};

export type ResolverAddress = {
  typeName: string;
  fieldName: string;
};

export type ParsedGraphqlDefinition = InputObjectTypeDefinitionNode | ObjectTypeDefinitionNode;

export type ParsedResolver = {
  address: ResolverAddress;
  parsedGraphqlDefinitions: ParsedGraphqlDefinition[];
  referencedDataSources: DataSourceRef[];
  pipelineFunctions: PipelineFunctionDef[];
};
