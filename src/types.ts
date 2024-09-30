import { CloseMessages, SocketStatus } from './utils';

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
  [Key in keyof T as `set${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: (
    props: T[Key]
  ) => void;
};

export type Hooks<T extends Record<string, any>> = {
  [Key in keyof T as `use${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: () =>
    | T[Key]
    | undefined;
};

export type StoreFromArray<T extends any[]> = {
  [K in T[number] as K['name']]: K extends StoreProperty<
    any,
    infer TArray,
    infer TData
  >
    ? TArray extends true
      ? Exclude<TData, undefined>[]
      : TData
    : never;
};

export type StoreFromRecord<T extends Record<string, any>> = {
  [K in keyof T]: K extends AddEventConfig<any, any, infer TData, infer TArray>
    ? TArray extends true
      ? Exclude<TData, undefined>[]
      : TData
    : never;
};

export interface AddEventConfig<
  TName extends string = '',
  TData = any,
  TSelect = TData,
  TArray extends boolean = false
> {
  predicate: Predicate<TData>;
  select?: Select<TData, TSelect>;
  name: TName;
  array?: TArray;
}

export interface SocketStore {
  status: SocketStatus;
  closeMessage?: CloseMessages | 'Unknown reason';
  error?: Event;
}

export interface StoreProperty<
  TName extends string,
  TArray extends boolean,
  TData = unknown
> {
  name: TName;
  data: TData;
  isArray: TArray;
}

export const buildProperty =
  <TData>() =>
  <TName extends string, TInitial, TArray extends boolean>(
    props: StoreProperty<TName, TArray, TData | TInitial>
  ) =>
    props;
