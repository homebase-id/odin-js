import { AccessControlList, SecurityGroupType } from '../../core/core';

export interface AttributeDisplayHash {
  [attributeType: string]: Attribute;
}

export interface Attribute {
  id: string;
  profileId: string;
  type: string;
  priority: number;
  sectionId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | undefined;
}

export type SecurityGroupDefinition = {
  groupType: SecurityGroupType;
  display: string;
  description: string;
};

export type LandingPageLink = {
  id: string;
  index: number;
  title: string;
  href: string;
};

export interface LandingPageLinkFile extends LandingPageLink {
  fileId?: string;
  acl: AccessControlList;
}
