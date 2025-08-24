// Debug schema registration

import { ListFilesTool } from './dist/tools/list-files.js';
import { FileManager } from './dist/utils/file-manager.js';

const fileManager = new FileManager();
const tool = new ListFilesTool(fileManager);

console.log('Tool name:', tool.name);
console.log('Tool description:', tool.description);
console.log('Tool inputSchema:', JSON.stringify(tool.inputSchema, null, 2));