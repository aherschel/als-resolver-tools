import { ts } from '@ts-morph/bootstrap';

const isHandlerFunction = (node: ts.Node): node is ts.VariableStatement => {
  return node.kind === ts.SyntaxKind.VariableStatement
    && (node as ts.VariableStatement).declarationList.declarations[0].name.getText() === 'handler'
    && ((node as ts.VariableStatement).modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
};

type DataSourceRef = {
  variableName: string;
  dataSourceName: string;
  dataSourceType: string;
};

export const parseResolver = (sourceFile: ts.SourceFile) => {
  let requestType: string | ts.TypeLiteralNode | null = null;
  let responseType: string | ts.TypeLiteralNode | null = null;
  const dataSources: DataSourceRef[] = [];
  console.log(`In SourceFile: ${sourceFile.fileName}`);
  sourceFile.forEachChild((node) => {
    if (isHandlerFunction(node)) {
      const declarationExp = node.declarationList.declarations[0].initializer!;
      if (declarationExp.kind === ts.SyntaxKind.ArrowFunction) {
        const arrowFunc = declarationExp as ts.ArrowFunction;
        arrowFunc.forEachChild((arrowChild) => {
          if (arrowChild.kind === ts.SyntaxKind.TypeReference) {
            const responseTypeReference = arrowChild as ts.TypeReferenceNode;
            const typeName = responseTypeReference.typeName.getText();
            console.log(`response type name: ${typeName}`);
            responseType = typeName;
          }
          if (arrowChild.kind === ts.SyntaxKind.TypeLiteral) {
            const typeLiteral = arrowChild as ts.TypeLiteralNode;
            console.log(`response type ${typeLiteral.getFullText()}`);
            responseType = typeLiteral;
          }
        });
        arrowFunc.parameters.forEach((param) => {
          if (param.kind === ts.SyntaxKind.Parameter) {
            const parameter = param as ts.ParameterDeclaration;
            const paramType = parameter.type!;
            if (paramType.kind === ts.SyntaxKind.TypeReference) {
              const typeReference = paramType as ts.TypeReferenceNode;
              const typeName = typeReference.typeName.getText();
              requestType = typeName;
            }
            if (paramType.kind === ts.SyntaxKind.TypeLiteral) {
              const typeLiteral = paramType as ts.TypeLiteralNode;
              requestType = typeLiteral;
            }
          }
        });
        arrowFunc.body.forEachChild((child) => {
          if (child.kind === ts.SyntaxKind.VariableStatement) {
            const variableStatement = child as ts.VariableStatement;
            const variableDeclaration = variableStatement.declarationList.declarations[0];
            const variableName = variableDeclaration.name.getText();
            const variableInitializer = variableDeclaration.initializer!;
            if (variableInitializer.kind === ts.SyntaxKind.CallExpression) {
              const callExpression = variableInitializer as ts.CallExpression;
              if (callExpression.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
                const propertyAccessExpression = callExpression.expression as ts.PropertyAccessExpression;
                if (propertyAccessExpression.expression.getText() === 'resolver') {
                  switch (propertyAccessExpression.name.getText()) {
                    case 'getLambdaDataSource':
                      dataSources.push({ variableName, dataSourceName: callExpression.arguments[0].getText(), dataSourceType: 'lambda' });
                      break;
                    case 'getDynamoDbDataSource':
                      dataSources.push({ variableName, dataSourceName: callExpression.arguments[0].getText(), dataSourceType: 'dynamodb' });
                      break;
                  }
                }
              }
            }
          }
        });
      }
      // Process handler function
      // Parse out input and output types
      // find invocations of resolver.get*DataSource, and then both 1) track those variables for invocation, and 2) track the required data sources
    }
    // console.log(node);
  });
  console.log(`requestType: ${JSON.stringify(requestType, null, 4)}`);
  console.log(`responseType: ${JSON.stringify(responseType, null, 4)}`);
  // If request/response types are names we need to go find the type literal definitions
  console.log(`dataSources: ${JSON.stringify(dataSources, null, 4)}`);
};

/**
 * Take in a ts.SourceFile object, and ensure a few things. 1) the only require statements are from '../resolver', and 1) that there is an exported method called 'handler'.
 */
export const validateResolver = (sourceFile: ts.SourceFile) => {
  let hasResolverImport = false;
  let hasHandlerExport = false;
  sourceFile.forEachChild((node) => {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      const importDeclaration = node as ts.ImportDeclaration;
      const importText = importDeclaration.moduleSpecifier.getText();
      if (importText.match('../resolver')) {
        hasResolverImport = true;
      } else {
        throw new Error(`Invalid import: ${importDeclaration.moduleSpecifier.getText()}, only expected resolver import`);
      }
    }
    if (node.kind === ts.SyntaxKind.VariableStatement) {
      if (isHandlerFunction(node)) {
        hasHandlerExport = true;
      } else {
        throw new Error(`Invalid method ${name}, expected only a single exported method named handler.`);
      }
    }
  });
  if (!hasHandlerExport) throw new Error(`No handler export found`);
  if (!hasResolverImport) throw new Error(`No resolver import found`);
};