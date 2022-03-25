import {AttributeData} from "../provider/AttributeData/AttributeDataTypes";

// export function valueOrEmptyS(dictionary: SecureAttributeDictionary | undefined | null, attributeId: string): string {
//
//     if (!dictionary) {
//         return "";
//     }
//    
//     //TODO: need use sort order selection
//    
//     let sg: SecurityGroupType = SecurityGroupType.Anonymous;
//     let dict: SecureAttribute = dictionary[sg];
//     if (dict && dict.content) {
//
//         //@ts-ignore
//         let attrData = dict.content[attributeId];
//         return attrData ?? "";
//     }
//
//     return "";
// }


export function valueOrEmpty(attribute: AttributeData | undefined | null, fieldName: string): string {

    if (!attribute) {
        return "";
    }

    
    let attrData = attribute?.data[fieldName];
    return attrData?.jsonValue ?? "";
}

