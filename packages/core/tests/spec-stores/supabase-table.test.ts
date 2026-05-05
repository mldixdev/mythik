import { describe, it, expect } from 'vitest';
import { SupabaseSpecStore } from '../../src/spec-stores/supabase.js';

describe('SupabaseSpecStore — table config', () => {
  it('defaults to "screens" table', () => {
    const store = new SupabaseSpecStore({ url: 'https://x.supabase.co', apiKey: 'key' });
    expect((store as unknown as { tableName: string }).tableName).toBe('screens');
  });

  it('uses custom table name', () => {
    const store = new SupabaseSpecStore({ url: 'https://x.supabase.co', apiKey: 'key', table: 'api_specs' });
    expect((store as unknown as { tableName: string }).tableName).toBe('api_specs');
  });
});
