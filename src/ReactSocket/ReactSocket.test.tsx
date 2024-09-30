import WS from 'jest-websocket-mock';
import { expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactSocket } from './ReactSocket';

const infoSpy = vi.spyOn(console, 'info');
const server = new WS('ws://localhost:1234');

const [socket, hooks] = new ReactSocket('ws://localhost:1234', true)
  .addEvent({
    name: 'received-message',
    predicate: (data: {
      action: 'received-message';
      data: { message: string };
    }) => data.action === 'received-message',
    select: (props) => props.data.message
  })
  .addEvent({
    name: 'joined-room',
    predicate: (data: { action: 'joined-room'; data: { message: string } }) =>
      data.action === 'joined-room'
  })
  .build();

describe('Main', () => {
  it('should handle socket messages', () => {
    let message: string | undefined;

    function Component() {
      expect(hooks.useReceivedMessage()).toEqual(message);
      return null;
    }

    render(<Component />);
    message = 'Hello World';
    server.send(
      JSON.stringify({ action: 'received-message', data: { message } })
    );
    message = 'Hello World 23';
    server.send(
      JSON.stringify({ action: 'received-message', data: { message } })
    );
  });

  it('should log if event not found', () => {
    function Component() {
      return null;
    }

    render(<Component />);
    server.send(JSON.stringify({ action: 'message', data: { message: '' } }));
    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not find event for data'),
      expect.anything()
    );
  });

  it('should log if no select found', () => {
    let message: object | undefined;

    function Component() {
      expect(hooks.useJoinedRoom()).toEqual(message);
      return null;
    }

    render(<Component />);
    message = { action: 'joined-room', data: { message: '' } };
    server.send(
      JSON.stringify({ action: 'joined-room', data: { message: '' } })
    );
    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not find Select function for event'),
      expect.anything()
    );
  });

  describe('socket statuses', () => {
    it('should handle open status', () => {
      function Component() {
        const status = socket.useStatus();
        const closeMessage = socket.useCloseMessage();
        console.log(status, closeMessage);
        return null;
      }

      render(<Component />);
      socket.disconnect();
      socket.reconnect();
    });

    it('should handle close status', () => {
      let message: string;

      function Component() {
        const closeMessage = socket.useCloseMessage();
        expect(closeMessage).toEqual(message);
        return null;
      }

      render(<Component />);

      message =
        'Normal closure, meaning that the purpose for which the connection was established has been fulfilled.';
      server.close();
    });
  });
});
