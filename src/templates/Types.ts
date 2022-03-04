import {ProviderOptions} from "../provider/ProviderBase";

export interface TemplateProps {
    options: Omit<ProviderOptions, 'appId'>
}