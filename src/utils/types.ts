/*
 * Modify the Array.isArray function so that it can correctly Type Guard the ReadonlyArray type.
 * @example
 *   (Array.isArray as isReadonlyOrWritableArray)(value)
 *   (<isReadonlyOrWritableArray>Array.isArray)(value)
 */
export type isReadonlyOrWritableArray = (
    value: unknown,
) => value is unknown[] | ReadonlyArray<unknown>;

export type ArrayValue<T> = T extends ReadonlyArray<infer U> ? U : never;

export type ArrayLikeOnly<T> = T extends ReadonlyArray<unknown> ? T : never;

export type NestedReadonlyArray<T> = ReadonlyArray<T | NestedReadonlyArray<T>>;
