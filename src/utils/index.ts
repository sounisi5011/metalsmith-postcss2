import util from 'util';

export function isObject(
    value: unknown,
): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null;
}

export function hasProp<T extends object, U extends PropertyKey>(
    value: T,
    prop: U,
): value is T & Required<Pick<T, Extract<keyof T, U>>> {
    return Object.prototype.hasOwnProperty.call(value, prop);
}

export function toJsPath(propList: ReadonlyArray<string | number>): string {
    return propList
        .map(prop =>
            typeof prop === 'string' && /^\w+$/.test(prop)
                ? `.${prop}`
                : `[${util.inspect(prop)}]`,
        )
        .join('');
}
