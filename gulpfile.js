/**
 * Created by mbuils on 06/08/15.
 */

var gulp = require('gulp');
var i18n = require('./tasks/i18n_gspreadsheet');
var nodeInspector = require('gulp-node-debug');
var gulpfile;

gulpfile = {
    initialize: function () {
        gulp.task('i18n', this.i18n.bind(this));
        gulp.task('default', ['i18n']);

        return this;
    },

    i18n: function () {
        gulp.src(['ressources/*'])
            .pipe(i18n({
                document_key: '1Ov60-Kxt6Gf2ARdJNnT1_8nhlxCM51jDWbUQUwB0B_A',
                key_column: 'tokenkey',
                sort_keys: false,
                default_locale: 'en',
                output_dir: 'i18n',
                private_key_id: process.env.PRIVATE_KEY_ID,
                private_key: process.env.PRIVATE_KEY,
                client_email: process.env.CLIENT_EMAIL,
                client_id: process.env.CLIENT_ID,
                type: 'service_account',
                ext: '.json'
            }))
            .pipe(gulp.dest('build/'));
    }
};

Object.create(gulpfile).initialize();