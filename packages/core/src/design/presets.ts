import type { DnaSeed } from './tokens.js';
import type { IdentityConfig } from './identity/types.js';

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  tokens: {
    dna: DnaSeed;
    identity: IdentityConfig;
  };
}

/** Shape of each option written to /presets/available state for dropdown consumption */
export interface PresetOption {
  value: string;
  label: string;
}
