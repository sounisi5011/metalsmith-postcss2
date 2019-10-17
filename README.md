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

If you need to specify an PostCSS options in `metalsmith.json`, set the options to the value of the `metalsmith-postcss2` key.

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

[Metalsmith CLI]: https://github.com/segmentio/metalsmith#cli

```js
import postcss = require('metalsmith-postcss2');

metalsmith
  .use(postcss());
```

## Options

The default value for options are [defined](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L51-L61) like this:

```js
const path = require('path');

{
  pattern: ['**/*.css'],
  plugins: [],
  options: {},
  renamer: filename => {
    const newFilename = path.basename(filename, path.extname(filename)) + '.css';
    return path.join(path.dirname(filename), newFilename);
  },
  dependenciesKey: false,
}
```

### `pattern`

Specifies the Glob pattern that matches the file to be validated.  
Specify a glob expression string or an array of strings as the pattern.  
Pattern are verified using [multimatch v4.0.0][npm-multimatch-used].

[npm-multimatch-used]: https://www.npmjs.com/package/multimatch/v/4.0.0

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L52)):

```js
['**/*.css']
```

Type definition ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L26)):

```ts
string | string[]
```

### `plugins`

TODO

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L53)):

```js
[]
```

Type definition ([source line 27](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L27) / [source line 37 - 42](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L37-L42)):

```ts
// import postcss from 'postcss';
//
// type NestedReadonlyArray<T> = (T | NestedReadonlyArray<T>)[]
// type PluginsRecord = Record<string, unknown>;

NestedReadonlyArray<postcss.AcceptedPlugin | string | PluginsRecord> | PluginsRecord
```

### `options`

Specify options to pass to the [PostCSS Processor#process() method].
See the [PostCSS documentation for details on options][PostCSS ProcessOptions].

[PostCSS Processor#process() method]: http://api.postcss.org/Processor.html#process
[PostCSS ProcessOptions]: http://api.postcss.org/global.html#processOptions

The "from" option and the "to" option cannot be specified because the plugin automatically sets them internally.
If set, an exception will be thrown.

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L54)):

```js
{}
```

Type definition ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L28)):

```ts
// import postcss from 'postcss';

Omit<postcss.ProcessOptions, 'from' | 'to'>
```

### `renamer`

Specify a function to rename of processed CSS files.

If you specify a [falsy value] other than `undefined`, such as `null` or `false`, processed files will not be renamed.
If `undefined` or a [truthy value] other than function is specified, use the default renamer.

[falsy value]: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
[truthy value]: https://developer.mozilla.org/en-US/docs/Glossary/Truthy

By default, a function that replaces file extension with `.css` is setted.

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L55-L59)):

```js
const path = require('path');

filename => {
  const newFilename = path.basename(filename, path.extname(filename)) + '.css';
  return path.join(path.dirname(filename), newFilename);
}
```

Type definition ([source line 29](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L29) / [source line 43](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L43)):

```ts
(filename: string) => string | true | false | null
```

### `dependenciesKey`

TODO

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L60)):

```js
false
```

Type definition ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v1.0.0/src/options.ts#L30)):

```ts
string | false | null
```

### PostCSS Plugin array

TODO

## [PostCSS Config][npm-postcss-load-config-used] Context

For more advanced usage it's recommend to to use a function in `postcss.config.js`, this gives you access to the CLI context to dynamically apply options and plugins **per file**

| Name          | Type                                                                                                                   | Description            | Default                                      |
| :-----------: | :--------------------------------------------------------------------------------------------------------------------: | :--------------------- | :------------------------------------------: |
| `cwd`         | `string`                                                                                                               | `process.cwd()`        | `process.cwd()`                              |
| `env`         | `string`                                                                                                               | `process.env.NODE_ENV` | `'development'`                              |
| `options`     | [`postcss.ProcessOptions`][PostCSS ProcessOptions]                                                                     | PostCSS Options        | `from, to, parser, stringifier, syntax, map` |
| `file`        | `{dirname: string, basename: string, extname: string}`                                                                 | Source File Data       | `dirname, basename, extname`                 |
| `pluginsList` | `(`[`Plugin`][postcss.Plugin]` | `[`pluginFunction`][postcss.pluginFunction]` | `[`Processor`][postcss.Processor]`)[]` | PostCSS Plugins Array  | `[]`                                         |
| `metalsmith`  | [`Metalsmith`]                                                                                                         | `Metalsmith` instance  | `Metalsmith(...)`                            |

[postcss.Plugin]: http://api.postcss.org/global.html#Plugin
[postcss.pluginFunction]: http://api.postcss.org/global.html#pluginFunction
[postcss.Processor]: http://api.postcss.org/Processor.html

**postcss.config.js**

```js
module.exports = ctx => ({
  map: ctx.options.map,
  parser: ctx.file.extname === '.sss' ? 'sugarss' : false,
  plugins: {
    'postcss-import': { root: ctx.file.dirname },
    cssnano: ctx.env === 'production' ? {} : false
  }
})
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
