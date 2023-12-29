import { Project } from 'ts-morph';
import { join } from 'path';
import { rimrafSync } from 'rimraf';
import { mkdirSync, writeFileSync } from 'fs';
import { getConstructWriter, getResolverWriter, getPipelineFunctionWriter, writeMergedDefinition } from './writer';
import { parseResolver, validateResolver } from './parser';
import { addressFileName, functionFileName } from './address-utils';

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
  const resolverSourceFile = project.createSourceFile(addressFileName(parsedResolver.address), getResolverWriter());
  writeFileSync(join(sampleProjectOutputPath, resolverSourceFile.getBaseName()), resolverSourceFile.print());
  parsedResolver.pipelineFunctions.forEach(pipelineFunction => {
    const pipelineFunctionSourceFile = project.createSourceFile(functionFileName(parsedResolver.address, pipelineFunction.name), getPipelineFunctionWriter(pipelineFunction.statements, ['responseBlock']));
    writeFileSync(join(sampleProjectOutputPath, pipelineFunctionSourceFile.getBaseName()), pipelineFunctionSourceFile.print());
  });
});

writeFileSync(join(sampleProjectOutputPath, 'schema.graphql'), writeMergedDefinition(parsedResolvers.map(p => p.parsedGraphqlDefinitions)));

const resolverConstructSourcefile = project.createSourceFile('resolver-constructs.ts', getConstructWriter(parsedResolvers));
writeFileSync(join(sampleProjectOutputPath, resolverConstructSourcefile.getBaseName()), resolverConstructSourcefile.print());
