import { CodeBlockWriter } from 'ts-morph';
import { DataSourceRef, DataSourceType } from '../parser';

export type GetConstructWriterProps = {
  dataSources: DataSourceRef[];
};

type DataSourceTypeConfig = {
  propSuffix: string;
  propType: string;
  importedNamespace: string;
  importCdkSuffix: string;
  dataSourceConstructor: string;
};

const DATASOURCETYPE_CONFIG: Record<DataSourceType, DataSourceTypeConfig> = {
  lambda: {
    propSuffix: 'Function',
    propType: 'lambda.Function',
    importedNamespace: 'lambda',
    importCdkSuffix: 'aws-lambda',
    dataSourceConstructor: 'addLambdaDataSource',
  },
  dynamodb: {
    propSuffix: 'Table',
    propType: 'dynamodb.Table',
    importedNamespace: 'dynamodb',
    importCdkSuffix: 'aws-dynamodb',
    dataSourceConstructor: 'addDynamoDbDataSource',
  },
};

const propNameFromDataSource = (dataSource: DataSourceRef): string => `${dataSource.variableName}${propSuffixFromDataSource(dataSource)}`;
const propSuffixFromDataSource = ({ dataSourceType }: DataSourceRef): string => DATASOURCETYPE_CONFIG[dataSourceType].propSuffix;
const propTypeFromDataSource = ({ dataSourceType }: DataSourceRef): string => DATASOURCETYPE_CONFIG[dataSourceType].propType
const importFromDataSource = ({ dataSourceType }: DataSourceRef): string => `import * as ${DATASOURCETYPE_CONFIG[dataSourceType].importedNamespace} from 'aws-cdk-lib/${DATASOURCETYPE_CONFIG[dataSourceType].importCdkSuffix}';`;
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

export const getConstructWriter = ({ dataSources }: GetConstructWriterProps) => (writer: CodeBlockWriter) => {
  const dataSourceInputs = computeDataSourceInputs(dataSources);
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
      writer.writeLine('// TK');
      writer.blankLine(),
      writer.writeLine('// Create Resolvers');
      writer.writeLine('// TK');
    });
  });
};
