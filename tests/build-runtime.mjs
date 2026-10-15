import { build } from 'esbuild';
await build({ stdin: { contents: `export * from './src/app/auth/session'; export * from './src/app/auth/authenticatedFetch'; export * from './src/app/components/fridge/expiry';`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', outfile: 'tests/runtime.mjs', define: { 'import.meta.env.DEV': 'false' } });
