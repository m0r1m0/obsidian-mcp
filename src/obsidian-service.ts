import * as fs from 'fs/promises';
import * as path from 'path';
import { SearchResult, SearchType } from './types.js';

export class ObsidianService {
  constructor(private vaultPath: string) {}

  async searchNotes(query: string, searchType: SearchType): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    try {
      const files = await this.getAllMarkdownFiles();
      
      for (const filePath of files) {
        const result = await this.processFileForSearch(filePath, query, searchType);
        if (result) {
          results.push(result);
        }
      }
    } catch (error) {
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  async readNote(filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    
    try {
      await this.validateFileAccess(fullPath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createNote(filePath: string, content: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    
    try {
      await this.ensureDirectoryExists(path.dirname(fullPath));
      
      if (await this.fileExists(fullPath)) {
        throw new Error(`File already exists: ${filePath}`);
      }
      
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateNote(filePath: string, content: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    
    try {
      await this.validateFileAccess(fullPath);
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getAllMarkdownFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const walkDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(path.relative(this.vaultPath, fullPath));
        }
      }
    };
    
    await walkDir(this.vaultPath);
    return files;
  }

  private async processFileForSearch(filePath: string, query: string, searchType: SearchType): Promise<SearchResult | null> {
    const fullPath = this.getFullPath(filePath);
    const stats = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const fileName = path.basename(filePath);
    
    let isMatch = false;
    let matchedContent: string | undefined;
    let matchedLineNumbers: number[] = [];
    
    switch (searchType) {
      case 'filename':
        isMatch = fileName.toLowerCase().includes(query.toLowerCase());
        break;
      
      case 'content':
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query.toLowerCase())) {
            isMatch = true;
            matchedLineNumbers.push(i + 1);
            if (!matchedContent) {
              matchedContent = this.getContextAroundMatch(lines, i);
            }
          }
        }
        break;
      
      case 'tag':
        const tagPattern = new RegExp(`#${query.replace(/^#/, '')}\\b`, 'gi');
        const tagMatches = content.match(tagPattern);
        if (tagMatches) {
          isMatch = true;
          matchedContent = tagMatches.join(', ');
        }
        break;
      
      case 'regex':
        try {
          const regex = new RegExp(query, 'gi');
          const regexMatches = content.match(regex);
          if (regexMatches) {
            isMatch = true;
            matchedContent = regexMatches.slice(0, 3).join(', ');
          }
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${query}`);
        }
        break;
    }
    
    if (!isMatch) {
      return null;
    }
    
    const tags = this.extractTags(content);
    
    return {
      filePath,
      fileName,
      matchedContent,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      fileSize: stats.size,
      tags,
      matchedLineNumbers: matchedLineNumbers.length > 0 ? matchedLineNumbers : undefined
    };
  }

  private getContextAroundMatch(lines: string[], matchIndex: number, contextLines: number = 1): string {
    const start = Math.max(0, matchIndex - contextLines);
    const end = Math.min(lines.length, matchIndex + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  private extractTags(content: string): string[] {
    const tagPattern = /#[\w-]+/g;
    const matches = content.match(tagPattern);
    return matches ? Array.from(new Set(matches)) : [];
  }

  private getFullPath(filePath: string): string {
    const fullPath = path.resolve(this.vaultPath, filePath);
    
    if (!fullPath.startsWith(path.resolve(this.vaultPath))) {
      throw new Error('Access denied: Path is outside vault directory');
    }
    
    return fullPath;
  }

  private async validateFileAccess(fullPath: string): Promise<void> {
    try {
      await fs.access(fullPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`File not accessible: ${fullPath}`);
    }
  }

  private async fileExists(fullPath: string): Promise<boolean> {
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }
}