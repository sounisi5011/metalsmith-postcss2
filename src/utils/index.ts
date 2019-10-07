// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isObject(value: unknown): value is Record<any, unknown> {
    return typeof value === 'object' && value !== null;
}

export function hasProp<
    T extends object,
    U extends (Parameters<typeof Object.prototype.hasOwnProperty>)[0]
>(value: T, prop: U): value is T & Required<Pick<T, Extract<keyof T, U>>> {
    return Object.prototype.hasOwnProperty.call(value, prop);
}

export function replaceLine(
    str: string,
    replaceFunc: (line: string) => string,
): string {
    return str.replace(/.+/g, line => replaceFunc(line));
}

export function compareUnicode(a: string, b: string): number {
    const aChars = [...a];
    const bChars = [...b];
    const aLen = aChars.length;
    const bLen = bChars.length;

    const minLen = Math.min(aLen, bLen);
    for (let index = 0; index < minLen; index++) {
        const aCode = aChars[index].codePointAt(0);
        const bCode = bChars[index].codePointAt(0);

        if (typeof aCode !== 'number' || typeof bCode !== 'number') {
            continue;
        }

        if (aCode !== bCode) {
            return aCode - bCode;
        }
    }

    return aLen - bLen;
}

export async function promiseFinally<T>(
    promise: Promise<T>,
    onfinally: () => void | Promise<void>,
): Promise<T> {
    if (typeof promise.finally === 'function') {
        return promise.finally(onfinally);
    } else {
        return promise
            .then(async value => {
                await onfinally();
                return value;
            })
            .catch(async error => {
                await onfinally();
                throw error;
            });
    }
}
