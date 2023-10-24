import { EmbeddedThumb, AccessControlList, SecurityGroupType } from '../../core/core';

export interface AttributeFile extends Attribute {
  fileId?: string;
  versionTag?: string;
  acl: AccessControlList;
  aclPriority?: number;
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
  previewThumbnail?: EmbeddedThumb;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
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
