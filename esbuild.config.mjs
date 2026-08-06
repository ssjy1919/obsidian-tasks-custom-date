import esbuild from 'esbuild';

const production = process.argv[2] === 'production';
const external = [
    'obsidian',
    'electron',
    'codemirror',
    '@codemirror/autocomplete',
    '@codemirror/closebrackets',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/fold',
    '@codemirror/gutter',
    '@codemirror/history',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/rangeset',
    '@codemirror/rectangular-selection',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/stream-parser',
    '@codemirror/text',
    '@codemirror/view',
];

esbuild
  .build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external,
    format: 'cjs',
    target: 'es2018',
    outfile: 'main.js',
    sourcemap: production ? false : 'inline',
    minify: production,
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
