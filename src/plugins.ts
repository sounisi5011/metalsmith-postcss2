import importCwd from 'import-cwd';

import { defaultOptions, InputOptionsInterface } from './options';
import { isObject, toJsPath } from './utils';
import { AcceptedPlugin, isAcceptedPlugin } from './utils/postcss';
import { isReadonlyOrWritableArray } from './utils/types';

function importPlugin(pluginName: string): unknown {
    try {
        return importCwd(pluginName);
    } catch (err) {
        throw new Error(`Loading PostCSS Plugin failed: ${err.message}`);
    }
}

/**
 * Plugin Loader
 * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L5-L30
 */
function loadPlugin(
    pluginName: string,
    pluginOptions: unknown,
    propList: (string | number)[],
): AcceptedPlugin {
    const pluginGenerator = importPlugin(pluginName);

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L18-L26
     */
    let plugin = pluginGenerator;
    if (isObject(pluginOptions) && Object.keys(pluginOptions).length > 0) {
        if (typeof pluginGenerator !== 'function') {
            throw new TypeError(
                `Loading PostCSS Plugin failed: Module does not export function '${pluginName}'`,
            );
        }
        plugin = pluginGenerator(pluginOptions);
    }

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L59-L61
     */
    if (isObject(plugin) && plugin.postcss) plugin = plugin.postcss;

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L63-L65
     */
    if (isObject(plugin) && plugin.default) plugin = plugin.default;

    /**
     * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L67-L73
     */
    if (!isAcceptedPlugin(plugin))
        throw new TypeError(
            `Invalid PostCSS Plugin found at: plugins${toJsPath(propList)}`,
        );

    return plugin;
}

/**
 * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js
 */
export function loadPlugins(
    plugins: InputOptionsInterface['plugins'] | undefined,
    propList: (string | number)[] = [],
): ReadonlyArray<AcceptedPlugin> {
    if (!plugins) return defaultOptions.plugins;

    return (Array.isArray as isReadonlyOrWritableArray)(plugins)
        ? [...plugins]
              .map((plugin, index) => {
                  if (isAcceptedPlugin(plugin)) return plugin;
                  if (typeof plugin === 'string')
                      return [loadPlugin(plugin, null, [...propList, index])];
                  return loadPlugins(plugin, [...propList, index]);
              })
              .reduce<AcceptedPlugin[]>(
                  (list, plugins) => list.concat(plugins),
                  [],
              )
        : Object.entries(plugins)
              /**
               * @see https://github.com/michael-ciniawsky/postcss-load-config/blob/v2.1.0/src/plugins.js#L49-L51
               */
              .filter(([, pluginOptions]) => pluginOptions !== false)
              .map(([pluginName, pluginOptions]) =>
                  loadPlugin(pluginName, pluginOptions, [
                      ...propList,
                      pluginName,
                  ]),
              );
}
