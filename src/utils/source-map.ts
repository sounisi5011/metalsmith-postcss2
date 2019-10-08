import Metalsmith from 'metalsmith';
import path from 'path';

import { FileInterface, findFile, isFile } from './metalsmith';

/**
 * @see https://sourcemaps.info/spec.html#h.lmz475t4mvbx
 */
export function getSourceMappingURL(cssText: string): string | null {
    const pattern = /\/\*\s*# sourceMappingURL=((?:(?!\*\/).)*)\*\//g;
    let url: string | null = null;

    let match: ReturnType<typeof pattern.exec>;
    while ((match = pattern.exec(cssText))) {
        url = match[1].trim();
    }

    return url;
}

export function isDataURL(url: string): boolean {
    return url.startsWith('data:');
}

export function findSourceMapFile(
    files: Metalsmith.Files,
    cssFilename: string,
    metalsmith?: Metalsmith,
): [string, FileInterface] | [null, null] {
    const cssFiledata = files[cssFilename];

    if (isFile(cssFiledata)) {
        const cssText = cssFiledata.contents.toString();
        const sourceMappingURL = getSourceMappingURL(cssText);

        if (
            typeof sourceMappingURL === 'string' &&
            !isDataURL(sourceMappingURL)
        ) {
            const cssFilepath = metalsmith
                ? metalsmith.path(metalsmith.source(), cssFilename)
                : cssFilename;
            const sourceMapPath = (path.isAbsolute(cssFilepath)
                ? path.resolve
                : path.join)(path.dirname(cssFilepath), sourceMappingURL);
            return findFile(files, sourceMapPath, metalsmith);
        }
    }

    return [null, null];
}