export interface ProfileDefinition {
  profileId: string;
  name: string;
  description: string;
}

export interface ProfileSection {
  sectionId: string;
  name: string;
  priority: number;
  isSystemSection?: boolean;
}

export interface AttributeSpec {
  attributeId: string;
  type: string;
}
