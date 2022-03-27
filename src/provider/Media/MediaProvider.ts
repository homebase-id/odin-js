import {ProviderBase, ProviderOptions} from "../ProviderBase";

class MediaProviderXX extends ProviderBase {

    constructor(options: ProviderOptions) {
        super({
            appId: options.appId,
            api: options.api,
            sharedSecret: options.sharedSecret
        });
    }

    //gets the data available for the specified attribute if available

}

export function createMediaProviderXX(options: ProviderOptions) {
    return new MediaProviderXX(options);
}