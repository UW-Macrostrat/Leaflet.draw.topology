module.exports = function(grunt) {

    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            build: {
                files: {
                    'dist/js/leaflet.draw.topology.js': 'src/js/leaflet.draw.topology.js'
                }
            }
        },

        cssmin: {
          combine: {
            files: {
              'dist/css/leaflet.draw.topology.css': ['src/css/leaflet.draw.topology.css']
            }
          }
        },

        watch: {
            js: {
                files: ['src/js/leaflet.draw.topology.js'],
                tasks: ['uglify']
            },
            css: {
                files: ['src/css/leaflet.draw.topology.css'],
                tasks: ['cssmin']
            }
        }
    });

    grunt.registerTask('default', ['uglify', 'cssmin']);

};