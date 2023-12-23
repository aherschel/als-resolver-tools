import { CodeBlockWriter } from 'ts-morph';

export const getPipelineFunctionWriter = (requestBlock: string, responseBlock: string) => (writer: CodeBlockWriter) => writer
  .writeLine('import { util } from \'@aws-appsync/utils\';')
  .blankLine()
  .write('export function request(ctx)')
  .block(() => writer.write(requestBlock))
  .blankLine()
  .write('export function response(ctx)')
  .block(() => writer.write(responseBlock));
