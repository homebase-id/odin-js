export class AesEncrypt {
    static async CbcEncrypt(data: Uint8Array, iv: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
        let importedKey = await crypto.subtle.importKey(
            "raw",
            key,
            {   //this is the algorithm options
                name: "AES-CBC",
            },
            false, //whether the key is extractable (i.e. can be used in exportKey)
            ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
        );

        let cipher = await crypto.subtle.encrypt(
            {
                name: "AES-CBC",
                iv: iv,
            },
            importedKey, //from generateKey or importKey above
            data //ArrayBuffer of data you want to encrypt
        );

        return new Uint8Array(cipher);
    }


    static async CbcDecrypt(cipher: Uint8Array, iv: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
        // console.log("Decrypt IV = " + iv);
        let importedKey = await crypto.subtle.importKey(
            "raw",
            key,
            {   //this is the algorithm options
                name: "AES-CBC",
            },
            false, //whether the key is extractable (i.e. can be used in exportKey)
            ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
        );

        let decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-CBC",
                iv: iv, //The initialization vector you used to encrypt
            },
            importedKey, //from generateKey or importKey above
            cipher //ArrayBuffer of the data
        );

        return new Uint8Array(decrypted);
    }
}
