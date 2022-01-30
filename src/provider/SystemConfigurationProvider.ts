import {ProviderBase} from "./ProviderBase";

class SystemConfigurationProvider extends ProviderBase {

    constructor(ss: Uint8Array) {
        super(ss);
    }

    async ensureLatestConfiguration(): Promise<boolean> {

        let client = this.createAxiosClient();
        return client.post("/provisioning/systemapps", {withCredentials: true}).then(response => {
            return response.data;
        });
    }

}

export function createSystemConfigurationProvider() {
    return new SystemConfigurationProvider(null);
}