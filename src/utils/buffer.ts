interface Buffer {
    type: 'Buffer';
    data: number[];
}

const isBuffer = (obj: any): obj is Buffer =>
    typeof obj === 'object' && obj && 'type' in obj && obj.type === 'Buffer';

const parseBuffer = (buffer: Buffer) => {
    const encoder = new TextDecoder('utf-8');
    const array = new Uint8Array(buffer.data);
    return encoder.decode(array);
};

export const convertBuffersToStrings = (obj: unknown): unknown => {
    if (isBuffer(obj)) {
        return parseBuffer(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(convertBuffersToStrings);
    }

    if (obj !== null && typeof obj === 'object') {
        const newObj: Record<PropertyKey, unknown> = {};

        Object.keys(obj).forEach((key) => {
            newObj[key] = convertBuffersToStrings(obj[key as keyof typeof obj]);
        });
        return newObj;
    }

    return obj;
};

export const parseEventData = (data: string): unknown => {
    const parsed = JSON.parse(data);
    return convertBuffersToStrings(parsed);
};
