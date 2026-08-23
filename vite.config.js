/* vitest/config re-exports Vite's defineConfig with the `test` key added.
   Importing it from 'vite' type-checks the build but rejects `test`. */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Two build targets, because the reader has two lives.
 *
 *   npm run build          → dist/, ordinary bundle, assets beside it.
 *                            This is what goes to itch: the art and the
 *                            519 audio clips stay as files so a browser
 *                            fetches the handful it needs.
 *
 *   SINGLE=1 npm run build → one self-contained index.html, which is
 *                            what a teacher can put on a memory stick.
 *
 * Relative base in both cases: itch serves the game from a nested path
 * and absolute URLs break there.
 */
const single = process.env.SINGLE === '1';

export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: {
    target: 'es2019',
    assetsInlineLimit: single ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    /* globals:true is what gives Testing Library its automatic cleanup
       between tests. Without it every render stacks up in the same
       document and queries start finding three copies of the same
       button — which looks like a component bug and is not one. */
    globals: true,
    setupFiles: ['src/setupTests.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
});
