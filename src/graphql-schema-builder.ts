import {
  DocumentNode,
  Kind,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
} from 'graphql';

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
export type GenerateResolverAndTypesProps = {
  typeName: string;
  fieldName: string;
  requestType: TypeDefinition;
  responseType: TypeDefinition;
};

const scalarMapping: Record<string, string> = {
  string: 'String',
  number: 'Float',
  boolean: 'Boolean',
};

const generateScalarType = (field: FieldDefinition): TypeNode => {
  const typeName: string = scalarMapping[field.type];
  if (!typeName) throw new Error(`type ${field.type} not found in scalar mapping`);
  const inner: TypeNode = {
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: typeName },
  };
  const middle: TypeNode = field.isOptional
    ? inner
    : { kind: Kind.NON_NULL_TYPE, type: inner };
  const outer: TypeNode = field.isArray
    ? {
      kind: Kind.NON_NULL_TYPE,
      type: {
        kind: Kind.LIST_TYPE,
        type: middle,
      },
    }
    : middle;
  return outer;
};

const convertFieldToInputValueDefinition = (field: FieldDefinition): InputValueDefinitionNode => ({
  kind: Kind.INPUT_VALUE_DEFINITION,
  name: { kind: Kind.NAME, value: field.name },
  type: generateScalarType(field),
});

const convertFieldToFieldDefinition = (field: FieldDefinition): FieldDefinitionNode => ({
  kind: Kind.FIELD_DEFINITION,
  name: { kind: Kind.NAME, value: field.name },
  type: generateScalarType(field),
});

export const generateResolverAndTypes = (props: GenerateResolverAndTypesProps): DocumentNode => {
  const { typeName, fieldName, requestType, responseType } = props;
  const requestTypeNode: InputObjectTypeDefinitionNode = {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    name: { kind: Kind.NAME, value: requestType.name },
    fields: requestType.fields.map(convertFieldToInputValueDefinition),
  };
  const responseTypeNode: ObjectTypeDefinitionNode = {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: { kind: Kind.NAME, value: responseType.name },
    fields: responseType.fields.map(convertFieldToFieldDefinition),
  };
  const operationFieldNode: FieldDefinitionNode = {
    kind: Kind.FIELD_DEFINITION,
    name: { kind: Kind.NAME, value: fieldName },
    type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: responseType.name } },
    arguments: [
      {
        kind: Kind.INPUT_VALUE_DEFINITION,
        name: { kind: Kind.NAME, value: 'input' }, // Placeholder
        type: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: requestType.name } },
      }
    ],
  };
  const operationTypeNode: ObjectTypeDefinitionNode = {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    name: { kind: Kind.NAME, value: typeName },
    fields: [operationFieldNode],
  };
  const documentNode: DocumentNode = {
    kind: Kind.DOCUMENT,
    definitions: [
      requestTypeNode,
      responseTypeNode,
      operationTypeNode,
    ],
  };
  return documentNode;
};
