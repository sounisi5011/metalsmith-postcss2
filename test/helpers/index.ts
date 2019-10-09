export function isStringList(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(v => typeof v === 'string');
}

export function ignoreTypeError(callback: () => void): void {
    try {
        callback();
    } catch (error) {
        if (!(error instanceof TypeError)) {
            throw error;
        }
    }
}

function recursiveVoidFunc(): typeof recursiveVoidFunc {
    return recursiveVoidFunc;
}

export function switchTest(
    condition: boolean,
    message: string,
    successCallback: (message: string) => void,
    failCallback?: (message: string) => void,
): typeof switchTest {
    if (condition) {
        successCallback(message);
        return switchTest;
    } else {
        if (typeof failCallback === 'function') {
            failCallback(message);
        }
        return recursiveVoidFunc;
    }
}
