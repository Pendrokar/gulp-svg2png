# gulp-svg2png [![Build Status](https://travis-ci.org/akoenig/gulp-svg2png.png?branch=master)](https://travis-ci.org/akoenig/gulp-svg2png)

> A gulp plugin for converting SVGs to multiple PNGs.


## Usage

First, install `gulp-svg2pngvariants` as a development dependency:

```shell
npm install --save-dev gulp-svg2pngvariants
```

Then, add it to your `gulpfile.js`:

```javascript
var svg2png = require('gulp-svg2pngvariants');

gulp.task('svg2png', function () {
    gulp.src('./specs/assets/**/*.svg')
        .pipe(svg2png())
        .pipe(gulp.dest('./build'));
});
```

## Arguments

### svg2png([options])

`options`

```javascript
var defaultOptions = {
  verbose: true,
  maxConcurrency : 8,   /* Limit in order to prevent using too many file handles */
  variants : [

  // Web 
  { width: 32, name : function (n) { return path.join('icons', 'web', n + "_32x32");}},
  { width: 64, name : function (n) { return path.join('icons', 'web', n + "_64x64");}}
  ...
}
```

Each variant can include a `width` and a `height` and a function `name` that maps source names to the path where the converted PNG file should be stored (the .png extension) will be added automatically.

## Changelog

See [HISTORY.md](https://github.com/ianmercer/gulp-svg2png/blob/master/HISTORY.md)

## Author

Original version copyright 2014, [André König](http://iam.andrekoenig.info) (andre.koenig@posteo.de)
This version copyright 2014, [Ian Mercer](http://blog.abodit.com) (ian@signswift.com)