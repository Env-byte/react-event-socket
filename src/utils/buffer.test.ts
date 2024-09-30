import { convertBuffersToStrings, parseEventData } from './buffer';

describe('Buffer', () => {
    it('should convert buffer to string', () => {
        const buffer = {
            type: 'Buffer',
            data: [72, 101, 108, 108, 111],
        };
        expect(convertBuffersToStrings(buffer)).toEqual('Hello');
    });

    it('should convert buffer in object to string', () => {
        const buffer = {
            type: 'Buffer',
            data: [72, 101, 108, 108, 111],
        };
        const obj = {
            message: buffer,
        };
        expect(convertBuffersToStrings(obj)).toEqual({ message: 'Hello' });
    });

    it('should convert json with buffer in object to string', () => {
        const obj =
            '{"message":{"type":"Buffer","data":[123,34,109,101,115,115,97,103,101,34,58,34,72,101,108,108,111,32,87,111,114,108,100,34,125]},"id":1,"action":false,"data":{"message":"Hello World"}}';

        expect(parseEventData(obj)).toEqual({
            action: false,
            data: {
                message: 'Hello World',
            },
            id: 1,
            message: { message: 'Hello World' },
        });
    });
});
