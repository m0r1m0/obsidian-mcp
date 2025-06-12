#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as fs from 'fs/promises';
import { ObsidianService } from './obsidian-service.js';

const argv = await yargs(hideBin(process.argv))
  .option('vault-path', {
    type: 'string',
    demandOption: true,
    description: 'Path to the Obsidian vault directory'
  })
  .help()
  .argv;

const vaultPath = argv['vault-path'];

try {
  await fs.access(vaultPath);
  const stats = await fs.stat(vaultPath);
  if (!stats.isDirectory()) {
    console.error(`Error: ${vaultPath} is not a directory`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Error: Vault path ${vaultPath} does not exist or is not accessible`);
  process.exit(1);
}

const obsidianService = new ObsidianService(vaultPath);

const server = new Server(
  {
    name: 'obsidian-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_notes',
        description: 'Search for notes in the Obsidian vault',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            search_type: {
              type: 'string',
              enum: ['filename', 'content', 'tag', 'regex'],
              description: 'Type of search to perform'
            }
          },
          required: ['query', 'search_type']
        }
      },
      {
        name: 'read_note',
        description: 'Read the content of a specific note',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the note file (relative to vault)'
            }
          },
          required: ['file_path']
        }
      },
      {
        name: 'create_note',
        description: 'Create a new note in the vault',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path where the note should be created (relative to vault)'
            },
            content: {
              type: 'string',
              description: 'Content of the new note'
            }
          },
          required: ['file_path', 'content']
        }
      },
      {
        name: 'update_note',
        description: 'Update the content of an existing note',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the note file (relative to vault)'
            },
            content: {
              type: 'string',
              description: 'New content for the note'
            }
          },
          required: ['file_path', 'content']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_notes': {
        const { query, search_type } = args as any;
        const results = await obsidianService.searchNotes(query, search_type);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }

      case 'read_note': {
        const { file_path } = args as any;
        const content = await obsidianService.readNote(file_path);
        
        return {
          content: [
            {
              type: 'text',
              text: content
            }
          ]
        };
      }

      case 'create_note': {
        const { file_path, content } = args as any;
        await obsidianService.createNote(file_path, content);
        
        return {
          content: [
            {
              type: 'text',
              text: `Note created successfully: ${file_path}`
            }
          ]
        };
      }

      case 'update_note': {
        const { file_path, content } = args as any;
        await obsidianService.updateNote(file_path, content);
        
        return {
          content: [
            {
              type: 'text',
              text: `Note updated successfully: ${file_path}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Obsidian MCP Server running on stdio');
  console.error(`Vault path: ${vaultPath}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});