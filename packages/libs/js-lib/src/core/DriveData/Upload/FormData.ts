
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Define a minimal FormData interface for cross-compatibility
export interface CrossPlatformFormData {
    append: (key: string, value: any, options?: { filename?: string }) => void;
}

// Define interface for form-data's FormData with getHeaders
export interface NodeFormData extends CrossPlatformFormData {
    getHeaders: () => { [key: string]: string };
}

// Type guard to check if FormData is NodeFormData
export function isNodeFormData(data: CrossPlatformFormData): data is NodeFormData {
    return 'getHeaders' in data && typeof data.getHeaders === 'function';
}

// Factory function to create FormData instance
export async function createFormData(): Promise<new () => CrossPlatformFormData> {
    if (isNode) {
        try {
            const { default: FormData } = await import('form-data');
            return FormData as new () => CrossPlatformFormData;
        } catch (error) {
            console.error('Failed to load form-data package:', error);
            throw new Error('Failed to load form-data package. Ensure it is installed: npm install form-data');
        }
    }
    return globalThis.FormData as new () => CrossPlatformFormData;
}