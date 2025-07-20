const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

type FormDataValue = string | Blob | File | Buffer;

export interface CrossPlatformFormData {
    append(key: string, value: FormDataValue, filenameOrOptions?: string | { filename?: string }): void;
    getBuffer?(): Buffer;
    // Add browser FormData methods for compatibility
    get?(key: string): FormDataEntryValue | null;
    getAll?(key: string): FormDataEntryValue[];
    has?(key: string): boolean;
}

export interface NodeFormData extends CrossPlatformFormData {
    getHeaders: () => { [key: string]: string };
    getBuffer(): Buffer;
}

export function isNodeFormData(data: CrossPlatformFormData): data is NodeFormData {
    return 'getHeaders' in data && typeof data.getHeaders === 'function';
}

export async function toNodeCompatibleValue(value: FormDataValue): Promise<Buffer | string> {
    if (typeof value === 'string') return value;

    // Check if Buffer is available (Node.js environment)
    const BufferClass = typeof Buffer !== 'undefined' ? Buffer : null;

    if (!BufferClass) {
        // In browser environment, we can only handle strings and keep Blobs/Files as-is
        if (typeof value === 'string') return value;
        if (value instanceof Blob || value instanceof File) {
            return value as unknown as Buffer; // Will be handled by browser FormData
        }
        throw new Error('Buffer operations not supported in browser environment');
    }

    // Handle Blob/File - convert to Buffer for Node.js
    if (value && typeof value === 'object' && 'arrayBuffer' in value && typeof (value as Blob).arrayBuffer === 'function') {
        const arrayBuffer = await (value as Blob).arrayBuffer();
        return BufferClass.from(arrayBuffer);
    }

    // Handle Buffer (already a Buffer)
    if (BufferClass.isBuffer && BufferClass.isBuffer(value)) {
        return value as unknown as Buffer;
    }

    // Handle Uint8Array
    if (value && typeof value === 'object' && 'byteLength' in value && 'BYTES_PER_ELEMENT' in value) {
        return BufferClass.from(value as unknown as Uint8Array);
    }

    // Handle ArrayBuffer
    if (value && typeof value === 'object' && 'byteLength' in value && !('BYTES_PER_ELEMENT' in value)) {
        return BufferClass.from(value as unknown as ArrayBuffer);
    }

    // Handle Node.js Readable streams
    if (isNode && value && typeof value === 'object' && 'pipe' in value && typeof (value as { pipe: unknown }).pipe === 'function' && !('arrayBuffer' in value)) {
        return value as unknown as Buffer;
    }

    throw new Error('Unsupported FormData value type');
}

// Test environment detection - check for common test runners
const isTestEnv = typeof process !== 'undefined' && (
    process.env?.NODE_ENV === 'test' ||
    process.env?.VITEST === 'true' ||
    process.env?.JEST_WORKER_ID !== undefined ||
    process.argv?.some(arg => arg.includes('jest') || arg.includes('vitest'))
);

export async function createFormData(): Promise<new () => CrossPlatformFormData> {
    // Always use browser FormData in test environment for consistency with browser tests
    if (isTestEnv) {
        return globalThis.FormData as unknown as new () => CrossPlatformFormData;
    }

    // In actual Node.js runtime (not tests), use node form-data
    if (isNode) {
        try {
            const { default: FormData } = await import('form-data');
            return FormData as unknown as new () => CrossPlatformFormData;
        } catch (error) {
            // Fallback to browser FormData if form-data package is not available
            return globalThis.FormData as unknown as new () => CrossPlatformFormData;
        }
    }

    // Browser environment
    return globalThis.FormData as unknown as new () => CrossPlatformFormData;
}