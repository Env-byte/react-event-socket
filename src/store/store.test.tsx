import { expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createStore } from './store';
import { buildProperty } from '../types';
import { CloseMessages, SocketStatus } from '../utils';

const socketProps = [
  buildProperty<SocketStatus>()({
    name: 'status',
    data: 'closed' as const,
    isArray: false
  }),
  buildProperty<Event>()({
    name: 'error',
    data: undefined,
    isArray: false
  }),
  buildProperty<CloseMessages>()({
    name: 'closeMessage',
    data: undefined,
    isArray: false
  })
];
const [hooks, dispatches] = createStore(socketProps);

describe('Store', () => {
  test('Should create store from key', () => {
    const { result } = renderHook(() => hooks.useStatus());
    act(() => {
      dispatches.setStatus('closed');
    });
    expect(result.current).toEqual('closed');
  });
});
