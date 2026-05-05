import type { SpecStore } from '../spec-engine/types.js';
import fs from 'fs';
import path from 'path';

export class FileSpecStore implements SpecStore {
  private directory: string;

  constructor(config: { directory: string }) {
    this.directory = config.directory;
  }

  async load(screenId: string): Promise<unknown> {
    const filePath = path.join(this.directory, `${screenId}.json`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  async save(screenId: string, spec: unknown): Promise<void> {
    fs.mkdirSync(this.directory, { recursive: true });
    const filePath = path.join(this.directory, `${screenId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(spec, null, 2), 'utf-8');
  }

  async list(): Promise<string[]> {
    if (!fs.existsSync(this.directory)) return [];
    const files = fs.readdirSync(this.directory).filter(f => f.endsWith('.json'));
    return files.map(f => path.basename(f, '.json'));
  }

  async delete(screenId: string): Promise<void> {
    const filePath = path.join(this.directory, `${screenId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Spec "${screenId}" not found`);
    }
    fs.unlinkSync(filePath);
  }
}
