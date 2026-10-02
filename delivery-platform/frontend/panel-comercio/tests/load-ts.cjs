const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const cache = new Map();
module.exports = function loadTs(filename) {
  filename = path.resolve(__dirname, filename);
  if (filename.endsWith('.css')) return {};
  if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename, module);
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = name => name.startsWith('.') ? loadTs(path.resolve(path.dirname(filename), name))
    : name.startsWith('@delivery/tracking-web') ? loadTs(require.resolve(name, { paths: [path.dirname(filename)] }))
    : name.endsWith('.css') ? {} : nativeRequire(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return compiled.exports;
};
