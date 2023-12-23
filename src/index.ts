import { Project, ScriptTarget } from 'ts-morph';
import { parseResolver, validateResolver } from './parse-resolver';
import { mergedDefinitions } from './graphql-schema-builder';
import { print } from 'graphql';
import { join } from 'path';
import { rimrafSync } from 'rimraf';
import { mkdirSync, writeFileSync } from 'fs';
import { getCdkConstructFileWriter } from './cdk-construct-renderer';

// Setup Project Input Files
const project = new Project();
project.addSourceFilesAtPaths(join(__dirname, '..', 'sample-input', 'resolvers', '*.ts'));

// Process Project Files
project.getSourceFiles().forEach(validateResolver);
const parsedResolvers = project.getSourceFiles().map(parseResolver)
const generatedGraphqlSchema = print(mergedDefinitions(parsedResolvers.map(p => p.parsedGraphqlDefinitions)));
const generatedPipelineResolver: Record<string, string> = Object.fromEntries(parsedResolvers.map(p => [p.name, 'Static Pipeline Resolver Code']))
const generatedPipelineFunctions: Record<string, string> = Object.fromEntries(parsedResolvers.map(p => p.resolvers.flatMap(r => [`${p.name}.${r.resolverName}`, 'A pipeline function'])));

const renderProject = new Project({
    compilerOptions: {
        target: ScriptTarget.ESNext,
    },
});

renderProject.createSourceFile('resolver-constructs.ts', getCdkConstructFileWriter());

const sampleProjectOutputPath = join(__dirname, '..', 'sample-output');

// Write Output Files
rimrafSync(sampleProjectOutputPath);
mkdirSync(sampleProjectOutputPath);
renderProject.getSourceFiles().forEach((file) => writeFileSync(join(sampleProjectOutputPath, file.getBaseName()), file.print()));
writeFileSync(join(sampleProjectOutputPath, 'schema.graphql'), generatedGraphqlSchema);
Object.entries(generatedPipelineResolver).forEach(([name, code]) => writeFileSync(join(sampleProjectOutputPath, `${name}.js`), code));
Object.entries(generatedPipelineFunctions).forEach(([name, code]) => writeFileSync(join(sampleProjectOutputPath, `${name}.js`), code));
