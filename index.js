/*
 * gulp-svg2png
 *
 * Copyright(c) 2014 André König <andre.koenig@posteo.de>
 * MIT Licensed
 *
 */

/**
 * @author André König <andre.koenig@posteo.de>
 *
 */

'use strict';

var PLUGIN_NAME  = 'gulp-svg2png';

var path         = require('path');
var os           = require('os');
var fs           = require('fs');
var gutil        = require('gulp-util');
var through      = require('through2');
var extend       = require('lodash.assign');
var execFile     = require("child_process").execFile;
var phantomjsCmd = require("phantomjs").path;
var converterFileName = path.resolve(__dirname, "./converter.js");


var defaultOptions = {
  verbose: true,
  maxConcurrency : 8,   /* Limit in order to prevent using too many file handles */
  variants : [

  // Web 
  { width: 32, name : function (n) { return path.join('icons', 'web', n + "_32x32");}},
  { width: 64, name : function (n) { return path.join('icons', 'web', n + "_64x64");}},

  // Android
  { width:36, name: function(n) { return path.join('icons', 'android', 'Resources', 'drawable-ldpi', n)}},
  { width:48, name: function(n) { return path.join('icons', 'android', 'Resources', 'drawable-mdpi', n)}},
  { width:72, name: function(n) { return path.join('icons', 'android', 'Resources', 'drawable-hdpi', n)}},
  { width:96, name: function(n) { return path.join('icons', 'android', 'Resources', 'drawable-xhdpi', n)}},
  { width:96, name: function(n) { return path.join('icons', 'android', 'Resources', 'drawable', n)}},

  // iOS
  { width: 29, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-small')}},
  { width: 58, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-small@2x')}},
  { width: 57, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-icon.png')}},
  { width:114, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-icon@2x')}},
  { width: 40, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-40@2x')}},
  { width: 80, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-40@2x')}},
  { width: 50, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-50')}},
  { width:100, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-50@2x')}},
  { width: 57, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-57')}},
  { width:114, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-57@2x')}},
  { width: 60, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-60')}},
  { width:120, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-60@2x')}},
  { width: 72, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-72')}},
  { width:144, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-72@2x')}},
  { width: 76, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-76')}},
  { width:152, name: function(n) { return path.join('icons', 'ios', 'Resources', n + '-76@2x')}},

  // Windows Phone
  { width: 48, name: function(n) { return path.join('icons', 'windows', 'Resources', n + '-48@2x')}},
  { width: 62, name: function(n) { return path.join('icons', 'windows', 'Resources', n + '-62-tile')}},
  { width:173, name: function(n) { return path.join('icons', 'windows', 'Resources', n + '-173-tile')}},

  ]
};


/**
 * gulp-svg2pngvariants plugin
 *
 * @param {number} options (optional) The options for each conversion.
 * @param {boolean} verbose (optional) Should the progress be logged?
 *
 */
module.exports = function (config) {

    var options = extend({}, defaultOptions, config || {});
    var variants = options.variants;
    var verbose = options.verbose || false;

    /**
     *
     * Parses a path into is separate components
     *
    */
      function parsePath(p) {
        var extname = path.extname(p);
        return {
          dirname: path.dirname(p),
          basename: path.basename(p, extname),
          extname: extname,
          sep: path.sep
        };
      }

    /**
     * Renames the SVG file to a PNG file (extension) with any variant transform
     *
     * @param {string} filename The file name of the SVG
     *
     * @return {string} The file name with the PNG file extension.
     *
     */
    function rename (filename, variant) {
        var parsed = parsePath(filename);

        var baseName = parsed.basename;
        var newName = typeof variant.name === 'function' ? 
            variant.name(baseName) : baseName;

        return newName + '.png';
    }

    /**
     * Just a global error function.
     *
     * @param {string} message The error message
     *
     */
    function error (message) {
        throw new gutil.PluginError(PLUGIN_NAME, message);
    }

    /**
     * Wrapper around gutil logger.
     * Logs if logging is enabled.
     *
     * @param {string} message The log message
     *
     */
    function log (message) {
        if (verbose) {
            gutil.log(message);
        }
    }

    /**
     * UUID generator
     *
     * @return {string} The generated UUID.
     *
     */
    function uuid () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (chr) {
            var rand = Math.random() * 16|0;
            var value = chr == 'x' ? rand : (rand&0x3|0x8);

            return value.toString(16);
        });
    }

    /**
     * Checks if the given file is a SVG.
     *
     * @param  {buffer} svg The SVG file object.
     *
     * @return {Boolean}
     *
     */
    function isSVG (data) {
        var i = 0,
            len = data.length,
            snippet;

        data = data.toString('hex');

        for (i; i < len; i = i + 1) {
            snippet = data.slice(i, i + 2).toString('hex');

            if ('73' === snippet) {
                i = i + 2;
                snippet = data.slice(i, i + 2).toString('hex');

                if ('76' === snippet) {
                    i = i + 2;
                    snippet = data.slice(i, i + 2).toString('hex');

                    if ('67' === snippet) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Converts the source SVG file to a PNG.
     *
     * @param  {gutil.File} source The source SVG
     * @param  {function} cb
     *
     */
    function convert (source, encoding, cb) {       // rename source to chunk >>
        var me = this;

        var queue = [];
        var count = 0;  // holds how many execs are running

        function done (png, err) {
            if (err) {
                return error(err);
            }

            log('Converted file: ' + png.path);
            me.push(png);

            // And now process next in queue if there are any
            count -= 1;
            if (queue.length > 0 && count < options.maxConcurrency) {  // get next item in the queue!
                count += 1;
                var src = queue.shift();
                log('Q->' + rename(src.path, src.variant));
                svgToPng(src.path, src.variant, converted);
            }
            if (count === 0)
              cb();
        }

        function buffered (temp, variant, err, data) {
            var png2 = new gutil.File({
                base: source.base,
                path: rename(source.path, variant),
                contents: data
            });

            //log('Temp is: ' + temp);

            // Cleanup - Delete the temp file.
            fs.unlink(temp, function(err) { done(png2, err); });
        }

        function converted (variant, temp, err) {
            if (err) {
                return error('Error while converting image.' + err);
            }

            fs.readFile(temp, null, function(err, data) { buffered(temp, variant, err, data); });
        }

//        if (!isSVG(source.contents)) {
//            return error('Source ' + source.path + ' is not a SVG file.');
//        }

        // Output each variant, but limit concurrency
        variants.forEach(function (variant) {
          if (count < options.maxConcurrency) {
            count += 1;
            log("A->" + rename(source.path, variant));
            svgToPng(source.path, variant, converted);
          } else {  // queue it up...
            queue.push({path:source.path, variant:variant});
          }
        });

        if (count === 0)
        {
            cb();  /* Finished output stream */
        }
    }


    function svgToPng(sourceFileName, variant, cb) {

        var tempFile = path.join(os.tmpdir(), uuid() + '.png');

        var args = [converterFileName, sourceFileName, tempFile, variant.width, variant.height];

        execFile(phantomjsCmd, args, function (err, stdout, stderr) {
            if (err) {
                cb(variant, tempFile, err);
            } else if (stdout.length > 0) { // PhantomJS always outputs to stdout.
                cb(variant, tempFile, new Error(stdout.toString().trim()));
            } else if (stderr.length > 0) { // But hey something else might get to stderr.
                cb(variant, tempFile, new Error(stderr.toString().trim()));
            } else {
                cb(variant, tempFile, null);
            }
        });
    }

    return through.obj(convert);
};