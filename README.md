# xac-esbuild

A package for building modern JS for distribution.


## Package a directory of js files and concatenate into one output file
```
node ./node_modules/xac-esbuild/index.js -o=public/js/ -s=components/custom/js/addons/plugins/ -outfile=public/js/main-plugins.js -banner=package.json -log=1
```

## Package a directory of js and jsx files maintaining directory structure
```
node ./node_modules/xac-esbuild/index.js -s=src/lib/ -o=dist/ -banner=package.json -log=1 -format=cjs -t='**/*.{js,jsx,eot,css,svg,woff,woff2,ttf,otf}'
```