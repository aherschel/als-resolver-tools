import { CodeBlockWriter } from 'ts-morph';

export const getResolverWriter = () => (writer: CodeBlockWriter) => writer
  .write('export function request(ctx)')
  .block(() => writer.writeLine('return {};'))
  .blankLine()
  .write('export function response(ctx)')
  .block(() => writer.writeLine('return ctx.prev.result;'));
