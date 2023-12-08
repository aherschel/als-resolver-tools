import { createProjectSync } from '@ts-morph/bootstrap';
import { parseResolver, validateResolver } from './parse-resolver';
import { mergedDefinitions } from './graphql-schema-builder';
import { print } from 'graphql';
import { join } from 'path';
import { rimrafSync } from 'rimraf';
import { mkdirSync, writeFileSync } from 'fs';

// Setup Project Input Files
const project = createProjectSync();
project.addSourceFilesByPathsSync(join(__dirname, '..', 'sample-input', 'resolvers', '*.ts'));

// Process Project Files
project.getSourceFiles().forEach(validateResolver);
const parsedResolvers = project.getSourceFiles().map(parseResolver)
const generatedGraphqlSchema = print(mergedDefinitions(parsedResolvers.map(p => p.parsedGraphqlDefinitions)));
const generatedCdkCode = '';
const generatedPipelineResolver: Record<string, string> = Object.fromEntries(parsedResolvers.map(p => [p.name, 'Static Pipeline Resolver Code']))
const generatedPipelineFunctions: Record<string, string> = Object.fromEntries(parsedResolvers.map(p => p.resolvers.flatMap(r => [`${p.name}.${r.resolverName}`, 'A pipeline function'])));


// Write Output Files
const sampleProjectOutputPath = join(__dirname, '..', 'sample-output');
rimrafSync(sampleProjectOutputPath);
mkdirSync(sampleProjectOutputPath);
writeFileSync(join(sampleProjectOutputPath, 'schema.graphql'), generatedGraphqlSchema);
writeFileSync(join(sampleProjectOutputPath, 'resolver-constructs.ts'), generatedCdkCode);
Object.entries(generatedPipelineResolver).forEach(([name, code]) => writeFileSync(join(sampleProjectOutputPath, `${name}.js`), code));
Object.entries(generatedPipelineFunctions).forEach(([name, code]) => writeFileSync(join(sampleProjectOutputPath, `${name}.js`), code));
