import { SendNameConfig } from '../types';

export class SendMessage<TSendName extends Record<string, SendNameConfig<any, any>>> {
    private _sendNames = {} as TSendName;

    addPayload<TData>() {
        return <TName extends string>(config: SendNameConfig<TName, TData>) => {
            this._sendNames[config.name] = config as any;
            return this as unknown as SendMessage<TSendName & Record<TName, SendNameConfig<TName, TData>>>;
        };
    }

    get sendNames() {
        return this._sendNames;
    }
}
