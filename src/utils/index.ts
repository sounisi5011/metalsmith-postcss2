import util from 'util';

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

export function toJsPath(propList: (string | number)[]): string {
    return propList
        .map(prop =>
            typeof prop === 'string' && /^\w+$/.test(prop)
                ? `.${prop}`
                : `[${util.inspect(prop)}]`,
        )
        .join('');
}
