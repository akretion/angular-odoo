'use strict';

var gulp = require('gulp');

var paths = gulp.paths;

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

gulp.task('build-lib', [], function () {
 return gulp.src([
     paths.src + '/app/app.js',
     paths.src + '/components/**/*.js'
   ])
     .pipe($.ignore.exclude('*.spec.js'))
     .pipe($.ngAnnotate())
     .pipe($.concat('odoo.js'))
     .pipe(gulp.dest(paths.dist + '/'))
     .pipe($.size({ title: paths.dist + '/', showFiles: true }));
});

gulp.task('build-lib-min', [], function () {
 return gulp.src([
     paths.src + '/app/app.js',
     paths.src + '/components/**/*.js'
   ])
     .pipe($.ignore.exclude('*.spec.js'))
     .pipe($.ngAnnotate())
     .pipe($.uglify({preserveComments:$.uglifySaveLicense}))
     .pipe($.concat('odoo.min.js'))
     .pipe(gulp.dest(paths.dist + '/'))
     .pipe($.size({ title: paths.dist + '/', showFiles: true }));
});

gulp.task('clean', function (done) {
  $.del([paths.dist + '/', paths.tmp + '/'], done);
});

gulp.task('build', ['build-lib', 'build-lib-min']);
