import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

export class TestVault {
  public vaultPath: string;

  constructor() {
    this.vaultPath = '';
  }

  async create(): Promise<void> {
    this.vaultPath = await fs.mkdtemp(path.join(tmpdir(), 'obsidian-test-vault-'));
  }

  async cleanup(): Promise<void> {
    if (this.vaultPath) {
      await fs.rm(this.vaultPath, { recursive: true, force: true });
    }
  }

  async createFile(filePath: string, content: string): Promise<void> {
    const fullPath = path.join(this.vaultPath, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async createFiles(files: Record<string, string>): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      await this.createFile(filePath, content);
    }
  }

  getFullPath(filePath: string): string {
    return path.join(this.vaultPath, filePath);
  }
}