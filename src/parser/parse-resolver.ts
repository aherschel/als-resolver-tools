import { ts, Node, SourceFile, VariableStatement, TypeNode, ImportDeclaration, ExportedDeclarations, printNode, CallExpression, ObjectLiteralElementLike, SyntaxKind } from 'ts-morph';
import { generateResolverAndTypes } from '../writer';
import { DataSourceRef, FieldDefinition, ParsedResolver, ResolverAddress, PipelineFunctionDef, TypeDefinition } from '../types';

const isHandlerFunction = (node: Node): node is VariableStatement => Node.isVariableStatement(node)
  && node.getDeclarationList().getDeclarations().length === 1
  && node.getDeclarationList().getDeclarations()[0].getNameNode().getText() === 'handler'
  && (node.getModifiers()?.some((modifier) => modifier.getKind() === ts.SyntaxKind.ExportKeyword) ?? false);

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

const produceDynamoDbGetItemExpression = (callExpression: CallExpression): ts.Expression => {
  // Todo: wire through callExpression
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment('operation', ts.factory.createStringLiteral('GetItem', true)),
    ts.factory.createPropertyAssignment('key', ts.factory.createObjectLiteralExpression([])),
  ], true);
};

const produceDynamoDbPutItemExpression = (callExpression: CallExpression): ts.Expression => {
  const args = callExpression.getArguments();
  if (args.length !== 2) throw new Error(`Unexpected 2 arguments for putItem, found: ${args.length}`);
  const [key, attributeValues] = args;
  if (!Node.isObjectLiteralExpression(key) || !Node.isObjectLiteralExpression(attributeValues)) throw new Error(`Expected object literal expression for putItem key and attribute params`);
  const keyFields: ts.ObjectLiteralElementLike[] = [];
  key.getProperties().forEach(property => {
    if (Node.isPropertyAssignment(property)) {
      keyFields.push(ts.factory.createPropertyAssignment(property.getName(), property.getInitializerOrThrow().compilerNode));
    }
    if (Node.isShorthandPropertyAssignment(property)) {
      keyFields.push(ts.factory.createShorthandPropertyAssignment(property.getName()));
    }
  });
  const attributeFields: ts.ObjectLiteralElementLike[] = [];
  attributeValues.getProperties().forEach(property => {
    if (Node.isPropertyAssignment(property)) {
      attributeFields.push(ts.factory.createPropertyAssignment(property.getName(), property.getInitializerOrThrow().compilerNode));
    }
    if (Node.isShorthandPropertyAssignment(property)) {
      attributeFields.push(ts.factory.createShorthandPropertyAssignment(property.getName()));
    }
  });
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment('operation', ts.factory.createStringLiteral('PutItem', true)),
    ts.factory.createPropertyAssignment('key', ts.factory.createObjectLiteralExpression(keyFields)),
    ts.factory.createPropertyAssignment('attributeValues', ts.factory.createObjectLiteralExpression(attributeFields)),
  ], true);
};

const produceDynamoDbDeleteItemExpression = (callExpression: CallExpression): ts.Expression => {
  // Todo: wire through callExpression
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment('operation', ts.factory.createStringLiteral('DeleteItem', true)),
    ts.factory.createPropertyAssignment('key', ts.factory.createObjectLiteralExpression([])),
  ], true);
};

const produceLambdaInvokeExpression = (callExpression: CallExpression): ts.Expression => {
  // Todo: wire through callExpression
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment('operation', ts.factory.createStringLiteral('Invoke', true)),
    ts.factory.createPropertyAssignment('payload', ts.factory.createObjectLiteralExpression([])),
  ], true);
};

const produceResolverExpression = ({ dataSource, methodName, callExpression }: { dataSource: DataSourceRef, methodName: string, callExpression: CallExpression }): ts.Expression => {
  switch (dataSource.dataSourceType) {
    case 'dynamodb': switch (methodName) {
      case 'get': return produceDynamoDbGetItemExpression(callExpression);
      case 'put': return produceDynamoDbPutItemExpression(callExpression);
      case 'delete': return produceDynamoDbDeleteItemExpression(callExpression);
      default: throw new Error(`Unexpected dynamodb method name: ${methodName}`);
    }
    case 'lambda': switch (methodName) {
      case 'invoke': return produceLambdaInvokeExpression(callExpression);
      default: throw new Error(`Unexpected lambda method name: ${methodName}`);
    }
    default: throw new Error(`Unexpected datasource type ${dataSource.dataSourceType}`);
  }
};

const produceResolverInvocationStatement = (props: { dataSource: DataSourceRef, methodName: string, callExpression: CallExpression }): string => printNode(ts.factory.createReturnStatement(produceResolverExpression(props)));

export const parseResolver = (sourceFile: SourceFile): ParsedResolver => {
  let requestType: string | TypeNode | null = null;
  let responseType: string | TypeNode | null = null;
  const types: TypeDefinition[] = [];
  const referencedDataSources: DataSourceRef[] = [];
  const pipelineFunctions: PipelineFunctionDef[] = [];
  let currFunctionStatements: string[] = [];
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
          // TK, not sure if this is right
          currFunctionStatements.push(child.print());
          if (Node.isVariableStatement(child)) {
            const variableDeclaration = child.getDeclarationList().getDeclarations()[0];
            const variableName = variableDeclaration.getName();
            const callExpression = variableDeclaration.getInitializerIfKind(ts.SyntaxKind.CallExpression);
            if (callExpression) {
              const name = callExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.PropertyAccessExpression).getExpressionIfKindOrThrow(ts.SyntaxKind.Identifier).getText();
              const methodName = callExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.PropertyAccessExpression).getName();
              if (name === 'resolver') {
                referencedDataSources.push(getDataSourceRef({ methodName, variableName, dataSourceName: callExpression.getArguments()[0].getText() }));
              } else {
                const matchingDataSourceRefs = referencedDataSources.filter(refSource => refSource.variableName === name);
                if (matchingDataSourceRefs.length === 1) {
                  const dataSource = matchingDataSourceRefs[0];
                  currFunctionStatements.push(produceResolverInvocationStatement({ dataSource, methodName, callExpression }));
                  pipelineFunctions.push({ name, methodName, args: collectArguments(callExpression.getArguments()), statements: [...currFunctionStatements] });
                  currFunctionStatements = [];
                }
              }
            }
          }
          if (Node.isExpressionStatement(child)) {
            const callExpression = child.getExpressionIfKindOrThrow(ts.SyntaxKind.CallExpression);
            const propertyAccessExpression = callExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.PropertyAccessExpression);
            const methodName = propertyAccessExpression.getName();
            const name = propertyAccessExpression.getExpressionIfKindOrThrow(ts.SyntaxKind.Identifier).getText();
            const matchingDataSourceRefs = referencedDataSources.filter(refSource => refSource.variableName === name);
            if (matchingDataSourceRefs.length === 1) {
              const dataSource = matchingDataSourceRefs[0];
              currFunctionStatements.push(produceResolverInvocationStatement({ dataSource, methodName, callExpression }));
              pipelineFunctions.push({ name, methodName, args: collectArguments(callExpression.getArguments()), statements: [...currFunctionStatements] });
              currFunctionStatements = [];
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

  const address = getResolverAddress(sourceFile);

  const parsedGraphqlDefinitions = generateResolverAndTypes({
    address,
    requestType: mergedRequestType,
    responseType: mergedResponseType,
  });
  
  return {
    address,
    referencedDataSources,
    pipelineFunctions,
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
