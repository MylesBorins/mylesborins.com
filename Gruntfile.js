const sass = require('node-sass');
var _ = require('lodash');

module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    pages: {
      posts: {
        src: 'content',
        dest: 'public_html',
        layout: 'src/layouts/post.jade',
        url: ':type/:title/',
        options: {
          pageSrc: 'src/pages',
          data: {
            baseUrl: '/'
          },
          markedOptions: function (marked) {
            // This is the default image renderer
            // Just thought it would be good to have for reference
            // inacse I decide to modify it
            var renderer = _.extend(new marked.Renderer(), {
              image: function (href, title, text) {
                var out = '<img src="' + href + '" alt="' + text + '"';
                if (title) {
                  out += ' title="' + title + '"';
                }
                out += '>';
                return out;
              },
              heading: function (text, level) {
                var numbers = ['oops', 'one', 'two', 'three', 'four', 'five', 'six'];
                if (level === 1) {
                  return '<hr class="top-top-one"><hr class="top-one"><h1>' + text + '</h1><hr class="bottom-one"><hr class="bottom-bottom-one">';
                }
                return '<hr class="top-' + numbers[level] + '"><h' + level + '>' + text + '</h' + level + '><hr class="bottom-' + numbers[level] + '">';
              }
            });
            var options = {
              renderer: renderer
            };
            return options;
          },
          pagination: {
            postsPerPage: 1,
            listPage: 'src/pages/index.jade',
            getPostGroups: function (postCollection, pagination) {
              var postsPerPage = pagination.postsPerPage;
              var postGroups   = [];
              var i            = 0;
              var postGroup;
              
              postCollection.forEach(function (post) {
                if (post.type === 'blog') {
                  postGroups.push({
                    id: i,
                    posts: [post]
                  });
                  i++;
                }
              });

              return postGroups;
            }
          }
        }
      }
    },
    sass: {
      options: {
        implementation: sass
      },
      dist: {
        files: [{
          expand: true,
          cwd: 'src/styles',
          src: ['*.scss'],
          dest: './public_html/styles',
          ext: '.css'
        }]
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          dest: 'public_html',
          src: [
            '.well-known/**',
            'examples/**',
            'images/**',
            'scripts/**',
            'styles/**.css',
            'styles/fonts/**',
            'files/**'
          ]
        }]
      }
    },
    watch: {
      pages: {
        files: [
          'content/**/**',
          'src/layouts/**',
          'src/pages/**'
        ],
        tasks: ['pages']
      },
      sass: {
        files: ['src/styles/**'],
        tasks: ['sass']
      },
      copy: {
        files: [
          'src/images/**',
          'src/scripts/**',
          'src/styles/**.css',
          'src/styles/fonts/**',
          'src/files/**'
          
        ],
        tasks: ['copy']
      },
      dist: {
        files: ['public_html/**'],
        options: {
          livereload: true
        }
      }
    },
    connect: {
      dist: {
        options: {
          port: 5455,
          hostname: '0.0.0.0',
          base: 'public_html',
          livereload: true
        }
      }
    },
    clean: {
      dist: 'public_html'
    }
  });

  grunt.registerTask('build', [
    'clean',
    'pages',
    'sass',
    'copy'
  ]);

  grunt.registerTask('server', [
    'build',
    'connect',
    'watch'
  ]);

  grunt.registerTask('default', 'server');

  require('load-grunt-tasks')(grunt);
};
