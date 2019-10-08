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
