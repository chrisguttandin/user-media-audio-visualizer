const documentConfig = require('../htmlhint/document');

// eslint-disable-next-line padding-line-between-statements
const convertConfig = (config) =>
    Object.entries(config)
        .map(([key, value]) => (typeof value === 'string' ? `${key}=${value}` : key))
        .join(',');

module.exports = (grunt) => {
    const fix = grunt.option('fix') === true;

    return {
        'build-development': {
            cmd: 'postcss src/**/*.css --base src/ --config config/postcss/build-development/ --dir build/'
        },
        'build-production': {
            cmd: 'postcss src/**/*.css --base src/ --config config/postcss/build-production/ --dir build/'
        },
        'hyperlink': {
            cmd: 'hyperlink https://chrisguttandin.github.io/user-media-audio-visualizer'
        },
        'lint-config': {
            cmd: `eslint --config config/eslint/config.json --ext .js ${fix ? '--fix ' : ''}--report-unused-disable-directives *.js config/`
        },
        'lint-src': {
            cmd: `eslint --config config/eslint/src.json --ext .js ${fix ? '--fix ' : ''}--report-unused-disable-directives src/ && \\
                htmlhint --rules ${convertConfig(documentConfig)} 'src/**/index.html' && \\
                postcss src/**/*.css --config config/postcss/lint/ > /dev/null`
        }
    };
};
