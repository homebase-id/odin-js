import { AccessControlList, SecurityGroupType } from '../TransitData/TransitTypes';

export interface AttributeFile extends Attribute {
  fileId?: string;
  acl: AccessControlList;
}

export interface AttributeDisplayHash {
  [attributeType: string]: Attribute;
}

export interface Attribute {
  id: string;
  profileId: string;
  type: string;
  priority: number;
  sectionId: string;
  data: any;
}

export type OrderedAttributeList = {
  profileId: string;
  attributeType: string;
  versions: Attribute[];
};

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
