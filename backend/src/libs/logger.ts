export const logger = {
  info: (message: string, context?: any) => {
    console.log(`[INFO] ${message}`, context || '');
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context || '');
  },
  error: (message: string, error?: Error, context?: any) => {
    console.error(`[ERROR] ${message}`, error, context || '');
  },
  debug: (message: string, context?: any) => {
    // Only log debug messages in development environment
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  },
};
