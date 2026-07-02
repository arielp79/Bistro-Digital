import { afterAll } from 'vitest';
import { dbReady } from './integration-setup.js';

afterAll(() => {
  if (process.env.CI_INTEGRATION_STRICT === '1' && !dbReady) {
    throw new Error(
      'CI_INTEGRATION_STRICT: MongoDB no disponible — los tests de integración no se ejecutaron.'
    );
  }
});
