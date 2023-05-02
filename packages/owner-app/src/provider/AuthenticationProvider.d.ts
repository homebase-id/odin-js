export declare const hasValidToken: () => Promise<boolean>;
export declare const authenticate: (password: string) => Promise<AuthenticationResponse | null>;
export declare const createHomeToken: (returnUrl: string) => Promise<boolean>;
export declare const authenticateDevice: (password: string) => Promise<string>;
export declare const logout: () => Promise<boolean>;
export declare const setNewPassword: (newPassword: string, firstRunToken: string) => Promise<boolean>;
export declare const finalizeRegistration: (firstRunToken: string) => Promise<any>;
export declare const isMasterPasswordSet: () => Promise<boolean>;
export interface NonceData {
    saltPassword64: string;
    saltKek64: string;
    nonce64: string;
    publicPem: string;
    crc: number;
}
export interface AuthenticationReplyNonce {
    nonce64: string;
    nonceHashedPassword64: string;
    crc: number;
    rsaEncrypted: string;
    firstRunToken: string | null;
}
export interface AuthenticationPayload {
    hpwd64: string;
    kek64: string;
    secret: any;
}
export interface AuthenticationResponse {
    sharedSecret: Uint8Array;
}
