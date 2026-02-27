const fs = require('node:fs')
const { build } = require('esbuild');
const { dependencies, peerDependencies } = require('./package.json');
const glob = require('glob');
const path = require('path');

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

const args = process.argv.slice(2);
/***
 * s (path of src)
 * o (path of output directory)
 * outfile (path and name of outfile)
 * t (file types to transpile) 
 */
const _config = {
  s: 'src/',
  o: 'dist/',
  t: '**/*.js',
  banner: null,
  excludeExternal: false,
  base: process.cwd()
}

const _esbuildOptions = {
  minifyWhitespace: true,
  minifySyntax: true,
  splitting: false,
  bundle: false,
}


function log(msg) {
  if (_config.log) {
    console.log(`${colors.magenta}xac-esbuild${colors.reset}`, msg)
  }
}

function logKeyVal(k, v) {
  log(`${colors.blue}${k} ${colors.green}${v}`)
}

const comprises = (arr, needle) => {
    return arr.some((i) => i?.toLowerCase() === needle.toLowerCase())
}

const bool = (v) => v === '1' ? true : false 

// Handle cli params
try {
  let kv, key
  for (const a of args) {
    kv = a.split('=')
    key = kv[0].replace('-', '')
  
    if (comprises(['copyFiles', 'target'], key)) {
      _config[key] = kv[1].split(',')
    } else if (comprises(['s', 'o', 'banner'], key)) {
      _config[key] = _config.base + '/' + kv[1]
    } else if (comprises(['minifySyntax', 'minifyWhitespace', 'splitting', 'bundle'], key)) {
      _esbuildOptions[key] = bool(kv[1])
    } else if (comprises(['excludeExternal'], key)) {
      _config[key] = bool(kv[1])
    } else if (comprises(['loader'], key)) {
      _config[key] = JSON.parse(kv[1])
    } else {
      _config[key] = kv[1]
    }
    logKeyVal(`${key}:`,`${_config[key]}`)
  }
} catch(err) {
  console.log(err)
}

const entryPoints = glob.sync(_config.s + _config.t);
const tempOutputFile = _config.outfile + '.js';

function initTranspiling() {
  if (_config.banner) {
    logKeyVal('Configuring', `${_config.banner}`)
    fs.readFile(_config.banner, function (err, data) {
      if (err) {
        log(err)
        return
      }
      const pkg = JSON.parse(data);
      let bannerContent = `/** ${(new Date()).toLocaleString()} | ${pkg.description} ${pkg.version} | ${pkg.repository.url} **/`
      transpileWithEsbuild({
        js: bannerContent,
        css: bannerContent,
      })
    });
  } else {
    transpileWithEsbuild()
  }
}

/**
 * Concatenate files into one
 * @param {array} filePathsArray 
 * @param {string} outputFilePath 
 */
function mergeFiles(filePathsArray, outputFilePath) {
  let combinedContent = '';

  filePathsArray.forEach(file => {
    // Read file content and append with a newline for separation if desired
    combinedContent += fs.readFileSync(file, 'utf-8') + '\n';
  });

  fs.writeFileSync(outputFilePath, combinedContent);
  logKeyVal('Successfully merged files into ',`${outputFilePath}`)
  initTranspiling();
}

/**
 * Calls esbuild method to transpile scripts
 * @param {object} banner 
 */
function transpileWithEsbuild(banner) {
  log('Now transpiling ...')
  log(entryPoints)

  build({
    ..._esbuildOptions,
    entryPoints: _config.outfile ? [tempOutputFile] : entryPoints,
    banner,
    target: _config.target,
    // Exclude dependencies from the bundle so consumers install them separately
    external: _config.excludeExternal ? Object.keys(dependencies || {}).concat(Object.keys(peerDependencies || {})) : undefined,
    minifyIdentifiers: false,
    loader: _config.loader || {
      '.ttf': 'copy',
      '.woff': 'copy',
      '.woff2': 'copy',
      '.otf': 'copy',
      '.eot': 'copy',
      '.svg': 'copy',
      '.css': 'copy',
      '.html': 'copy',
      '.jsx': 'jsx',
      '.js': _config.loaderJs || 'jsx',
    },
    format: _config.format || 'esm',
    outdir: _config.outfile ? undefined : _config.o,
    outfile: _config.outfile
  }).then(() => {
    
    try {
      if (_config.outfile) {
        log('Cleaning up ...');
        fs.unlinkSync(tempOutputFile)
      }
    } catch(err) {}
    
    
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  });
}

// Main kick off
if (_config.outfile) {
  mergeFiles(entryPoints, tempOutputFile);
} else {
  initTranspiling();
}












