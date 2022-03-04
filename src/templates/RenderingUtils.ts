import {SecureAttribute, SecureAttributeDictionary} from "@youfoundation/dotyoucore-transit-lib";
import {SecurityGroupType} from "@youfoundation/dotyoucore-transit-lib/src/provider/TransitTypes";

export function valueOrEmpty(dictionary: SecureAttributeDictionary | undefined | null, attributeId: string): string {

    if (!dictionary) {
        return "";
    }
    
    //TODO: need use sort order selection
    
    let sg: SecurityGroupType = SecurityGroupType.Anonymous;
    let dict: SecureAttribute = dictionary[sg];
    if (dict && dict.content) {

        //@ts-ignore
        let attrData = dict.content[attributeId];
        return attrData ?? "";
    }

    return "";
}


