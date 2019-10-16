# metalsmith-postcss2

[![npm package](https://img.shields.io/npm/v/metalsmith-postcss2.svg)][npm]
[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)][github-license]
![Supported Node.js version: >=8.3.0](https://img.shields.io/static/v1?label=node&message=%3E%3D8.3.0&color=brightgreen)
![Supported Metalsmith version: ^2.2.0](https://img.shields.io/static/v1?label=metalsmith&message=%5E2.2.0&color=blue)
![Supported PostCSS version: ^5.2.18 || ^6.0.13 || 7.x](https://img.shields.io/static/v1?label=postcss&message=%5E5.2.18%20%7C%7C%20%5E6.0.13%20%7C%7C%207.x&color=blue)
![Type Definitions: TypeScript](https://img.shields.io/static/v1?label=types&message=TypeScript&color=blue)
[![bundle size](https://badgen.net/bundlephobia/min/metalsmith-postcss2@1.0.0)](https://bundlephobia.com/result?p=metalsmith-postcss2@1.0.0)
[![Dependencies Status](https://david-dm.org/sounisi5011/metalsmith-postcss2/status.svg)](https://david-dm.org/sounisi5011/metalsmith-postcss2)
[![Build Status](https://dev.azure.com/sounisi5011/metalsmith-postcss2/_apis/build/status/sounisi5011.metalsmith-postcss2?branchName=master)](https://dev.azure.com/sounisi5011/metalsmith-postcss2/_build/latest?definitionId=1&branchName=master)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/dd1dfc5d976b1bce125c/maintainability)](https://codeclimate.com/github/sounisi5011/metalsmith-postcss2/maintainability)

[npm]: https://www.npmjs.com/package/metalsmith-postcss2
[github-license]: https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/LICENSE

[Metalsmith] plugin for [PostCSS].

[Metalsmith]: https://github.com/segmentio/metalsmith
[PostCSS]: https://postcss.org

## Install

```sh
# This package does not include postcss. You need to install postcss.
npm install postcss

npm install metalsmith-postcss2
```

## CLI Usage

The simplest use is with a PostCSS configuration file.

### Use PostCSS configuration file

Install via npm and then add the `metalsmith-postcss2` key to your `metalsmith.json` plugin, like so:

[npm-postcss-load-config-used]: https://www.npmjs.com/package/postcss-load-config/v/2.1.0

**`metalsmith.json`**
```json
{
  "plugins": {
    "metalsmith-postcss2": true
  }
}
```

Then create a PostCSS configuration file.　It is a file with a name like `postcss.config.js` or `.postcssrc.*`.

**`postcss.config.js`**
```js
module.exports = {
  map: { inline: false },
  plugins: {
    'postcss-import': {},
    'postcss-preset-env': {},
    'cssnano': {}
  }
};
```

You can read more about common PostCSS Config [here][npm-postcss-load-config-used].

Normally you will create a PostCSS configuration file in the same directory as the `metalsmith.json` file.

```
Project (Root)
├── metalsmith.json
├── postcss.config.js    # <- PostCSS configuration file
└── src
    ├── main.css
    └── dir
        └── sub.css
```

However, it is also possible to place the PostCSS configuration file in a subdirectory.

```
Project (Root)
├── metalsmith.json
├── postcss.config.js    # <- PostCSS configuration file
└── src
    ├── main.css
    └── dir
        ├── .postcssrc.yml    # <- PostCSS configuration file in subdirectory
        └── sub.css
```

PostCSS configuration files are searched by tracing the parent directories where the CSS file to be processed is located.
In the above example, `sub.css` is converted using the settings defined in the closest `.postcssrc.yml` file.

```
Project (Root)
├── metalsmith.json
├── postcss.config.js    # <- [1] PostCSS configuration file
└── src
    ├── main.css         # Use configuration is [1]
    └── dir
        ├── .postcssrc.yml    # <- [2] PostCSS configuration file in subdirectory
        └── sub.css           # Use configuration is [2]
```

### Use with AltCSS

When converting AltCSS such as [SASS], [SCSS], [LESS], [Stylus] or [SugarSS], it is necessary to overwrite the file extension setting.
For [SugarSS], the file extension is `.sss`. Therefore, set as follows:

[SASS]: https://sass-lang.com
[SCSS]: https://sass-lang.com
[LESS]: http://lesscss.org
[Stylus]: http://stylus-lang.com/
[SugarSS]: https://github.com/postcss/sugarss

**`metalsmith.json`**
```json
{
  "plugins": {
    "metalsmith-postcss2": {
      "pattern": "**/*.sss"
    }
  }
}
```

**`postcss.config.js`**
```js
module.exports = {
  parser: 'sugarss',
  plugins: {
    // ...
  }
};
```

By default, all processed file extensions are renamed to `.css`.
If you want to stop renaming, set the `renamer` option to `false` or `null`.

**`metalsmith.json`**
```json
{
  "plugins": {
    "metalsmith-postcss2": {
      "pattern": "**/*.sss",
      "renamer": false
    }
  }
}
```

### Use Metalsmith plugin options

If you need to specify an options in `metalsmith.json`, set the options to the value of the `metalsmith-postcss2` key.

```json
{
  "plugins": {
    "metalsmith-postcss2": {
      "plugins": {
        "postcss-import": {},
        "postcss-preset-env": {},
        "cssnano": {}
      },
      "options": {
        "map": { "inline": false }
      }
    }
  }
}
```

However, **this is not recommended**.

Plugin options are parsed differently than the PostCSS configuration file. It is not fully compatible.
A prominent example of this difference is that it currently does not support the `parser` option specified as a string.

Use the PostCSS configuration file whenever possible.

## Javascript Usage

The simplest use is to omit the option. The settings in the PostCSS configuration file are used.

```js
const postcss = require('metalsmith-postcss2');

metalsmith
  .use(postcss());
```

If you need to specify an options, set the options value.

```js
const postcss = require('metalsmith-postcss2');

metalsmith
  .use(postcss({
    pattern: '**/*.sss',
  }));
```

If you want to use the `files` variable or the default options value, you can specify the callback function that generates the options.

```js
const postcss = require('metalsmith-postcss2');

metalsmith
  .use(postcss(
    (files, metalsmith, defaultOptions) => {
      return {
        pattern: [...defaultOptions.pattern, '!**/_*', '!**/_*/**'],
      };
    }
  ));
```

## TypeScript Usage

For compatibility with the [Metalsmith CLI], this package exports single function in CommonJS style.  
When using with TypeScript, it is better to use the [`import = require()` statement](https://www.typescriptlang.org/docs/handbook/modules.html#export--and-import--require).

```js
import postcss = require('metalsmith-postcss2');

metalsmith
  .use(postcss());
```

## Debug mode

This plugin supports debugging output.  
To enable, use the following command when running your build script:

```sh
DEBUG=metalsmith-postcss2,metalsmith-postcss2:* node my-website-build.js
```

For more details, please check the description of [debug v4.1.1][npm-debug-used].

[npm-debug-used]: https://www.npmjs.com/package/debug/v/4.1.1

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
npm install
npm test
```

## Contributing

see [CONTRIBUTING.md](https://github.com/sounisi5011/metalsmith-postcss2/blob/master/CONTRIBUTING.md)
