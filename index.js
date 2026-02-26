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
const _config = {
  s: 'src/',
  o: 'dist/',
  t: '**/*.js',
  banner: null,
  base: process.cwd()
}

function log(msg) {
  if (_config.log) {
    console.log(`${colors.magenta}xac-esbuild`, msg)
  }
}

// Handle cli params
let kv, key
log('Handling cli params')
for (const a of args) {
  kv = a.split('=')
  key = kv[0].replace('-', '')
 
  if (key === 'copyFiles') {
    _config[key] = kv[1].split(',')
  } else if (key === 't') {
    _config[key] = kv[1]
  } else {
     _config[key] = _config.base + '/' + kv[1]
  }
  log(_config[key])
}

const entryPoints = glob.sync(_config.s + _config.t);
const tempOutputFile = _config.outfile + '.js';



function initTranspiling() {
  if (_config.banner) {
    log(`Configuring ${_config.banner}`)
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
  log(`Successfully merged files into ${outputFilePath}`);

  initTranspiling();
}

/**
 * Calls esbuild method to transpile scripts
 * @param {object} banner 
 */
function transpileWithEsbuild(banner) {
  log('Begun transpiling ...')
  log(entryPoints)
  const sharedConfig = {
    entryPoints: _config.outfile ? [tempOutputFile] : entryPoints,
    //bundle: _config.outfile ? undefined : true,
    minifyWhitespace: true, // Remove whitespace
    minifySyntax: true,     // Shorten syntax
    minifyIdentifiers: false,
    banner,
    // Exclude dependencies from the bundle so consumers install them separately
    //external: Object.keys(dependencies || {}).concat(Object.keys(peerDependencies || {})),
  };

  /**
   * For copying a file to other location
   * @param {string} file 
   */
  function copyFile(file) {
    log(`Copying file ${file} to ${_config.o}`);
    fs.copyFile(`${_config.s}${file}`, `${_config.o}${file}`, (err) => {
      if (err) throw err;
    });
  }

  build({
    ...sharedConfig,
    loader: {
      '.ttf': 'copy',
      '.woff': 'copy',
      '.woff2': 'copy',
      '.otf': 'copy',
      '.eot': 'copy',
      '.svg': 'copy',
      '.css': 'copy'
    },
    format: 'esm',
    outdir: _config.outfile ? undefined : _config.o,
    outfile: _config.outfile
  }).then(() => {
    
    try {
      if (_config.copyFiles && Array.isArray(_config.copyFiles)) {
        const allFiles = fs.readdirSync(_config.s)
        const files = allFiles.filter((f) => _config.copyFiles.includes(path.extname(f)))
        files.map((f) => copyFile(f))
      }

      if (_config.outfile) {
        log('Cleaning up ...');
        fs.unlinkSync(tempOutputFile)
      }
    } catch(err) {}
    
    
  }).catch(() => process.exit(1));
}

// Main kick off
if (_config.outfile) {
  mergeFiles(entryPoints, tempOutputFile);
} else {
  initTranspiling();
}












