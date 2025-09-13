declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    PORT?: string | number;
    CORS_ORIGIN?: string;
    LOG_LEVEL?: string;
    
    // Supabase configuration
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_KEY?: string;
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS?: string | number;
    RATE_LIMIT_MAX_REQUESTS?: string | number;
  }
}