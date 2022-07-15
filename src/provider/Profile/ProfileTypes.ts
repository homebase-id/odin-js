export interface ProfileDefinition {
    profileId: string
    name: string,
    description: string,
    sections: ProfileSection[]
}

export interface ProfileSection {
    sectionId: string
    name: string
    attributes: AttributeSpec[],
    priority: number,
    isSystemSection?: boolean
}

export interface AttributeSpec {
    attributeId: string,
    type: string
}