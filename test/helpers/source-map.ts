import validDataUrl from 'valid-data-url';

import { hasProp, isObject } from '../../src/utils';
import { getSourceMappingURL } from '../../src/utils/source-map';
import { isStringList } from './';

export interface SourceMap {
    version: number;
    sources: string[];
    file: string;
    names: string[];
    mappings: string;
    sourceRoot?: string;
    sourcesContent?: string[];
}

export function isValidSourceMap(value: unknown): value is SourceMap {
    return (
        isObject(value) &&
        (typeof value.version === 'number' &&
            isStringList(value.sources) &&
            typeof value.file === 'string' &&
            isStringList(value.names) &&
            typeof value.mappings === 'string' &&
            (!hasProp(value, 'sourceRoot') ||
                typeof value.sourceRoot === 'string') &&
            (!hasProp(value, 'sourcesContent') ||
                isStringList(value.sourcesContent)))
    );
}

export function getSourceMappingURLType(
    cssData: string | Buffer,
): 'file' | 'inline' | null {
    const sourceMappingURL = getSourceMappingURL(cssData.toString());
    if (typeof sourceMappingURL === 'string') {
        return validDataUrl(sourceMappingURL) ? 'inline' : 'file';
    }
    return null;
}

export function readSourceMapURL(cssData: string | Buffer): string | null {
    return getSourceMappingURL(cssData.toString());
}

export function readInlineSourceMap(cssData: string | Buffer): string | null {
    const sourceMappingURL = getSourceMappingURL(cssData.toString());

    if (sourceMappingURL) {
        const uri = 'data:application/json,';
        const baseUri = /^data:application\/json;base64,/;
        const baseCharsetUri = /^data:application\/json;charset=utf-?8;base64,/;

        if (sourceMappingURL.startsWith(uri)) {
            return decodeURIComponent(sourceMappingURL.substring(uri.length));
        }

        for (const uriPattern of [baseCharsetUri, baseUri]) {
            const match = uriPattern.exec(sourceMappingURL);
            if (match) {
                return Buffer.from(
                    sourceMappingURL.substring(match[0].length),
                    'base64',
                ).toString();
            }
        }
    }

    return null;
}
