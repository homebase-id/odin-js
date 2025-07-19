// formData.ts
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Define a minimal FormData interface for cross-compatibility
interface CrossPlatformFormData {
    append: (key: string, value: unknown, options?: { filename?: string }) => void;
}

// Define interface for form-data's FormData with getHeaders
interface NodeFormData extends CrossPlatformFormData {
    getHeaders: () => { [key: string]: string };
}

// Type guard to check if FormData is NodeFormData
export function isNodeFormData(data: CrossPlatformFormData): data is NodeFormData {
    return 'getHeaders' in data && typeof data.getHeaders === 'function';
}

// Use form-data in Node.js, globalThis.FormData in browsers
const FormData = isNode ? await import('form-data').then(module => module.default) : globalThis.FormData;

export { FormData as FormDataImplementation, CrossPlatformFormData, NodeFormData };