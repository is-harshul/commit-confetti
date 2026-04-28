export type Tier = 'first-of-day' | 'big' | 'medium' | 'small';

export interface Config {
  enabled: boolean;
  soundPack: string;
  notifications: boolean;
  commitsCelebrated: number;
}

export const DEFAULT_CONFIG: Config = {
  enabled: true,
  soundPack: 'default',
  notifications: true,
  commitsCelebrated: 0,
};

export const UNSET_SENTINEL = '__UNSET__';
