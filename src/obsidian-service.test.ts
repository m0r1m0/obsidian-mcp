import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObsidianService } from './obsidian-service.js';
import { TestVault } from './test-utils.js';

describe('ObsidianService', () => {
  let testVault: TestVault;
  let service: ObsidianService;

  beforeEach(async () => {
    testVault = new TestVault();
    await testVault.create();
    service = new ObsidianService(testVault.vaultPath);
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('searchNotes', () => {
    beforeEach(async () => {
      await testVault.createFiles({
        'note1.md': '# First Note\n\nThis is a note about #programming and #javascript.',
        'note2.md': '# Second Note\n\nThis note discusses #programming concepts.',
        'folder/note3.md': '# Third Note\n\nThis note is about #design patterns.',
        'daily/2024-01-01.md': '# Daily Note\n\nToday I learned about machine learning.',
        'projects/webapp.md': '# Web Application\n\nBuilding a webapp with React.'
      });
    });

    it('should search by filename', async () => {
      const results = await service.searchNotes('2024-01-01', 'filename');
      
      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('2024-01-01.md');
      expect(results[0].filePath).toBe('daily/2024-01-01.md');
    });

    it('should search by content', async () => {
      const results = await service.searchNotes('machine learning', 'content');
      
      expect(results).toHaveLength(1);
      expect(results[0].fileName).toBe('2024-01-01.md');
      expect(results[0].matchedContent).toContain('machine learning');
      expect(results[0].matchedLineNumbers).toEqual([3]);
    });

    it('should search by tag', async () => {
      const results = await service.searchNotes('programming', 'tag');
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.fileName)).toContain('note1.md');
      expect(results.map(r => r.fileName)).toContain('note2.md');
    });

    it('should search by regex', async () => {
      const results = await service.searchNotes('#\\w+ing', 'regex');
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.fileName)).toContain('note1.md');
      expect(results.map(r => r.fileName)).toContain('note2.md');
    });

    it('should handle invalid regex', async () => {
      await expect(service.searchNotes('[invalid', 'regex'))
        .rejects.toThrow('Invalid regex pattern');
    });

    it('should return empty array when no matches found', async () => {
      const results = await service.searchNotes('nonexistent', 'content');
      expect(results).toHaveLength(0);
    });

    it('should include file metadata in results', async () => {
      const results = await service.searchNotes('programming', 'tag');
      
      expect(results[0]).toHaveProperty('createdAt');
      expect(results[0]).toHaveProperty('updatedAt');
      expect(results[0]).toHaveProperty('fileSize');
      expect(results[0].fileSize).toBeGreaterThan(0);
    });

    it('should extract tags from content', async () => {
      const results = await service.searchNotes('programming', 'tag');
      const note1Result = results.find(r => r.fileName === 'note1.md');
      
      expect(note1Result?.tags).toContain('#programming');
      expect(note1Result?.tags).toContain('#javascript');
    });
  });

  describe('readNote', () => {
    beforeEach(async () => {
      await testVault.createFile('test-note.md', '# Test Note\n\nThis is test content.');
    });

    it('should read note content', async () => {
      const content = await service.readNote('test-note.md');
      expect(content).toBe('# Test Note\n\nThis is test content.');
    });

    it('should throw error for non-existent file', async () => {
      await expect(service.readNote('nonexistent.md'))
        .rejects.toThrow('Failed to read note');
    });

    it('should prevent path traversal', async () => {
      await expect(service.readNote('../../../etc/passwd'))
        .rejects.toThrow('Access denied: Path is outside vault directory');
    });
  });

  describe('createNote', () => {
    it('should create new note', async () => {
      const content = '# New Note\n\nThis is new content.';
      await service.createNote('new-note.md', content);
      
      const readContent = await service.readNote('new-note.md');
      expect(readContent).toBe(content);
    });

    it('should create note in nested directory', async () => {
      const content = '# Nested Note\n\nIn a folder.';
      await service.createNote('folder/nested-note.md', content);
      
      const readContent = await service.readNote('folder/nested-note.md');
      expect(readContent).toBe(content);
    });

    it('should throw error if file already exists', async () => {
      await testVault.createFile('existing.md', 'existing content');
      
      await expect(service.createNote('existing.md', 'new content'))
        .rejects.toThrow('File already exists');
    });

    it('should prevent path traversal', async () => {
      await expect(service.createNote('../../../tmp/bad.md', 'content'))
        .rejects.toThrow('Access denied: Path is outside vault directory');
    });
  });

  describe('updateNote', () => {
    beforeEach(async () => {
      await testVault.createFile('update-test.md', '# Original Content');
    });

    it('should update existing note', async () => {
      const newContent = '# Updated Content\n\nThis has been updated.';
      await service.updateNote('update-test.md', newContent);
      
      const readContent = await service.readNote('update-test.md');
      expect(readContent).toBe(newContent);
    });

    it('should throw error for non-existent file', async () => {
      await expect(service.updateNote('nonexistent.md', 'content'))
        .rejects.toThrow('Failed to update note');
    });

    it('should prevent path traversal', async () => {
      await expect(service.updateNote('../../../tmp/bad.md', 'content'))
        .rejects.toThrow('Access denied: Path is outside vault directory');
    });
  });

  describe('error handling', () => {
    it('should handle search errors gracefully', async () => {
      const invalidService = new ObsidianService('/nonexistent/path');
      
      await expect(invalidService.searchNotes('test', 'content'))
        .rejects.toThrow('Search failed');
    });
  });
});