import { ts } from '@ts-morph/bootstrap';
import { DocumentNode } from 'graphql';
import { FieldDefinition, TypeDefinition, generateResolverAndTypes } from './graphql-schema-builder';
import * as path from 'path';

const isDefined = <T>(val?: T): val is T => val !== undefined && val !== null;
const isVariableStatement = (node?: ts.Node): node is ts.VariableStatement => isDefined(node) && node.kind === ts.SyntaxKind.VariableStatement;
const isArrowFunction = (node?: ts.Node): node is ts.ArrowFunction => isDefined(node) && node.kind === ts.SyntaxKind.ArrowFunction;
const isTypeReference = (node?: ts.Node): node is ts.TypeReferenceNode => isDefined(node) && node.kind === ts.SyntaxKind.TypeReference;
const isTypeLiteral = (node?: ts.Node): node is ts.TypeLiteralNode => isDefined(node) && node.kind === ts.SyntaxKind.TypeLiteral;
const isCallExpression = (node?: ts.Node): node is ts.CallExpression => isDefined(node) && node.kind === ts.SyntaxKind.CallExpression;
const isPropertyAccessExpression = (node?: ts.Node): node is ts.PropertyAccessExpression => isDefined(node) && node.kind === ts.SyntaxKind.PropertyAccessExpression;
const isImportDeclaration = (node?: ts.Node): node is ts.ImportDeclaration => isDefined(node) && node.kind === ts.SyntaxKind.ImportDeclaration;
const isTypeAliasDeclaration = (node?: ts.Node): node is ts.TypeAliasDeclaration => isDefined(node) && node.kind === ts.SyntaxKind.TypeAliasDeclaration;
const isPropertySignature = (node?: ts.Node): node is ts.PropertySignature => isDefined(node) && node.kind === ts.SyntaxKind.PropertySignature;
const isArrayType = (node?: ts.Node): node is ts.ArrayTypeNode => isDefined(node) && node.kind === ts.SyntaxKind.ArrayType;
const isExpressionStatement = (node?: ts.Node): node is ts.ExpressionStatement => isDefined(node) && node.kind === ts.SyntaxKind.ExpressionStatement;

const isHandlerFunction = (node: ts.Node): node is ts.VariableStatement => isVariableStatement(node)
  && node.declarationList.declarations.length === 1
  && node.declarationList.declarations[0].name.getText() === 'handler'
  && (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);

type DataSourceRef = {
  variableName: string;
  dataSourceName: string;
  dataSourceType: string;
};

export type ParsedResolver = {
  graphqlDefinition: DocumentNode;
  referencedDataSources: DataSourceRef[];
  resolvers: ResolverDef[];
};

// TK, use type kind to determine type rather than getText
const getFieldsFromTypeLiteral = (typeLiteral: ts.TypeLiteralNode): FieldDefinition[] => {
  const fields: FieldDefinition[] = [];
  typeLiteral.forEachChild(field => {
    if (isPropertySignature(field) && field.type) {
      const isArray = isArrayType(field.type);
      const typeDef = isArray ? field.type.elementType.getText() : field.type.getText();
      const fieldDef: FieldDefinition = {
        name: field.name.getText(),
        type: typeDef,
      };
      if (isArray) fieldDef.isArray = true;
      if (field.questionToken) fieldDef.isOptional = true;
      fields.push(fieldDef);
    }
  });
  return fields;
};

type ResolverDef = {
  resolverName: string;
  methodName: string;
  args: any;
};

