import WS from 'jest-websocket-mock';
import { beforeEach, describe, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ReactSocket } from './ReactSocket';

const infoSpy = vi.spyOn(console, 'info');
const server = new WS('ws://localhost:1234');

interface ReceivedMessage {
  action: 'received-message';
  data: { message: string };
}

interface JoinedRoom {
  action: 'joined-room';
  data: { message: string };
}

const [socket, hooks] = new ReactSocket('ws://localhost:1234', true)
  .addEvent({
    name: 'received-message',
    predicate: (data: ReceivedMessage) => data.action === 'received-message',
    select: (props) => props.data.message,
    array: true
  })
  .addEvent({
    name: 'joined-room',
    predicate: (data: JoinedRoom) => data.action === 'joined-room'
  })
  //
  .addPayload<{ message: string }>()('message')
  .addPayload<{ channel: string }>()('join')
  .build();

describe('Main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test('should handle socket messages', () => {
    const { result } = renderHook(() => hooks.useReceivedMessage()); // this should just be string[]
    const message = ['Hello World'];
    server.send(
      JSON.stringify({
        action: 'received-message',
        data: { message: 'Hello World' }
      })
    );
    expect(result.current).toEqual(message);
    message.push('Hello World 23');
    server.send(
      JSON.stringify({
        action: 'received-message',
        data: { message: 'Hello World 23' }
      })
    );
    expect(result.current).toEqual(message);
  });

  test('should log if event not found', () => {
    server.send(JSON.stringify({ action: 'message', data: { message: '' } }));
    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      'react-event-socket',
      expect.stringContaining('Could not find event for data:'),
      expect.anything()
    );
  });

  test('should log if no select found', () => {
    server.send(
      JSON.stringify({ action: 'joined-room', data: { message: '' } })
    );
    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      'react-event-socket',

      expect.stringContaining('No select function for event:'),
      expect.anything()
    );
  });

  describe('socket statuses', () => {
    test('should handle connecting status', () => {
      const { result } = renderHook(() => socket.useStatus());
      socket.disconnect();
      socket.reconnect();
      expect(result.current).toEqual('connecting');
    });

    test('should handle close status', () => {
      const { result } = renderHook(() => socket.useCloseMessage());
      server.close();
      expect(result.current).toEqual(
        'Normal closure, meaning that the purpose for which the connection was established has been fulfilled.'
      );
    });
  });

  describe('should have named send functions', () => {
    test('should have sendMessage and sendJoin', () => {
      expect(socket).toHaveProperty('sendMessage');
      expect(socket).toHaveProperty('sendJoin');
    });
  });
});
