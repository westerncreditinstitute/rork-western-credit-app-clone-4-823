const isDevelopment = __DEV__;

const trackError = (args: unknown[]) => {
  // TODO: Send to error tracking service (e.g., Sentry, Bugsnag)
  // For now, we ensure errors are at least captured
};

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[App]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error('[App]', ...args);
    }
    trackError(args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn('[App]', ...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug('[App]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[App]', ...args);
    }
  },
};
