import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist/index.js',
  external: [], // 外部化する依存関係があれば指定
}).catch(() => process.exit(1));