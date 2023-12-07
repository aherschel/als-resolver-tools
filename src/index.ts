import { createProjectSync } from '@ts-morph/bootstrap';
import { parseResolver, validateResolver } from './parse-resolver';
import * as path from 'path';

const sampleProjectPath = path.join(__dirname, '..', 'sample-input');

const project = createProjectSync();
project.addSourceFilesByPathsSync(path.join(sampleProjectPath, 'resolvers', '*.ts'));
project.getSourceFiles().forEach(sourceFile => {
  validateResolver(sourceFile);
  parseResolver(sourceFile);
});
