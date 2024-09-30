import { create, StoreApi, UseBoundStore } from 'zustand';
import { Dispatches, Hooks, Store } from '../types';
import { toCamelCase } from '../utils';

const buildDispatches = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>
) =>
  Object.keys(useStore.getState()).reduce((acc, key) => {
    const keyValue = key as keyof Store;
    const dispatchName = `set${toCamelCase(key)}`;
    const setValue = (value: unknown | ((s: unknown) => unknown)) => {
      useStore.setState({ [keyValue]: value } as any);
    };
    return { ...acc, [dispatchName]: setValue };
  }, {} as Dispatches<Store>);

const buildHooks = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>
) =>
  Object.keys(useStore.getState()).reduce((acc, key) => {
    const keyValue = key as keyof Store;
    const getterName = `use${toCamelCase(key)}`;
    return { ...acc, [getterName]: () => useStore((s) => s[keyValue]) };
  }, {} as Hooks<Store>);

export const createStore = <TEvents extends Record<string, any>>(
  properties: ReadonlyArray<keyof TEvents>
) => {
  const store = properties.reduce(
    (acc, key) => ({
      ...acc,
      [key]: undefined
    }),
    {} as Store<TEvents>
  );
  const useStore = create<Store<TEvents>>()(() => ({ ...store }));

  const dispatches = buildDispatches(useStore);
  const hooks = buildHooks(useStore);

  return [hooks, dispatches] as const;
};
