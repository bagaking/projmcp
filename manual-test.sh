#!/bin/bash

# 手动测试MCP服务器的完整脚本

echo "🚀 Starting MCP Server Manual Test..."
echo "======================================="

# 启动服务器并通过stdio进行交互
{
  # 初始化连接
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"manual-test","version":"1.0.0"}}}'
  sleep 1
  
  # 列出所有工具
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 1
  
  # 测试 list_files
  echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_files","arguments":{"type":"all"}}}'
  sleep 1
  
  # 测试 show_current
  echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"show_current","arguments":{}}}'
  sleep 1
  
  # 测试 record 工具
  echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"record","arguments":{"type":"opinion","target":"test_decision","content":"This is a test decision record from manual testing."}}}'
  sleep 1
  
  # 测试 query_sprint 
  echo '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"query_sprint","arguments":{"sprintId":"M01_S01"}}}'
  sleep 2
  
} | node dist/index.js