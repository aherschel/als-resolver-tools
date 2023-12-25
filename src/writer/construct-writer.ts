import { CodeBlockWriter } from 'ts-morph';
import { DataSourceRef, DataSourceType, ParsedResolver, ResolverAddress } from '../types';
import { addressFileName, addressResolverName, functionFileName } from '../address-utils';

type DataSourceTypeConfig = {
  propSuffix: string;
  importedNamespace: string;
  importCdkSuffix: string;
  dataSourceConstructor: string;
};

const DATASOURCETYPE_CONFIG: Record<DataSourceType, DataSourceTypeConfig> = {
  lambda: {
    propSuffix: 'Function',
    importedNamespace: 'lambda',
    importCdkSuffix: 'aws-lambda',
    dataSourceConstructor: 'addLambdaDataSource',
  },
  dynamodb: {
    propSuffix: 'Table',
    importedNamespace: 'dynamodb',
    importCdkSuffix: 'aws-dynamodb',
    dataSourceConstructor: 'addDynamoDbDataSource',
  },
};

const propNameFromDataSource = (dataSource: DataSourceRef): string => `${dataSource.variableName}${propSuffixFromDataSource(dataSource)}`;
const propSuffixFromDataSource = ({ dataSourceType }: DataSourceRef): string => DATASOURCETYPE_CONFIG[dataSourceType].propSuffix;
const importedNamespaceFromDataSource = ({ dataSourceType }: DataSourceRef): string => DATASOURCETYPE_CONFIG[dataSourceType].importedNamespace;
const cdkImportSuffixFromDataSource = ({ dataSourceType }: DataSourceRef): string => DATASOURCETYPE_CONFIG[dataSourceType].importCdkSuffix;
const importFromDataSource = (dataSource: DataSourceRef): string => `import * as ${importedNamespaceFromDataSource(dataSource)} from 'aws-cdk-lib/${cdkImportSuffixFromDataSource(dataSource)}';`;
const propTypeFromDataSource = (dataSource: DataSourceRef): string => `${importedNamespaceFromDataSource(dataSource)}.${propSuffixFromDataSource(dataSource)}`;
const variableNameFromDataSource = ({ variableName }: DataSourceRef): string => `${variableName}DataSource`;
const constructorFromDataSource = ({ dataSourceType }: DataSourceRef): string => DATASOURCETYPE_CONFIG[dataSourceType].dataSourceConstructor;
const variableDeclarationFromDataSource = (dataSource: DataSourceRef): string => `const ${variableNameFromDataSource(dataSource)} = props.api.${constructorFromDataSource(dataSource)}('${variableNameFromDataSource(dataSource)}', props.${propNameFromDataSource(dataSource)});`;
const dedupeDataSources = (dataSources: DataSourceRef[]): DataSourceRef[] => Object.values(Object.fromEntries(dataSources.map((dataSource) => [dataSource.variableName, dataSource])));
const generateDataSourceTypeInputs = (dataSources: DataSourceRef[]): string[] => dataSources.map(dataSource => `${propNameFromDataSource(dataSource)}: ${propTypeFromDataSource(dataSource)}`)
const generateImportRowsForDataSources = (dataSources: DataSourceRef[]): string[] => [...new Set(dataSources.map(importFromDataSource))];
const generateDefinitionsForDataSources = (dataSources: DataSourceRef[]): string[] => dataSources.map(variableDeclarationFromDataSource);

type DataSourceStatements = {
  typeRows: string[];
  importRows: string[];
  definitions: string[];
};

const computeDataSourceInputs = (dataSources: DataSourceRef[]): DataSourceStatements => {
  const dedupedDataSources = dedupeDataSources(dataSources);
  return {
    typeRows: generateDataSourceTypeInputs(dedupedDataSources),
    importRows: generateImportRowsForDataSources(dedupedDataSources),
    definitions: generateDefinitionsForDataSources(dedupedDataSources),
  };
};

