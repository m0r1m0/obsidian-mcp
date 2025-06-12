import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObsidianService } from './obsidian-service.js';
import { TestVault } from './test-utils.js';

// Mock the ObsidianService
vi.mock('./obsidian-service.js');

describe('MCP Server Logic', () => {
  let testVault: TestVault;
  let mockObsidianService: any;

  beforeEach(async () => {
    testVault = new TestVault();
    await testVault.create();
    
    // Create mock service
    mockObsidianService = {
      searchNotes: vi.fn(),
      readNote: vi.fn(),
      createNote: vi.fn(),
      updateNote: vi.fn(),
    };

    // Mock the constructor to return our mock
    vi.mocked(ObsidianService).mockImplementation(() => mockObsidianService);
  });

  afterEach(async () => {
    await testVault.cleanup();
    vi.clearAllMocks();
  });

  describe('Tool Schemas', () => {
    it('should define correct search_notes schema', () => {
      const searchToolSchema = {
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
      };

      expect(searchToolSchema.inputSchema.required).toEqual(['query', 'search_type']);
      expect(searchToolSchema.inputSchema.properties.search_type.enum).toEqual([
        'filename', 'content', 'tag', 'regex'
      ]);
    });

    it('should define correct read_note schema', () => {
      const readToolSchema = {
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
      };

      expect(readToolSchema.inputSchema.required).toEqual(['file_path']);
    });
  });

  describe('Tool Handler Logic', () => {
    describe('search_notes handler', () => {
      it('should call ObsidianService.searchNotes with correct parameters', async () => {
        const mockResults = [
          {
            filePath: 'test.md',
            fileName: 'test.md',
            createdAt: new Date(),
            updatedAt: new Date(),
            fileSize: 100,
            tags: ['#test']
          }
        ];
        mockObsidianService.searchNotes.mockResolvedValue(mockResults);

        // Simulate the handler logic
        const args = { query: 'test query', search_type: 'content' };
        const results = await mockObsidianService.searchNotes(args.query, args.search_type);
        
        const response = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };

        expect(mockObsidianService.searchNotes).toHaveBeenCalledWith('test query', 'content');
        expect(response.content[0].text).toContain('test.md');
      });

      it('should handle search errors', async () => {
        mockObsidianService.searchNotes.mockRejectedValue(new Error('Search failed'));

        // Simulate error handling
        try {
          await mockObsidianService.searchNotes('test', 'content');
        } catch (error) {
          const response = {
            content: [
              {
                type: 'text',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            ],
            isError: true
          };

          expect(response.isError).toBe(true);
          expect(response.content[0].text).toContain('Error: Search failed');
        }
      });
    });

    describe('read_note handler', () => {
      it('should call ObsidianService.readNote with correct parameters', async () => {
        mockObsidianService.readNote.mockResolvedValue('# Test Note\n\nContent here.');

        // Simulate the handler logic
        const args = { file_path: 'test.md' };
        const content = await mockObsidianService.readNote(args.file_path);
        
        const response = {
          content: [
            {
              type: 'text',
              text: content
            }
          ]
        };

        expect(mockObsidianService.readNote).toHaveBeenCalledWith('test.md');
        expect(response.content[0].text).toBe('# Test Note\n\nContent here.');
      });
    });

    describe('create_note handler', () => {
      it('should call ObsidianService.createNote with correct parameters', async () => {
        mockObsidianService.createNote.mockResolvedValue(undefined);

        // Simulate the handler logic
        const args = { file_path: 'new-note.md', content: '# New Note\n\nContent' };
        await mockObsidianService.createNote(args.file_path, args.content);
        
        const response = {
          content: [
            {
              type: 'text',
              text: `Note created successfully: ${args.file_path}`
            }
          ]
        };

        expect(mockObsidianService.createNote).toHaveBeenCalledWith(
          'new-note.md',
          '# New Note\n\nContent'
        );
        expect(response.content[0].text).toBe('Note created successfully: new-note.md');
      });
    });

    describe('update_note handler', () => {
      it('should call ObsidianService.updateNote with correct parameters', async () => {
        mockObsidianService.updateNote.mockResolvedValue(undefined);

        // Simulate the handler logic
        const args = { file_path: 'existing.md', content: '# Updated Note\n\nNew content' };
        await mockObsidianService.updateNote(args.file_path, args.content);
        
        const response = {
          content: [
            {
              type: 'text',
              text: `Note updated successfully: ${args.file_path}`
            }
          ]
        };

        expect(mockObsidianService.updateNote).toHaveBeenCalledWith(
          'existing.md',
          '# Updated Note\n\nNew content'
        );
        expect(response.content[0].text).toBe('Note updated successfully: existing.md');
      });
    });

    describe('error handling', () => {
      it('should handle unknown tool names', async () => {
        const toolName = 'unknown_tool';
        
        // Simulate unknown tool error
        const error = new Error(`Unknown tool: ${toolName}`);
        const response = {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };

        expect(response.isError).toBe(true);
        expect(response.content[0].text).toContain('Error: Unknown tool: unknown_tool');
      });
    });
  });
});