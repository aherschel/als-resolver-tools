import { CodeBlockWriter } from 'ts-morph';

export const getPipelineFunctionWriter = (requestLines: string[], responseLines: string[]) => (writer: CodeBlockWriter) => {
  writer.writeLine('import { util } from \'@aws-appsync/utils\';');
  writer.blankLine();
  writer.write('export function request(ctx)');
  writer.block(() => {
    requestLines.forEach(requestLine => writer.writeLine(requestLine));
  });
  writer.blankLine();
  writer.write('export function response(ctx)');
  writer.block(() => {
    responseLines.forEach(responseLine => writer.writeLine(responseLine));
  });
};
