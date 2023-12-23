import { CodeBlockWriter } from 'ts-morph';
import { DataSourceRef, DataSourceType } from '../parser';

export type GetConstructWriterProps = {
  dataSources: DataSourceRef[];
};

const typeFromDataSourceType = (dataSourceType: DataSourceType): string => {
  switch(dataSourceType) {
    case 'dynamodb': return 'dynamodb.Table';
    case 'lambda': return 'lambda.Function';
    default: throw new Error(`Unexpected data source type ${dataSourceType}`);
  }
};

const importFromDataSourceType = (dataSourceType: DataSourceType): string => {
  switch(dataSourceType) {
    case 'dynamodb': return 'import * as dynamodb from \'aws-cdk-lib/aws-dynamodb\';';
    case 'lambda': return 'import * as lambda from \'aws-cdk-lib/aws-lambda\';';
    default: throw new Error(`Unexpected data source type ${dataSourceType}`);
  }
};

const computeDataSourceInputs = (dataSources: DataSourceRef[]): { typeRows: string[]; importRows: string[]; definitions: string[]; } => {
  const dataSourceInputs = Object.fromEntries(dataSources.map((dataSource) => [dataSource.variableName, dataSource]));
  const typeRows = Object.values(dataSourceInputs).map((dataSource) => `${dataSource.variableName}: ${typeFromDataSourceType(dataSource.dataSourceType)}`);
  const importRows = Object.values(dataSourceInputs).map((dataSource) => importFromDataSourceType(dataSource.dataSourceType));
  const definitions = Object.values(dataSourceInputs).map((dataSource) => dataSource.dataSourceName); // TODO: Implement me
  return {
    typeRows,
    importRows,
    definitions,
  };
};

export const getConstructWriter = ({ dataSources }: GetConstructWriterProps) => (writer: CodeBlockWriter) => {
  const dataSourceInputs = computeDataSourceInputs(dataSources);
  writer.writeLine('import { Construct } from \'constructs\';');
  writer.writeLine('import * as appsync from \'aws-cdk-lib/aws-appsync\';');
  dataSourceInputs.importRows.forEach((importRow) => writer.writeLine(importRow));
  writer.blankLine();
  writer.write('export type GeneratedResolverProps = ');
  writer.block(() => {
    writer.writeLine('api: appsync.GraphqlApi;');
    dataSourceInputs.typeRows.forEach((typeRow) => writer.writeLine(typeRow));
  });
  writer.blankLine();
  writer.write('export class GeneratedResolves extends Construct ');
  writer.block(() => {
    writer.writeLine('constructor(scope: Construct, id: string, props: GeneratedResolverProps) ');
    writer.block(() => {
      writer.writeLine('super(scope, id);');
      writer.writeLine('// Create DataSources');
      dataSourceInputs.definitions.forEach((definition) => writer.writeLine(definition));
    });
  });
};
