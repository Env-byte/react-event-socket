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
        const buffer = {
            type: 'Buffer',
            data: [72, 101, 108, 108, 111],
        };
        const obj = JSON.stringify({
            message: buffer,
        });
        expect(parseEventData(obj)).toEqual({ message: 'Hello' });
    });
});
