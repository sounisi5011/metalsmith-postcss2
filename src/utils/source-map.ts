import Metalsmith from 'metalsmith';
import path from 'path';
import validDataUrl from 'valid-data-url';

import {
    FileInterface,
    findFile,
    isFile,
    MetalsmithStrictFiles,
} from './metalsmith';

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

export function findSourceMapFile(
    files: MetalsmithStrictFiles,
    cssFilename: string,
    metalsmith?: Metalsmith,
): [string, FileInterface] | [null, null] {
    const cssFiledata = files[cssFilename];
    if (!isFile(cssFiledata)) {
        return [null, null];
    }

    const cssText = cssFiledata.contents.toString();
    const sourceMappingURL = getSourceMappingURL(cssText);
    if (
        typeof sourceMappingURL !== 'string' ||
        validDataUrl(sourceMappingURL)
    ) {
        return [null, null];
    }

    const cssFilepath = metalsmith
        ? metalsmith.path(metalsmith.source(), cssFilename)
        : cssFilename;
    const sourceMapPath = (path.isAbsolute(cssFilepath)
        ? path.resolve
        : path.join)(path.dirname(cssFilepath), sourceMappingURL);
    return findFile(files, sourceMapPath, metalsmith, isFile);
}