type ResolverDefinition = {
  address: ResolverAddress;
  pipelineFunctionNames: string[];
};

const computeResolvers = (resolvers: ParsedResolver[], ): ResolverDefinition[] => resolvers.map(({ address, pipelineFunctions }) => ({
  address,
  pipelineFunctionNames: pipelineFunctions.map(f => f.name),
}));

const pipelineFunctionVariableName = (address: ResolverAddress, functionName: string): string => `${address.fieldName}${address.typeName}${functionName}`;

const writeResolver = (writer: CodeBlockWriter, { address, pipelineFunctionNames }: ResolverDefinition): void => {
  const referencedFunctions = pipelineFunctionNames.map(functionName => pipelineFunctionVariableName(address, functionName));
  writer.write(`props.api.createResolver('${addressResolverName(address)}',`);
  writer.block(() => {
    writer.writeLine(`typeName: '${address.typeName}',`);
    writer.writeLine(`fieldName: '${address.fieldName}',`);
    writer.writeLine(`code: appsync.Code.fromAsset('${addressFileName(address)}'),`);
    writer.writeLine('runtime: appsync.FunctionRuntime.JS_1_0_0,');
    writer.writeLine('pipelineConfig: [');
    referencedFunctions.forEach(functionName => {
      writer.indent();
      writer.writeLine(`${functionName},`);
    });
    writer.writeLine('],');
  })
  writer.write(');');
}

const writePipelineFunction = (writer: CodeBlockWriter, address: ResolverAddress, pipelineFunctionName: string): void => {
  const fnName = pipelineFunctionVariableName(address, pipelineFunctionName);
  writer.write(`const ${fnName} = new appsync.AppsyncFunction(this, '${fnName}',`)
  writer.block(() => {
    writer.writeLine(`name: '${fnName}',`);
    writer.writeLine('api: props.api,');
    writer.writeLine(`dataSource: ${variableNameFromDataSource({ variableName: pipelineFunctionName } as any)},`);
    writer.writeLine(`code: appsync.Code.fromAsset('${functionFileName(address, pipelineFunctionName)}')`);
    writer.writeLine('runtime: appsync.FunctionRuntime.JS_1_0_0,');
  });
  writer.write(');');
};

export const getConstructWriter = (resolvers: ParsedResolver[]) => (writer: CodeBlockWriter) => {
  const resolverDefinitions = computeResolvers(resolvers);
  const dataSourceInputs = computeDataSourceInputs(resolvers.flatMap(p => p.referencedDataSources));
  writer.writeLine('import { Construct } from \'constructs\';');
  writer.writeLine('import * as appsync from \'aws-cdk-lib/aws-appsync\';');
  dataSourceInputs.importRows.forEach(importRow => writer.writeLine(importRow));
  writer.blankLine();
  writer.write('export type GeneratedResolverProps = ');
  writer.block(() => {
    writer.writeLine('api: appsync.GraphqlApi;');
    dataSourceInputs.typeRows.forEach(typeRow => writer.writeLine(typeRow));
  });
  writer.blankLine();
  writer.write('export class GeneratedResolvers extends Construct ');
  writer.block(() => {
    writer.writeLine('constructor(scope: Construct, id: string, props: GeneratedResolverProps) ');
    writer.block(() => {
      writer.writeLine('super(scope, id);');
      writer.writeLine('// Create DataSources');
      dataSourceInputs.definitions.forEach(definition => writer.writeLine(definition));
      writer.blankLine(),
      writer.writeLine('// Create Functions');
      resolverDefinitions.forEach(({ address, pipelineFunctionNames }) => {
        pipelineFunctionNames.forEach(pipelineFunctionName => {
          writePipelineFunction(writer, address, pipelineFunctionName);
        });
      });
      writer.blankLine(),
      writer.writeLine('// Create Resolvers');
      resolverDefinitions.forEach(resolver => writeResolver(writer, resolver));
    });
  });
};
