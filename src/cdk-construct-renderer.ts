import { CodeBlockWriter } from 'ts-morph';

export const getCdkConstructFileWriter = () => (writer: CodeBlockWriter) => writer
  .writeLine('import { Construct } from \'constructs\';')
  .writeLine('import * as appsync from \'aws-cdk-lib/aws-appsync\';')
  .blankLine()
  .write('export type GeneratedResolverProps = ')
  .block(() => writer
    .writeLine('api: appsync.GraphqlApi;'))
  .blankLine()
  .write('export class GeneratedResolves extends Construct ')
  .block(() => writer
    .writeLine('constructor(scope: Construct, id: string, props: GeneratedResolverProps) ')
    .block(() => writer
      .writeLine('super(scope, id);')
    )
  );
