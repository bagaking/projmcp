import { spawn } from 'child_process';

const server = spawn('node', ['dist/index-enhanced.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Test tools/list
const listToolsRequest = {
  id: 1,
  jsonrpc: "2.0",
  method: "tools/list"
};

server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Test list_files tool
setTimeout(() => {
  const callToolRequest = {
    id: 2,
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "list_files",
      arguments: {
        type: "all"
      }
    }
  };
  
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');
}, 100);

let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  console.log('Response:', data.toString());
});

server.on('error', (error) => {
  console.error('Server error:', error);
});

setTimeout(() => {
  server.kill();
}, 1000);