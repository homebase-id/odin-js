import axios, {AxiosError} from "axios";
import {Guid} from "guid-typescript";

export class ProviderBase {
    private _sharedSecret: Uint8Array;

    constructor(sharedSecret: Uint8Array | null) {

        //@ts-ignore: ignoring since we check above
        this._sharedSecret = sharedSecret;
    }

    protected getSharedSecret(): Uint8Array {
        return this._sharedSecret;
    }
    
    protected AssertHasSharedSecret(){
        if(this._sharedSecret == null)
        {
            throw new Error("Shared secret not configured");
        }
    }
    
    //Returns the endpoint for the identity
    protected getEndpoint(): string {
        return "https://" + window.location.hostname + "/api/owner/v1";
    }

    //Gets an Axios client configured with token info
    protected createAxiosClient(appId: Guid | null = null) {
        return axios.create({
            baseURL: this.getEndpoint(),
            withCredentials: true,
            headers:
                {
                    'AppId': appId == null ? "": appId.toString()
                }
        });
    }

    protected handleErrorResponse(error: AxiosError) {
        throw error;
    }
}