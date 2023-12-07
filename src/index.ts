import { createProjectSync } from '@ts-morph/bootstrap';
import { parseResolver, validateResolver } from './parse-resolver';
import * as path from 'path';

const sampleProjectPath = path.join(__dirname, '..', 'sample-input');
const project = createProjectSync();
project.addSourceFilesByPathsSync(path.join(sampleProjectPath, 'resolvers', '*.ts'));
project.getSourceFiles().forEach(validateResolver);
const parsedResolvers = project.getSourceFiles().map(parseResolver)
// console.debug(`Generated Parsed Resolvers: ${JSON.stringify(parsedResolvers, null, 2)}`);
