// formData.ts
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Define a type for form-data's FormData with getHeaders
interface NodeFormData {
    append: (key: string, value: unknown, options?: { filename?: string }) => void;
    getHeaders: () => { [key: string]: string };
    // Add other methods as needed
}

// Use native FormData in browsers, NodeFormData in Node.js
const FormData = isNode ? await import('form-data').then(module => module.default) : globalThis.FormData;

export { FormData, NodeFormData };

// Type guard to check if FormData is NodeFormData
export function isNodeFormData(data: FormData | NodeFormData): data is NodeFormData {
    return 'getHeaders' in data && typeof data.getHeaders === 'function';
}