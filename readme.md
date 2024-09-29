## react-event-socket

A simple React component to handle WebSockets events.

### Installation

```bash
npm install react-event-socket
```

### Usage
The below is a simple example of how to use `react-event-socket`.
In the below example the server is sending a message event with a payload of `{message: 'Hello World'}`.
We can setup react-event-socket to listen for this event by using the `addEvent` function and setting the predicate to identify this event by the payload. We can do this via `'message' in data`.
```tsx
import {ReactSocket} from 'react-event-socket'

const [{useStatus, send, reconnect}, {useMessage}] = new ReactSocket('http://localhost:8080', true)
    .addEvent({
        name: 'message',
        predicate: (data: { message: string }) => 'message' in data,
        select: (data) => data.message,
    })
    .build()

function App() {
    const status = useStatus();
    const message = useMessage();
    return <>
        <p>Status: {status}</p>
        <p>latest message: {message}</p>
        {status === 'open' && <button onClick={() => send({message: 'Hello World'})}>Send</button>}
        {status === 'closed' && <button onClick={() => reconnect()}>Reconnect</button>}
    </>
}
```