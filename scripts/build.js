const path = require('path');
const { build } = require('esbuild');

const formats = {
  'cjs': 'index.js',
  'esm': 'index.esm.js',
  'iife': 'index.iife.js'
}
Object.keys(formats).forEach(format => {
  const fileName = formats[format];
  build({
    format,
    globalName: 'Future',
    entryPoints: [path.resolve(__dirname, '../src/index.ts')],
    outfile: path.resolve(__dirname, '../dist/', fileName),
    bundle: true,
    minify: true,
    sourcemap: true,
    loader: {
      '.ts': 'ts'
    },
    tsconfig: path.resolve(__dirname, '../tsconfig.json')
  }).then(() => {
    console.info(`— ${fileName} build success`);
  }).catch((e) => {
    console.info(`🚨 ${fileName} build error:`);
    console.error(e);
  })
});

