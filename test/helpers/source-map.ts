import { hasProp, isObject } from '../../src/utils';
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
