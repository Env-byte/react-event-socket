import { convertBuffersToStrings, parseEventData } from './buffer';

describe('Buffer', () => {
  it('should convert buffer to string', () => {
    const buffer = {
      type: 'Buffer',
      data: [72, 101, 108, 108, 111]
    };
    expect(convertBuffersToStrings(buffer)).toEqual('Hello');
  });

  it('should convert buffer in object to string', () => {
    const buffer = {
      type: 'Buffer',
      data: [72, 101, 108, 108, 111]
    };
    const obj = {
      message: buffer
    };
    expect(convertBuffersToStrings(obj)).toEqual({ message: 'Hello' });
  });

  it('should convert json with buffer in object to string', () => {
    const obj =
      '{"message":{"message":"Hello World"},"id":1,"action":false,"data":{"message":"Hello World"}}';

    expect(parseEventData(obj)).toEqual({
      action: false,
      data: {
        message: 'Hello World'
      },
      id: 1,
      message: { message: 'Hello World' }
    });
  });
});
