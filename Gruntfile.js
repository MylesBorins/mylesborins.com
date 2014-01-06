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
    compass: {
      dist: {
        options: {
          sassDir: 'src/styles',
          cssDir: 'public_html/styles'
        }
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          dest: 'public_html',
          src: [
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
      compass: {
        files: ['src/styles/**'],
        tasks: ['compass']
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
    open: {
      dist: {
        path: 'http://localhost:5455'
      }
    },
    clean: {
      dist: 'public_html'
    }
  });

  grunt.registerTask('build', [
    'clean',
    'pages',
    'compass',
    'copy'
  ]);

  grunt.registerTask('server', [
    'build',
    'connect',
    'open',
    'watch'
  ]);

  grunt.registerTask('default', 'server');

  require('load-grunt-tasks')(grunt);
};
