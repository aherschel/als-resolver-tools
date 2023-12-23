import { ts, Node, SourceFile, VariableStatement, TypeNode, ImportDeclaration, ExportedDeclarations } from 'ts-morph';
import { ParsedGraphqlDefinition, generateResolverAndTypes } from '../writer';
import { FieldDefinition, TypeDefinition } from '../types';

const isHandlerFunction = (node: Node): node is VariableStatement => Node.isVariableStatement(node)
  && node.getDeclarationList().getDeclarations().length === 1
  && node.getDeclarationList().getDeclarations()[0].getNameNode().getText() === 'handler'
  && (node.getModifiers()?.some((modifier) => modifier.getKind() === ts.SyntaxKind.ExportKeyword) ?? false);

export type DataSourceRef = {
  variableName: string;
  dataSourceName: string;
  dataSourceType: string;
};

export type ParsedResolver = {
  name: string;
  parsedGraphqlDefinitions: ParsedGraphqlDefinition[];
  referencedDataSources: DataSourceRef[];
  resolvers: ResolverDef[];
};

const getFieldsFromTypeLiteral = (typeLiteral: TypeNode): FieldDefinition[] => {
  const fields: FieldDefinition[] = [];
  typeLiteral.forEachChild(field => {
    if (Node.isPropertySignature(field) && field.getTypeNode()) {
      const typeNode = field.getTypeNodeOrThrow();
      const isArray = Node.isArrayTypeNode(typeNode);
      fields.push({
        name: field.getNameNode().getText(),
        type: isArray
          ? typeNode.getType().getText()
          : typeNode.getText(),
        isArray,
        isOptional: field.getQuestionTokenNode() !== undefined,
      });
    }
  });
  return fields;
};

type ResolverDef = {
  resolverName: string;
  methodName: string;
  args: any;
};

type ResolverAddress = {
  typeName: string;
  fieldName: string;
};

const getResolverAddress = (sourceFile: SourceFile): ResolverAddress => {
  const baseName = sourceFile.getBaseNameWithoutExtension();
  const nameParts = baseName.split('.');
  if (nameParts.length !== 2) throw new Error(`Invalid resolver name: ${baseName}`);
  const [typeName, fieldName] = nameParts;
  return { typeName, fieldName };
};

type GetDataSourceRefProps = {
  methodName: string;
  variableName: string;
  dataSourceName: string;
};

const getDataSourceRef = ({ methodName, variableName, dataSourceName }: GetDataSourceRefProps): DataSourceRef => {
  switch (methodName) {
    case 'getLambdaDataSource': return { variableName, dataSourceName, dataSourceType: 'lambda' };
    case 'getDynamoDbDataSource': return { variableName, dataSourceName, dataSourceType: 'dynamodb' };
    default: throw new Error(`Unknown dataSource method: ${methodName}`);
  }
};

// TK Think about me
const collectArguments = (args: Node[]): any[] => {
  return args.map(arg => arg);
}

