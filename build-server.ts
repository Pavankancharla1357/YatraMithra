import * as esbuild from 'esbuild';
import path from 'path';

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: 'dist/server.cjs',
      external: [
        'express',
        'vite',
        'path',
        'url',
        'cors',
        'cookie-parser',
        'dotenv',
        'firebase-admin',
        'fs'
      ],
    });
    console.log('Server build completed successfully!');
  } catch (error) {
    console.error('Server build failed:', error);
    process.exit(1);
  }
}

build();
