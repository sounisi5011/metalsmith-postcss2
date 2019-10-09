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
export function getSourceMappingURLData(
    cssText: string,
): { url: string; startPos: number; endPos: number } | null {
    const pattern = /\/\*\s*# sourceMappingURL=((?:(?!\*\/).)*)\*\//g;
    let url: { url: string; startPos: number; endPos: number } | null = null;

    let match: ReturnType<typeof pattern.exec>;
    while ((match = pattern.exec(cssText))) {
        const urlStr = match[1].trim();
        const startPos = cssText.indexOf(urlStr, match.index);

        if (startPos >= 0) {
            url = {
                url: urlStr,
                startPos,
                endPos: startPos + urlStr.length,
            };
        }
    }

    return url;
}

export function findSourceMapFile(
    files: MetalsmithStrictFiles,
    cssFilename: string,
    metalsmith?: Metalsmith,
): [string, FileInterface] | [null, null] {
    const cssFiledata = files[cssFilename];

    if (isFile(cssFiledata)) {
        const cssText = cssFiledata.contents.toString();
        const sourceMappingURL = getSourceMappingURLData(cssText);

        if (sourceMappingURL && !validDataUrl(sourceMappingURL.url)) {
            const cssFilepath = metalsmith
                ? metalsmith.path(metalsmith.source(), cssFilename)
                : cssFilename;
            const sourceMapPath = (path.isAbsolute(cssFilepath)
                ? path.resolve
                : path.join)(path.dirname(cssFilepath), sourceMappingURL.url);
            return findFile(files, sourceMapPath, metalsmith);
        }
    }

    return [null, null];
}
