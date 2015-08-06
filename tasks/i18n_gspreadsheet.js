/*
 * grunt-i18n-gspreadsheet
 * https://github.com/theoephraim/grunt-i18n-gspreadsheet
 *
 * Copyright (c) 2013 Theo Ephraim
 * Licensed under the MIT license.
 */

'use strict';

var GoogleSpreadsheet = require("google-spreadsheet");
var Step = require('step');
var _ = require('underscore');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var through = require('through2');
var gutil = require('gulp-util');
var File = gutil.File;

function sortObjectByKeys(map) {
    var keys = _.sortBy(_.keys(map), function (a) {
        return a.toLowerCase();
    });
    var newmap = {};
    _.each(keys, function (k) {
        newmap[k] = map[k];
    });
    return newmap;
}

function loadfiles(_options, scope, done) {
    // default options
    var options = _.extend({}, {
        output_dir: 'locales',
        ext: '.js',
        default_locale: 'en',
        use_default_on_missing: false,
        write_default_translations: false,
        sort_keys: true
    }, _options);

    var regex_filter;
    if (!!options.regex_filter) {
        regex_filter = new RegExp(options.regex_filter);
    }

    var locales = [];
    var translations = {};
    var gsheet = new GoogleSpreadsheet(options.document_key);
    var output_dir = path.resolve(process.cwd() + '/' + options.output_dir);

    Step(
        function setAuth() {
            gsheet.useServiceAccountAuth(options, this);
        },
        function fetchSheetInfo(err) {
            if (err) {
                gutil.log('Invalid google credentials');
                return done(false);
            }

            gsheet.getRows(1, this);
        },
        function buildTranslationJson(err, rows) {
            if (err) {
                gutil.log(err);
                return done(false);
            }
            if (rows.length === 0) {
                gutil.log('ERROR: no translations found in sheet');
                return done(false);
            }

            // First determine which locales are supported
            var gsheet_keys = _(rows[0]).keys();
            _(gsheet_keys).each(function (locale) {
                if (locale != 'id' && locale.length == 2) {
                    locales.push(locale);
                    translations[locale] = {};
                    if (regex_filter) {
                        try {
                            translations[locale] = JSON.parse(fs.readFileSync(output_dir + '/' + locale + options.ext));
                        }
                        catch (e) {
                        }
                    }
                }
            });

            gutil.log('Found ', gutil.colors.cyan(rows.length.toString()), ' translations in ', gutil.colors.cyan(locales.length.toString()), ' languages');

            // read all translations into an object with the correct keys
            _(rows).each(function (row) {
                // if an key override column is set, check that first, then use the default locale

                var use_key_override = options.key_column && row[options.key_column];
                var translation_key = use_key_override ? row[options.key_column] : row[options.default_locale];
                if (!translation_key) return;
                if (regex_filter && !regex_filter.test(translation_key)) return;
                _(locales).each(function (locale) {

                    if (locale == options.default_locale) {
                        if (use_key_override || options.write_default_translations) {
                            translations[locale][translation_key] = row[locale];
                        }
                    } else if (row[locale]) {
                        translations[locale][translation_key] = row[locale];
                    } else if (options.use_default_on_missing) {
                        translations[locale][translation_key] = row[options.default_locale];
                    }
                });
            });
            this();
        },
        function ensureDirectoryExists(err) {
            if (err) {
                gutil.log(err);
                return done(false);
            }

            mkdirp(output_dir, this);
        },
        function writeLocaleFiles(err) {
            if (err) {
                gutil.log(err);
                return done(false);
            }

            var step = this;
            _(locales).each(function (locale) {
                var file;
                var file_path = output_dir + '/' + locale + options.ext;

                if (options.sort_keys) {
                    translations[locale] = sortObjectByKeys(translations[locale]);
                }

                file = new File(file_path);
                file.path = file_path;
                file.contents = new Buffer(JSON.stringify(translations[locale], null, ' '));
                scope.push(file);
            });
        },
        function finish(err) {
            if (err) {
                gutil.log(err);
                return done(false);
            }
            done();
        }
    );
}

module.exports = function (_options) {
    var firstcall = true;

    return through.obj(function (file, enc, cb) {
        this.push(file);

        if (firstcall) {
            loadfiles(_options, this, cb);
        }
    });
};
