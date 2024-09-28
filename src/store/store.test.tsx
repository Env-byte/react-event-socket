import { expect } from 'vitest';
import { act, render } from '@testing-library/react';
import { createStore } from './store';

describe('Store', () => {
    test('Should create store from key', () => {
        const keys = ['name', 'age'] as const;
        type Store = Record<(typeof keys)[number], string>;
        const [hooks, dispatches] = createStore<Store>(keys);
        let name: string | undefined;

        function Component() {
            expect(hooks.useName()).toEqual(name);
            const age = hooks.useAge();
            console.info('Name:', name, age);
            return null;
        }

        render(<Component />);
        name = 'John Doe';
        act(() => {
            dispatches.setName(name);
            dispatches.setAge('26');
        });
    });
});
