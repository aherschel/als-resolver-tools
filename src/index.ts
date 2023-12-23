import { Project } from 'ts-morph';
import { parseResolver, validateResolver } from './parse-resolver';
import { mergedDefinitions } from './graphql-schema-builder';
import { print } from 'graphql';
import { join } from 'path';
import { rimrafSync } from 'rimraf';
import { mkdirSync, writeFileSync } from 'fs';
import { getCdkConstructFileWriter } from './cdk-construct-renderer';
import { getResolverWriter } from './resolver-renderer';
import { getPipelineFunctionWriter } from './pipeline-function-renderer';

const sampleProjectOutputPath = join(__dirname, '..', 'sample-output');
rimrafSync(sampleProjectOutputPath);
mkdirSync(sampleProjectOutputPath);

const project = new Project();
project.addSourceFilesAtPaths(join(__dirname, '..', 'sample-input', 'resolvers', '*.ts'));

const parsedResolvers = project.getSourceFiles().map((sourceFile) => {
  validateResolver(sourceFile);
  return parseResolver(sourceFile);
});

parsedResolvers.forEach((parsedResolver) => {
  const resolverSourceFile = project.createSourceFile(`${parsedResolver.name}.js`, getResolverWriter());
  writeFileSync(join(sampleProjectOutputPath, resolverSourceFile.getBaseName()), resolverSourceFile.print());
  parsedResolver.resolvers.forEach((resolver) => {
    const pipelineFunctionSourceFile = project.createSourceFile(`${parsedResolver.name}.${resolver.resolverName}.js`, getPipelineFunctionWriter('request block', 'response block'));
    writeFileSync(join(sampleProjectOutputPath, pipelineFunctionSourceFile.getBaseName()), pipelineFunctionSourceFile.print());
  });
});

writeFileSync(join(sampleProjectOutputPath, 'schema.graphql'), print(mergedDefinitions(parsedResolvers.map(p => p.parsedGraphqlDefinitions))));

const resolverConstructSourcefile = project.createSourceFile('resolver-constructs.ts', getCdkConstructFileWriter());
writeFileSync(join(sampleProjectOutputPath, resolverConstructSourcefile.getBaseName()), resolverConstructSourcefile.print());
