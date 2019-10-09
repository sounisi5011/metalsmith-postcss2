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

export function replaceStrByIndex(
    str: string,
    newSubstr: string,
    indexStart: number,
    indexEnd: number,
): string {
    return str.substring(0, indexStart) + newSubstr + str.substring(indexEnd);
}
