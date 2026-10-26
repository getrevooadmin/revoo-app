export * from './hooks';
export * from './utils';
export * from './database.types';

export type Tables<T extends keyof import('./database.types').Database['public']['Tables']> =
  import('./database.types').Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof import('./database.types').Database['public']['Tables']> =
  import('./database.types').Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof import('./database.types').Database['public']['Tables']> =
  import('./database.types').Database['public']['Tables'][T]['Update'];
