import axios, {AxiosError} from "axios";
import {Guid} from "guid-typescript";

export interface ProviderOptions
{
    useOwnerApi?:boolean,
    sharedSecret: Uint8Array | null
}

export class ProviderBase {

    private _options: ProviderOptions;

    constructor(options:ProviderOptions | null) {

        this._options = options;
    }

    protected getSharedSecret(): Uint8Array {
        return this._options?.sharedSecret;
    }
    
    protected getOptions():ProviderOptions
    {
        return this._options;
    }
    
    protected AssertHasSharedSecret(){
        if(this._options?.sharedSecret == null)
        {
            throw new Error("Shared secret not configured");
        }
    }
    
    //Returns the endpoint for the identity
    protected getEndpoint(): string {
        let root:string = this._options?.useOwnerApi ? "/api/owner/v1" : "/api/apps/v1";
        return "https://" + window.location.hostname + root
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