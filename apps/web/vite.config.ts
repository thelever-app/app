import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { licenceNotices } from './licence-notices.ts';

export default defineConfig({
  plugins: [react(), licenceNotices()],
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./test/animation-event.ts', './test/setup.ts'],
  },
});
