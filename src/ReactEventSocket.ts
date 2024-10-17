import { ReceivedMessage } from './Classes/ReceivedMessage';
import { Socket } from './Classes/Socket';
import { SendMessage } from './Classes/SendMessage';
import { SendNameConfig } from './types';

export class ReactEventSocket<
    TReceivedMessage extends Record<string, any> = {},
    TSendMessage extends Record<string, SendNameConfig<any, any>> = {}
> {
    private readonly receivedMessage: ReceivedMessage<TReceivedMessage>;

    private readonly sendMessage: SendMessage<TSendMessage>;

    private readonly address: string;

    private readonly verbose: boolean;

    constructor(address: string, verbose?: boolean) {
        this.receivedMessage = new ReceivedMessage();
        this.sendMessage = new SendMessage();
        this.verbose = verbose ?? false;
        this.address = address;
    }

    // @ts-ignore
    addReceivedMessage<T>(callback: (received: ReceivedMessage<TReceivedMessage>) => ReceivedMessage<T>) {
        callback(this.receivedMessage);
        return this as unknown as ReactEventSocket<TReceivedMessage & T, TSendMessage>;
    }

    // @ts-ignore
    addSendMessage<T>(callback: (send: SendMessage<TSendMessage>) => SendMessage<T>) {
        callback(this.sendMessage);
        return this as unknown as ReactEventSocket<TReceivedMessage, TSendMessage & T>;
    }

    build() {
        const [eventHooks, eventDispatches] = this.receivedMessage.events;
        const events = this.receivedMessage.config;
        const { sendNames } = this.sendMessage;
        const socket = new Socket({
            address: this.address,
            events,
            sendNames,
            eventDispatches,
            verbose: this.verbose
        });

        socket.init();
        return [socket.hooks, eventHooks] as const;
    }
}
