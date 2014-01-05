module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    pages: {
      posts: {
        src: 'content',
        dest: 'dist',
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
          cssDir: 'dist/styles'
        }
      }
    },
    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          dest: 'dist',
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
        files: ['dist/**'],
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
          base: 'dist',
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
      dist: 'dist'
    },
    'sftp-deploy': {
      build: {
        auth: {
          host: 'thealphanerd.io',
          port: 22,
          authKey: 'privateKey'
        },
        src: 'dist',
        dest: '../thealphanerd.io/public_html',
        simple: true,
        exclusions: ['**.DS_Store']
      }
    }
  });

  grunt.registerTask('build', [
    'clean',
    'pages',
    'compass',
    'copy'
  ]);

  grunt.registerTask('deploy', ['build', 'sftp-deploy']);

  grunt.registerTask('server', [
    'build',
    'connect',
    'open',
    'watch'
  ]);

  grunt.registerTask('default', 'server');

  require('load-grunt-tasks')(grunt);
};
