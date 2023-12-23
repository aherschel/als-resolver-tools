import { CodeBlockWriter } from 'ts-morph';
import { DataSourceRef } from '../parser';

export type GetConstructWriterProps = {
  dataSources: DataSourceRef[];
};

export const getConstructWriter = ({ dataSources }: GetConstructWriterProps) => (writer: CodeBlockWriter) => {
  writer.writeLine('import { Construct } from \'constructs\';');
  writer.writeLine('import * as appsync from \'aws-cdk-lib/aws-appsync\';');
  writer.blankLine();
  writer.write('export type GeneratedResolverProps = ');
  writer.block(() => {
    writer.writeLine('api: appsync.GraphqlApi;');
    dataSources.forEach((dataSource) => writer.writeLine(`${dataSource.dataSourceName}: appsync.BaseDataSource;`));
  });
  writer.blankLine();
  writer.write('export class GeneratedResolves extends Construct ');
  writer.block(() => {
    writer.writeLine('constructor(scope: Construct, id: string, props: GeneratedResolverProps) ');
    writer.block(() => {
      writer.writeLine('super(scope, id);');
    });
  });
};
