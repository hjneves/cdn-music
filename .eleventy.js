const fs = require('fs');
const path = require('path');

const htmlmin = require('html-minifier');
const dateFns = require('date-fns');
const ptLocale = require('date-fns/locale/pt');
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
      ptLocale,
    },
  });

  eleventyConfig.setBrowserSyncConfig({
    files: './_site/assets/styles/main.css',
  });

  // Auto-discover choir folders and create collections for each type (concerts, rehearsals, etc.)
  const choirs = fs
    .readdirSync('src/posts')
    .filter((f) => fs.statSync(path.join('src/posts', f)).isDirectory());

  choirs.forEach((choir) => {
    const choirPath = path.join('src/posts', choir);
    const types = fs
      .readdirSync(choirPath)
      .filter((f) => fs.statSync(path.join(choirPath, f)).isDirectory());

    // If subfolder structure exists (concerts, rehearsals, etc.), create collections for each type
    if (types.length > 0) {
      types.forEach((type) => {
        eleventyConfig.addCollection(`posts_${choir}_${type}`, (api) =>
          api.getFilteredByGlob(`src/posts/${choir}/${type}/**/*.md`)
        );
      });
    } else {
      // Fallback for flat structures without subfolders
      eleventyConfig.addCollection(`posts_${choir}`, (api) =>
        api.getFilteredByGlob(`src/posts/${choir}/**/*.md`)
      );
    }
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
