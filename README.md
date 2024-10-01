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
import {ReactSocket} from "react-event-socket";

interface MessageEvent {
    userId: number,
    user: { name: string, email: string },
    data: { message: string }
}

export const [socket, events] = new ReactSocket('http://localhost:8080', true)
    .addEvent({
        name: 'message',
        predicate: (data: MessageEvent) => 'message' in data,
        // the props on the select callback will match the props on the predicate
        select: ({user: {name}, data: {message}}) => {
            return {name, message}
        }
    })
    .build()
```

```tsx
import {events, socket} from "./service.ts";

function App() {
    const status = socket.useStatus();
    const message = events.useMessage(); // the type of this will match the type returned from the select {name:string, message: string}
    return <>
        <p>Status: {status}</p>
        <p>latest message: {message}</p>
        {status === 'open' && <button onClick={() => socket.send({message: 'Hello World'})}>Send</button>}
        {status === 'closed' && <button onClick={() => socket.reconnect()}>Reconnect</button>}
    </>
}

export default App
```