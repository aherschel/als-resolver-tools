import {
  DocumentNode,
  Kind,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
  print,
} from 'graphql';
import {
  TypeDefinition,
  FieldDefinition,
  ParsedGraphqlDefinition,
  ResolverAddress,
} from '../types';
  
export type GenerateResolverAndTypesProps = {
  address: ResolverAddress;
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
  
export const generateResolverAndTypes = (props: GenerateResolverAndTypesProps): ParsedGraphqlDefinition[] => {
  const { address, requestType, responseType } = props;
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
    name: { kind: Kind.NAME, value: address.fieldName },
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
    name: { kind: Kind.NAME, value: address.typeName },
    fields: [operationFieldNode],
  };
  return [
    requestTypeNode,
    responseTypeNode,
    operationTypeNode,
  ];
};

export const writeMergedDefinition = (typeNodes: ParsedGraphqlDefinition[][]): string => print(mergedDefinitions(typeNodes));

export const mergedDefinitions = (typeNodes: ParsedGraphqlDefinition[][]): DocumentNode => {
  const mergedNodes: Record<string, ParsedGraphqlDefinition> = {};
  typeNodes.flat().forEach(typeNode => {
    const name = typeNode.name.value;
    const existingNode = mergedNodes[name]
    if (existingNode) {
      mergedNodes[name] = {
        ...existingNode,
        fields: [
          ...(existingNode.fields ?? []),
          ...(typeNode.fields ?? []),
        ] as unknown as any,
      };
    } else {
      mergedNodes[name] = typeNode;
    }
  });
  return {
    kind: Kind.DOCUMENT,
    definitions: Object.values(mergedNodes),
  };
}
