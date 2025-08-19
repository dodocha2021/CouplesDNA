#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const osascript = require('node-osascript');

const server = new Server(
  {
    name: 'osascript-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'osascript',
        description: 'Execute AppleScript commands on macOS',
        inputSchema: {
          type: 'object',
          properties: {
            script: {
              type: 'string',
              description: 'The AppleScript code to execute',
            },
          },
          required: ['script'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'osascript') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { script } = request.params.arguments;

  try {
    const result = await new Promise((resolve, reject) => {
      osascript.execute(script, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    return {
      content: [
        {
          type: 'text',
          text: result || 'Script executed successfully (no output)',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing script: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OSAScript MCP server running on stdio');
}

main().catch(console.error);