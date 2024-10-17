import WS from 'vitest-websocket-mock';
import { beforeEach, describe, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactEventSocket } from './ReactEventSocket';
import { Middleware } from './types';

const infoSpy = vi.spyOn(console, 'info');

interface ReceivedMessage {
    action: 'received-message';
    data: { message: string };
}

interface JoinedRoom {
    action: 'joined-room';
    data: { message: string };
}

const wrapPayload: Middleware = ({ name, data }) => ({ action: name, data });

const [socket, hooks] = new ReactEventSocket('ws://localhost:1234', true)
    .addReceivedMessage((received) =>
        received
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
    )
    .addSendMessage((send) => {
        return send
            .addPayload<{
                channel: string;
            }>()({ name: 'join' })

            .addPayload<{ message: string }>()({
            name: 'message',
            middleware: [wrapPayload]
        });
    })
    .build();

describe('Main', () => {
    let server: WS;
    beforeEach(async () => {
        vi.clearAllMocks();
        WS.clean();
        server = new WS('ws://localhost:1234');
        socket.reconnect();
    });

    describe('events', () => {
        test('should handle socket messages', async () => {
            await server.connected;
            const { result } = renderHook(() => hooks.useReceivedMessage()); // this should just be string[]
            const message = ['Hello World'];
            act(() => {
                server.send(
                    JSON.stringify({
                        action: 'received-message',
                        data: { message: 'Hello World' }
                    })
                );
            });
            expect(result.current).toEqual(message);
            message.push('Hello World 23');
            act(() => {
                server.send(
                    JSON.stringify({
                        action: 'received-message',
                        data: { message: 'Hello World 23' }
                    })
                );
            });

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
            server.send(JSON.stringify({ action: 'joined-room', data: { message: '' } }));
            expect(infoSpy).toHaveBeenCalled();
            expect(infoSpy).toHaveBeenCalledWith(
                'react-event-socket',
                expect.stringContaining('No select function for event:'),
                expect.anything()
            );
        });
    });

    describe('socket statuses', () => {
        test('should handle connecting status', async () => {
            const { result } = renderHook(() => socket.useStatus());
            act(() => {
                socket.disconnect();
                socket.reconnect();
            });
            expect(result.current).toEqual('connecting');

            await waitFor(() => expect(result.current).toEqual('open'));
        });

        test('should handle close status', () => {
            const { result } = renderHook(() => socket.useCloseMessage());
            act(() => {
                server.close();
            });
            expect(result.current).toEqual(
                'Normal closure, meaning that the purpose for which the connection was established has been fulfilled.'
            );
        });
    });

    describe('send message', () => {
        test('should send server join', async () => {
            await server.connected;
            const payload = { channel: 'hello' };
            socket.sendJoin(payload);
            // @ts-ignore 'vitest-websocket-mock' has broken extended matchers
            await expect(server).toReceiveMessage(JSON.stringify(payload));
            // @ts-ignore 'vitest-websocket-mock' has broken extended matchers
            expect(server).toHaveReceivedMessages([JSON.stringify(payload)]);
        });

        test('should send message and execute the middleware', async () => {
            await server.connected;
            const payload = { message: 'hello' };
            socket.sendMessage(payload);
            // @ts-ignore 'vitest-websocket-mock' has broken extended matchers
            await expect(server).toReceiveMessage(JSON.stringify({ action: 'message', data: payload }));
            // @ts-ignore 'vitest-websocket-mock' has broken extended matchers
            expect(server).toHaveReceivedMessages([JSON.stringify({ action: 'message', data: payload })]);
        });
    });

    describe('api properties', () => {
        test('should have sendMessage and sendJoin', () => {
            console.log(socket);
            expect(socket).toHaveProperty('sendMessage');
            expect(socket).toHaveProperty('sendJoin');
        });

        test('should have useReceivedMessage and useJoinedRoom', () => {
            console.log(hooks);
            expect(hooks).toHaveProperty('useReceivedMessage');
            expect(hooks).toHaveProperty('useJoinedRoom');
        });
    });
});
