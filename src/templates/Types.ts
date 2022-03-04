import {ProviderOptions} from "@youfoundation/dotyoucore-transit-lib";

export interface TemplateProps {
    options: Omit<ProviderOptions, 'appId'>
}