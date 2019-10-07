export function ignoreTypeError(callback: () => void): void {
    try {
        callback();
    } catch (error) {
        if (!(error instanceof TypeError)) {
            throw error;
        }
    }
}
