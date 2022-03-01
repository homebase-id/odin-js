import {Guid} from "guid-typescript";
import {SecurityGroupType} from "../TransitTypes";
import {SecuredFileContent} from "../DriveTypes";

export interface Profile {
    id: string,
    display: string
}

export interface Attribute {
    id: string,
    data: FieldDictionary
}

type FieldDictionary = { [name: string]: Field }

export interface Field {
    id: string,
    jsonValue: string
}

export type SecureAttributeDictionary = { [name in SecurityGroupType]: SecureAttribute }

export interface SecureAttribute extends SecuredFileContent<Attribute> {
    driveId: Guid,
    attributeId: Guid
}

export const defaultSecureAttribute: SecureAttribute = {
    driveId: null,
    attributeId: null,
    fileId: null,
    content: {
        id: "",
        data: {}
    },
    tags: [],
    accessControlList: {
        requiredSecurityGroup: SecurityGroupType.Anonymous,
        dotYouIdentityList: [],
        circleId: ""
    }
}

export type SecurityGroupDefinition = {
    groupType: SecurityGroupType,
    display: string,
    description: string
}

export const fixAttribute = (id: Guid) => {
    return "a_" + id.toString().replace(/-/g, "").toLowerCase() + "";
}

export type LandingPageLink = {
    index: number,
    title: string,
    href: string,
}