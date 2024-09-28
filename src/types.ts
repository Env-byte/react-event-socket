import { Dispatch } from 'react';

export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type Predicate<TData = any> = (data: TData) => boolean;
export type Select<TData = any, TSelect = TData> = (data: TData) => TSelect;

type IsDash<T extends string> = T extends `-` ? true : false;

export type ToCamelCase<T extends string> =
    T extends `${infer first}${infer rest}`
        ? IsDash<first> extends true
            ? `${Capitalize<ToCamelCase<rest>>}`
            : `${first}${ToCamelCase<rest>}`
        : '';

export type Dispatches<T extends Record<string, any>> = {
    [Key in keyof T as `set${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: Dispatch<
        T[Key]
    >;
};

export type Hooks<T extends Record<string, any>> = {
    [Key in keyof T as `use${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: () =>
        | T[Key]
        | undefined;
};

export type Store<T extends Record<string, any>> = {
    [key in keyof T]: T[key];
};