export const parseResolver = (sourceFile: SourceFile): ParsedResolver => {
  let requestType: string | TypeNode | null = null;
  let responseType: string | TypeNode | null = null;
  const types: TypeDefinition[] = [];
  const referencedDataSources: DataSourceRef[] = [];
  const resolvers: ResolverDef[] = [];
  sourceFile.forEachChild((node) => {
    if (isHandlerFunction(node)) {
      const declarationExp = node.getDeclarationList().getDeclarations()[0].getInitializer();
      if (Node.isArrowFunction(declarationExp)) {
        declarationExp.forEachChild((arrowChild) => {
          if (Node.isTypeReference(arrowChild)) responseType = arrowChild.getTypeName().getText();
          if (Node.isTypeLiteral(arrowChild)) responseType = arrowChild;
        });
        declarationExp.getParameters().forEach((parameter) => {
          const parameterType = parameter.getTypeNodeOrThrow();
          if (Node.isTypeReference(parameterType)) requestType = parameterType.getType().getText();
          if (Node.isTypeLiteral(parameterType)) requestType = parameterType;
        });
        declarationExp.getBody().forEachChild((child) => {
          if (Node.isVariableStatement(child)) {
            const variableDeclaration = child.getDeclarationList().getDeclarations()[0];
            const variableName = variableDeclaration.getName();
            const callExpression = variableDeclaration.getInitializerIfKind(ts.SyntaxKind.CallExpression);
            if (callExpression) {
              const resolverName = callExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.PropertyAccessExpression).getExpressionIfKindOrThrow(ts.SyntaxKind.Identifier).getText();
              const methodName = callExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.PropertyAccessExpression).getName();
              if (resolverName === 'resolver') {
                referencedDataSources.push(getDataSourceRef({ methodName, variableName, dataSourceName: callExpression.getArguments()[0].getText() }));
              } else if (referencedDataSources.some(refSource => refSource.variableName === resolverName)) {
                resolvers.push({ resolverName, methodName, args: collectArguments(callExpression.getArguments()) });
              }
            }
          }
          if (Node.isExpressionStatement(child)) {
            const callExpression = child.getExpressionIfKindOrThrow(ts.SyntaxKind.CallExpression);
            const propertyAccessExpression = callExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.PropertyAccessExpression);
            const methodName = propertyAccessExpression.getName();
            const resolverName = propertyAccessExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.Identifier).getText();
            if (referencedDataSources.some(refSource => refSource.variableName === resolverName)) {
              resolvers.push({ resolverName, methodName, args: collectArguments(callExpression.getArguments()) });
            }
          }
        });
      }
      // Process handler function
      // find invocations of resolver.get*DataSource, and then both 1) track those variables for invocation, and 2) track the required data sources
    }
    if (Node.isTypeAliasDeclaration(node) && Node.isTypeLiteral(node.getTypeNode())) {
      types.push({ name: node.getNameNode().getText(), fields: getFieldsFromTypeLiteral(node.getTypeNodeOrThrow()) });
    }
  });

  const mergedRequestType: TypeDefinition | undefined | null = typeof requestType === 'string'
    ? types.find(type => type.name === requestType)
    : { name: 'AnonymousRequestType', fields: getFieldsFromTypeLiteral(requestType as unknown as any) };

  const mergedResponseType: TypeDefinition | undefined | null = typeof responseType === 'string'
    ? types.find(type => type.name === responseType)
    : { name: 'AnonymousResponseType', fields: getFieldsFromTypeLiteral(responseType as unknown as any) };

  if (mergedRequestType === null || mergedRequestType === undefined || mergedResponseType === null || mergedResponseType === undefined) throw new Error('Expected a requestType and responseType to be found');

  const { typeName, fieldName } = getResolverAddress(sourceFile);

  const parsedGraphqlDefinitions = generateResolverAndTypes({
    typeName,
    fieldName,
    requestType: mergedRequestType,
    responseType: mergedResponseType,
  });
  
  return {
    name: `${typeName}.${fieldName}`,
    referencedDataSources,
    resolvers,
    parsedGraphqlDefinitions,
  };
};

const validateImportDeclarations = (importDeclaration: ImportDeclaration[]): void => {
  if (importDeclaration.length !== 1 || !importDeclaration[0].getModuleSpecifier().getText().match('als-resolver-tools')) {
    throw new Error(`Expected a single import for resolver, found ${JSON.stringify(importDeclaration)}`);
  }
}

const validateExportedDeclarations = (exportedDeclarations: Record<string, ExportedDeclarations[]>): void => {
  if (!exportedDeclarations['handler']) {
    throw new Error(`Expected an exported function named 'handler', found ${JSON.stringify(Object.keys(exports))}`);
  }
}

/**
 * Take in a ts.SourceFile object, and ensure a few things.
 *   1/ the only require statements are from '../resolver'
 *   2/ that there is an exported method called 'handler'.
 */
export const validateResolver = (sourceFile: SourceFile): void => {
  validateImportDeclarations(sourceFile.getImportDeclarations());
  validateExportedDeclarations(Object.fromEntries(sourceFile.getExportedDeclarations().entries()));
};
