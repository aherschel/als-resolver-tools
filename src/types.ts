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