export const parseResolver = (sourceFile: ts.SourceFile): ParsedResolver => {
  let requestType: string | ts.TypeLiteralNode | null = null;
  let responseType: string | ts.TypeLiteralNode | null = null;
  const types: TypeDefinition[] = [];
  const referencedDataSources: DataSourceRef[] = [];
  const resolvers: ResolverDef[] = [];
  const basename = path.basename(sourceFile.fileName, '.ts');
  const nameParts = basename.split('.');
  if (nameParts.length !== 2) {
    throw new Error(`Invalid resolver name: ${basename}`);
  }
  const [typeName, fieldName] = nameParts;
  sourceFile.forEachChild((node) => {
    if (isHandlerFunction(node)) {
      const declarationExp = node.declarationList.declarations[0].initializer;
      if (isArrowFunction(declarationExp)) {
        declarationExp.forEachChild((arrowChild) => {
          if (isTypeReference(arrowChild)) responseType = arrowChild.typeName.getText();
          if (isTypeLiteral(arrowChild)) responseType = arrowChild;
        });
        declarationExp.parameters.forEach((parameter) => {
          if (isTypeReference(parameter.type)) requestType = parameter.type.typeName.getText();
          if (isTypeLiteral(parameter.type)) requestType = parameter.type;
        });
        declarationExp.body.forEachChild((child) => {
          if (isVariableStatement(child)) {
            const variableDeclaration = child.declarationList.declarations[0];
            const variableName = variableDeclaration.name.getText();
            const variableInitializer = variableDeclaration.initializer;
            if (isCallExpression(variableInitializer)) {
              if (isPropertyAccessExpression(variableInitializer.expression)) {
                if (variableInitializer.expression.expression.getText() === 'resolver') {
                  switch (variableInitializer.expression.name.getText()) {
                    case 'getLambdaDataSource':
                      referencedDataSources.push({ variableName, dataSourceName: variableInitializer.arguments[0].getText(), dataSourceType: 'lambda' });
                      break;
                    case 'getDynamoDbDataSource':
                      referencedDataSources.push({ variableName, dataSourceName: variableInitializer.arguments[0].getText(), dataSourceType: 'dynamodb' });
                      break;
                  }
                } else {
                  const resolverName = variableInitializer.expression.expression.getText();
                  const methodName = variableInitializer.expression.name.getText();
                  if (referencedDataSources.some(refSource => refSource.variableName === resolverName)) {
                    variableInitializer.arguments.forEach(arg => console.log(arg.getText())); // TK do something with this
                    console.log(variableInitializer.expression.expression);
                    resolvers.push({
                      resolverName,
                      methodName,
                      args: variableInitializer.arguments,
                    });
                  }
                }
              }
            }
          }
          if (isExpressionStatement(child)) {
            if (isCallExpression(child.expression)) {
              if (isPropertyAccessExpression(child.expression.expression)) {
                console.log(child.expression.expression);
                const resolverName = child.expression.expression.expression.getText();
                const methodName = child.expression.expression.name.getText();
                if (referencedDataSources.some(refSource => refSource.variableName === resolverName)) {
                  child.expression.arguments.forEach(arg => console.log(arg.getText())); // TK do something with this
                  resolvers.push({
                    resolverName,
                    methodName,
                    args: child.expression.arguments,
                  });
                }
              }
            }
          }
        });
      }
      // Process handler function
      // find invocations of resolver.get*DataSource, and then both 1) track those variables for invocation, and 2) track the required data sources
    }
    if (isTypeAliasDeclaration(node) && isTypeLiteral(node.type)) {
      types.push({ name: node.name.getText(), fields: getFieldsFromTypeLiteral(node.type) });
    }
  });

  const mergedRequestType: TypeDefinition | undefined | null = typeof requestType === 'string'
    ? types.find(type => type.name === requestType)
    : { name: 'AnonymousRequestType', fields: getFieldsFromTypeLiteral(requestType as unknown as any) };

  const mergedResponseType: TypeDefinition | undefined | null = typeof responseType === 'string'
    ? types.find(type => type.name === responseType)
    : { name: 'AnonymousResponseType', fields: getFieldsFromTypeLiteral(responseType as unknown as any) };

  if (mergedRequestType === null || mergedRequestType === undefined || mergedResponseType === null || mergedResponseType === undefined) throw new Error('Expected a requestType and responseType to be found');

  const graphqlDefinition = generateResolverAndTypes({
    typeName,
    fieldName,
    requestType: mergedRequestType,
    responseType: mergedResponseType,
  });
  
  return {
    referencedDataSources,
    resolvers,
    graphqlDefinition,
  };
};

/**
 * Take in a ts.SourceFile object, and ensure a few things.
 *   1/ the only require statements are from '../resolver'
 *   2/ that there is an exported method called 'handler'.
 */
export const validateResolver = (sourceFile: ts.SourceFile): void => {
  let hasResolverImport = false;
  let hasHandlerExport = false;
  sourceFile.forEachChild((node) => {
    if (isImportDeclaration(node)) {
      if (node.moduleSpecifier.getText().match('../resolver')) hasResolverImport = true;
      else throw new Error(`Invalid import: ${node.moduleSpecifier.getText()}, only expected resolver import`);
    }
    if (isVariableStatement(node)) {
      if (isHandlerFunction(node)) hasHandlerExport = true;
      else throw new Error(`Invalid method ${name}, expected only a single exported method named handler.`);
    }
  });
  if (!hasHandlerExport) throw new Error(`No handler export found`);
  if (!hasResolverImport) throw new Error(`No resolver import found`);
};
