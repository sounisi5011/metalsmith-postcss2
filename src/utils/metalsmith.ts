import Metalsmith from 'metalsmith';
import multimatch from 'multimatch';
import path from 'path';

import { isObject } from './';
import { isReadonlyOrWritableArray } from './types';

export type MetalsmithStrictFiles = Record<string, unknown>;

type MetalsmithFileData = Metalsmith.Files[keyof Metalsmith.Files];
export interface FileInterface extends MetalsmithFileData {
    contents: Buffer;
    [index: string]: unknown;
}

export function isFile(value: unknown): value is FileInterface {
    if (isObject(value)) {
        return Buffer.isBuffer(value.contents);
    }
    return false;
}

export function getValidFiles(
    files: MetalsmithStrictFiles,
    filterFilenames?: ReadonlyArray<string>,
): Record<string, FileInterface> {
    return Object.entries(files).reduce<Record<string, FileInterface>>(
        (newFiles, [filename, filedata]) => {
            if (
                filterFilenames &&
                filterFilenames.includes(filename) &&
                isFile(filedata)
            ) {
                newFiles[filename] = filedata;
            }
            return newFiles;
        },
        {},
    );
}

export function getMatchedFilenameList(
    files: MetalsmithStrictFiles,
    pattern: string | ReadonlyArray<string>,
): string[] {
    const filenameList = Object.keys(files);
    const matchPatterns = (Array.isArray as isReadonlyOrWritableArray)(pattern)
        ? [...pattern]
        : pattern;
    const matchedFilenameList = multimatch(filenameList, matchPatterns);
    return matchedFilenameList;
}

export function addFile(
    files: MetalsmithStrictFiles,
    filename: string,
    contents: string,
    originalData?: FileInterface,
): FileInterface {
    const newFile = {
        mode: '0644',
        ...originalData,
        contents: Buffer.from(contents, 'utf8'),
    };
    files[filename] = newFile;
    return newFile;
}

export function findFile(
    files: MetalsmithStrictFiles,
    searchFilename: string,
    metalsmith?: Metalsmith,
): [string, FileInterface] | [null, null] {
    const filedata = files[searchFilename];
    if (isFile(filedata)) {
        return [searchFilename, filedata];
    }

    const fileList = Object.entries(files);
    const pathNormalizerList: ((filename: string) => string)[] = metalsmith
        ? [
              metalsmith.path.bind(metalsmith, metalsmith.source()),
              metalsmith.path.bind(metalsmith, metalsmith.destination()),
          ]
        : [path.normalize];

    for (const pathNormalizer of pathNormalizerList) {
        const normalizeFilename = pathNormalizer(searchFilename);
        for (const [filename, filedata] of fileList) {
            if (
                isFile(filedata) &&
                normalizeFilename === pathNormalizer(filename)
            ) {
                return [filename, filedata];
            }
        }
    }

    return [null, null];
}

export function createPlugin(
    callback: (
        files: MetalsmithStrictFiles,
        metalsmith: Metalsmith,
    ) => Promise<void>,
): Metalsmith.Plugin {
    return (files, metalsmith, done) => {
        callback(files, metalsmith)
            .then(() => done(null, files, metalsmith))
            .catch(error => done(error, files, metalsmith));
    };
}
