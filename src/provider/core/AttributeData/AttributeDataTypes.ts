import { Guid } from 'guid-typescript';
import { AccessControlList, SecurityGroupType } from '../TransitData/TransitTypes';

export interface AttributeFile extends Attribute {
  fileId?: Guid;
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

export const emptyAttribute: Attribute = {
  id: '',
  profileId: '',
  type: '',
  priority: -1,
  sectionId: '',
  data: {},
};

export const emptyAttributeFile: AttributeFile = {
  fileId: Guid.createEmpty(),
  acl: {
    requiredSecurityGroup: SecurityGroupType.Owner,
  },
  ...emptyAttribute,
};

export type OrderedAttributeList = {
  profileId: Guid;
  attributeType: Guid;
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
  fileId?: Guid;
  acl: AccessControlList;
}
