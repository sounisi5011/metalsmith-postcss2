# metalsmith-postcss2

[![Go to the latest release page on npm](https://img.shields.io/npm/v/metalsmith-postcss2.svg)][npm]
[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)][github-license]
![Supported Node.js version: ^8.3.0 || 10.x || >=12.x](https://img.shields.io/static/v1?label=node&message=%5E8.3.0%20%7C%7C%2010.x%20%7C%7C%20%3E%3D12.x&color=brightgreen)
![Supported Metalsmith version: ^2.2.0](https://img.shields.io/static/v1?label=metalsmith&message=%5E2.2.0&color=blue)
![Supported PostCSS version: ^7.0.8](https://img.shields.io/static/v1?label=postcss&message=%5E7.0.8&color=blue)
![Type Definitions: TypeScript](https://img.shields.io/static/v1?label=types&message=TypeScript&color=blue)
[![Minified Bundle Size Details](https://img.shields.io/bundlephobia/min/metalsmith-postcss2/2.0.0)](https://bundlephobia.com/result?p=metalsmith-postcss2@2.0.0)
[![Install Size Details](https://packagephobia.now.sh/badge?p=metalsmith-postcss2@2.0.0)](https://packagephobia.now.sh/result?p=metalsmith-postcss2@2.0.0)
[![Dependencies Status](https://david-dm.org/sounisi5011/metalsmith-postcss2/status.svg)](https://david-dm.org/sounisi5011/metalsmith-postcss2)
[![Build Status](https://dev.azure.com/sounisi5011/metalsmith-postcss2/_apis/build/status/sounisi5011.metalsmith-postcss2?branchName=master)](https://dev.azure.com/sounisi5011/metalsmith-postcss2/_build/latest?definitionId=1&branchName=master)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/dd1dfc5d976b1bce125c/maintainability)](https://codeclimate.com/github/sounisi5011/metalsmith-postcss2/maintainability)

[npm]: https://www.npmjs.com/package/metalsmith-postcss2
[github-license]: https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/LICENSE

[Metalsmith] plugin for [PostCSS].

[Metalsmith]: https://github.com/segmentio/metalsmith
[PostCSS]: https://postcss.org

## Features

*   Supports the latest PostCSS

    Supported and tested version: [![ ^7.0.8](https://img.shields.io/static/v1?label=postcss&message=%5E7.0.8&color=blue)](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/package.json#L160).

*   Loading [PostCSS config file][npm-postcss-load-config-used]

    Use [postcss-load-config][npm-postcss-load-config-used] to load the PostCSS configuration.

*   Automatic rename

    By default, all file extensions are converted to `.css`.
    See description of [`renamer` option](#renamer).

*   Multi-level SourceMap

    Supports SourceMap joins processed in the previous processing step.
    If you want to omit the previous SourceMap, set [the PostCSS `map.prev` option](https://github.com/postcss/postcss/blob/master/docs/source-maps.md#options) to `false`.

*   Customizable SourceMap location

    **In the PostCSS configuration file**, specify the SourceMap filepath in the [PostCSS `map.annotation` option](https://github.com/postcss/postcss/blob/master/docs/source-maps.md#options).

*   Reading dependencies

    Subsequent Metalsmith plugins can read the metadata of the imported file during the conversion.
    See description of [`dependenciesKey` option](#dependencieskey).

*   Available in [TypeScript](https://www.typescriptlang.org/)

    Type definition is included.

*   Compliant with [PostCSS Runner Guidelines](https://github.com/postcss/postcss/blob/7.0.18/docs/guidelines/runner.md)

[npm-postcss-load-config-used]: https://www.npmjs.com/package/postcss-load-config/v/2.1.0

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

**`metalsmith.json`**
```json
{
  "plugins": {
    "metalsmith-postcss2": true
  }
}
```

Then create a PostCSS configuration file.
It is a file with a name like `postcss.config.js` or `.postcssrc.*`.

**`postcss.config.js`** or **`.postcssrc.js`**
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

or

**`.postcssrc.yaml`** or **`.postcssrc.yml`**
```yaml
map:
  inline: false
plugins:
  postcss-import: {}
  postcss-preset-env: {}
  cssnano: {}
```

or

**`.postcssrc.json`**
```json
{
  "map": {
    "inline": false
  },
  "plugins": {
    "postcss-import": {},
    "postcss-preset-env": {},
    "cssnano": {}
  }
}
```

Or you can include the PostCSS configuration in the `package.json` file

**`package.json`**
```json
{
  ...

  "postcss": {
    "map": {
      "inline": false
    },
    "plugins": {
      "postcss-import": {},
      "postcss-preset-env": {},
      "cssnano": {}
    }
  }
}
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
If you want to stop renaming, set [the `renamer` option](#renamer) to `false` or `null`.

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

```json5
{
  "plugins": {
    "metalsmith-postcss2": {
      "plugins": {
        "postcss-import": {},
        "postcss-preset-env": {},
        "cssnano": {}
      },
      "options": {
        "parser": "sugarss", // DO NOT WORK! Currently does not support string value
        "map": { "inline": false }
      }
    }
  }
}
```

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

The default value for options are [defined](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L55-L65) like this:

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

Only files that match this pattern will be processed.
Specify a glob expression string or an array of strings as the pattern.

Pattern are verified using [multimatch v4.0.0][npm-multimatch-used].

[npm-multimatch-used]: https://www.npmjs.com/package/multimatch/v/4.0.0

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L56)):

```js
['**/*.css']
```

Type definition ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L25)):

```ts
string | string[]
```

### `plugins`

Specifies an array of PostCSS plugins.
In addition to PostCSS plugins, you can also specify the following values:

*   An array of strings listed the plugin package names

    ```js
    [
      'postcss-import',     // equal to require('postcss-import')
      'postcss-preset-env', // equal to require('postcss-preset-env')
      'cssnano'             // equal to require('cssnano')
    ]
    ```

*   Object that has plugin package name as key and plugin options as value. Plugins with a value of `false` are excluded

    ```js
    {
      'postcss-import': {},               // equal to require('postcss-import') ; if value object has no properties, it is not used for options
      'postcss-preset-env': { stage: 0 }, // equal to require('postcss-preset-env')({ stage: 0 })
      'cssnano': 42,                      // equal to require('cssnano') ; if value is not an object, it is not used for options
      'postcss-pseudoelements': false     // if value is false, plugin will not be imported
    }
    ```

*   An array of the values described above. Arrays can recurse indefinitely

    ```js
    [
      'postcss-import',
      {
        'postcss-preset-env': { stage: 0 }
      },
      require('postcss-pseudoelements')(),
      [
        [
          'cssnano'
        ]
      ]
    ]
    ```

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L57)):

```js
[]
```

Type definition ([source line 26](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L26) / [source line 41 - 46](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L41-L46)):

```ts
// import postcss from 'postcss';
//
// type NestedArray<T> = (T | NestedArray<T>)[]
// type PluginsRecord = Record<string, unknown>;

NestedArray<postcss.AcceptedPlugin | string | PluginsRecord> | PluginsRecord
```

### `options`

Specify options to pass to the [PostCSS Processor#process() method].
See the [PostCSS documentation for details on options][PostCSS ProcessOptions].

[PostCSS Processor#process() method]: http://api.postcss.org/Processor.html#process
[PostCSS ProcessOptions]: http://api.postcss.org/global.html#processOptions

The `from` and `to` properties cannot be specified because the plugin automatically sets them internally.
If set, [an exception will be thrown](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L67-L87).

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L58)):

```js
{}
```

Type definition ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L27)):

```ts
// import postcss from 'postcss';

Omit<postcss.ProcessOptions, 'from' | 'to'>
```

### `renamer`

Specify a function to rename of processed CSS files.

If you specify a [falsy value] other than `undefined`, such as `null` or `false`, processed files will not be renamed.

```js
// These values disable file renaming
false
0
-0
NaN
-NaN
''
""
``
null
```

If `undefined` or a [truthy value] other than function is specified, use the default renamer.

```js
// These values use the default renamer
undefined
true
42
-42
Infinity
-Infinity
'str'
"0"
`false`
{}
[]
/ab+c/i
new Date()
... // And other non-function objects
```

[falsy value]: https://developer.mozilla.org/en-US/docs/Glossary/Falsy
[truthy value]: https://developer.mozilla.org/en-US/docs/Glossary/Truthy

By default, a function that replaces file extension with `.css` is setted.

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L59-L63)):

```js
const path = require('path');

filename => {
  const newFilename = path.basename(filename, path.extname(filename)) + '.css';
  return path.join(path.dirname(filename), newFilename);
}
```

Type definition ([source line 28](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L28) / [source line 47](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L47)):

```ts
true | false | null | (filename: string) => string
```

### `dependenciesKey`

**To understand the description of this option, knowledge of [the Metalsmith plugin][Metalsmith plugin] is required.**

[Metalsmith plugin]: https://metalsmith.io/#writing-a-plugin

Specify the property name.
The property specified by this option contains an object with the name and metadata of the file used in the CSS conversion.

For example, if you convert the following files with the [postcss-import] plugin:

[postcss-import]: https://www.npmjs.com/package/postcss-import

**`main.css`**
```css
@import "foo.css";

body {
  background: black;
}
```

**`foo.css`**
```css
.foo {
  font-weight: bold;
}
```

If value `'dependencies data'` is specified in `dependenciesKey` option, the following "dependencies object" are inserted into the Metalsmith metadata:

```js
// This object is the value that subsequent Metalsmith plugins read from the "files" argument
// see: https://github.com/segmentio/metalsmith#useplugin
{
  'main.css': {
    // ↓ Properties automatically added by Metalsmith
    contents: Buffer.from('.foo { ... body { ...'), // Converted CSS contents
    mode: ...,
    stats: Stats { ... },
    // ↑ Properties automatically added by Metalsmith

    // ↓ dependencies object added by specifying "dependenciesKey" option
    'dependencies data': {
      'main.css': {
        contents: Buffer.from('@import "foo.css"; ...'), // Contents of main.css before conversion
        mode: ...,
        stats: Stats { ... },
        ...
      },
      'foo.css': {
        contents: Buffer.from('.foo { ...'), // Contents of foo.css before conversion
        mode: ...,
        stats: Stats { ... },
        ...
      }
    }
  },
  'foo.css': {
    // ↓ Properties automatically added by Metalsmith
    contents: Buffer.from('.foo { ...'), // Converted CSS contents
    mode: ...,
    stats: Stats { ... },
    // ↑ Properties automatically added by Metalsmith

    // ↓ dependencies object added by specifying "dependenciesKey" option
    'dependencies data': {
      'foo.css': {
        contents: Buffer.from('.foo { ...'), // Contents of foo.css before conversion
        mode: ...,
        stats: Stats { ... },
        ...
      }
    }
  },
  ...
}
```

If an empty string or a non-string value is specified in the `dependenciesKey` option, the dependencies object is not insert.

```js
// These values not insert dependencies object
false
true
null
undefined
''
""
``
```

Default value ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L64)):

```js
false
```

Type definition ([source](https://github.com/sounisi5011/metalsmith-postcss2/blob/v2.0.0/src/options.ts#L29)):

```ts
string | false | null
```

### PostCSS Plugin array

An options can also be an array.
If an array is specified, its value is used as [the `plugins` option](#plugins).

```js
const postcss = require('metalsmith-postcss2');

postcss([ 'postcss-import' ])
// equal to:
//   postcss({
//     plugins: [ 'postcss-import' ]
//   })
```

## [PostCSS Config][npm-postcss-load-config-used] Context

For more advanced usage it's recommend to to use a function in `postcss.config.js`, this gives you access to the CLI context to dynamically apply options and plugins **per file**

| Name          | Type                                                                                                                                                                                                                                                               | Description            | Default                                      |
| :-----------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------- | :------------------------------------------: |
| `cwd`         | `string`                                                                                                                                                                                                                                                           | `process.cwd()`        | `process.cwd()`                              |
| `env`         | `string`                                                                                                                                                                                                                                                           | `process.env.NODE_ENV` | `'development'`                              |
| `options`     | [`postcss.ProcessOptions`][PostCSS ProcessOptions]                                                                                                                                                                                                                 | PostCSS Options        | `from, to, parser, stringifier, syntax, map` |
| `file`        | `{dirname: string, basename: string, extname: string}`                                                                                                                                                                                                             | Source File Data       | `dirname, basename, extname`                 |
| `pluginsList` | <code>(<a href="http://api.postcss.org/global.html#Plugin">postcss.Plugin</a> &#x7C; <a href="http://api.postcss.org/global.html#pluginFunction">postcss.pluginFunction</a> &#x7C; <a href="http://api.postcss.org/Processor.html">postcss.Processor</a>)[]</code> | PostCSS Plugins Array  | `[]`                                         |
| `metalsmith`  | `Metalsmith`                                                                                                                                                                                                                                                       | `Metalsmith` instance  | `Metalsmith(...)`                            |

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

## Related

* [metalsmith-postcss](https://www.npmjs.com/package/metalsmith-postcss)
* [metalsmith-with-postcss](https://www.npmjs.com/package/metalsmith-with-postcss)
* [@goodthnx/metalsmith-postcss](https://www.npmjs.com/package/@goodthnx/metalsmith-postcss)
