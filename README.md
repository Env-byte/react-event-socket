## react-event-socket

A simple React component to handle WebSockets events.

### Installation

```bash
npm install react-event-socket
```

### Usage
The below is a simple example of how to use `react-event-socket`.
In the below example the server is sending a message event with a payload of `{message: 'Hello World'}`.
We can set up react-event-socket to listen for this event by using the `addEvent` function and setting the predicate to identify this event by the payload. We can do this via `'message' in data`.
```tsx
//service.ts
import { ReactEventSocket, Middleware } from 'react-event-socket';

interface MessageEvent {
    userId: number,
    user: { name: string, email: string },
    data: { message: string }
}

interface JoinedRoom {
    name: string;
    id: number;
}

const wrapPayload: Middleware = ({ name, data }) => ({ action: name, data });

const [socket, hooks] = new ReactEventSocket('ws://localhost:1234', true)
    .addReceivedMessage((received) =>
        received
            .addEvent({
                name: 'received-message',
                predicate: (data: MessageEvent) => 'message' in data,
                // the props on the select callback will match the props on the predicate
                select: ({ user: { name }, data: { message } }) => {
                    return { name, message };
                },
                array: true,
            })
            .addEvent({
                name: 'room',
                predicate: (data: JoinedRoom) => data.action === 'joined-room',
            }),
    )
    .addSendMessage((send) => {
        return send
            .addPayload<{
                channel: string;
            }>()({ name: 'join' })
            .addPayload<{ message: string }>()({
                name: 'message',
                middleware: [wrapPayload],
            });
    })
    .build();
```

```tsx
// component.tsx
import { hooks, socket } from './service.ts';

function App() {
    const status = socket.useStatus();
    const messages = hooks.useReceivedMessage(); // {name:string, message: string}[], since we put this as an array and used a select
    const room = hooks.useRoom(); // JoinedRoom
    return <>
        <p>Status: {status}</p>
        <p>latest message: {message}</p>
        {status === 'open' && <button onClick={() => socket.sendMessage({ message: 'Hello World' })}>Send</button>}
        {status === 'closed' && <button onClick={() => socket.reconnect()}>Reconnect</button>}
    </>;
}

export default App;
```