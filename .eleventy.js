const fs = require('fs');
const path = require('path');

const htmlmin = require('html-minifier');
const dateFns = require('date-fns');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  // Passthrough copy for assets
  eleventyConfig.addPassthroughCopy('src/assets/music');
  eleventyConfig.addPassthroughCopy('src/assets/images');

  eleventyConfig.setEjsOptions({
    rmWhitespace: true,
    context: {
      dateFns,
    },
  });

  eleventyConfig.setBrowserSyncConfig({
    files: './_site/assets/styles/main.css',
  });

  // Auto-discover choir folders and create a collection for each
  const choirs = fs
    .readdirSync('src/posts')
    .filter((f) => fs.statSync(path.join('src/posts', f)).isDirectory());

  choirs.forEach((choir) => {
    eleventyConfig.addCollection(`posts_${choir}`, (api) =>
      api.getFilteredByGlob(`src/posts/${choir}/**/*.md`)
    );
  });

  eleventyConfig.addTransform('htmlmin', (content, outputPath) => {
    if (outputPath.endsWith('.html')) {
      const minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: true,
      });
      return minified;
    }

    return content;
  });

  return {
    dir: { input: 'src', output: '_site', data: '_data' },
  };
};
