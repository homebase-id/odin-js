# PROFILE Module Documentation

## Overview
The PROFILE module manages user profile data, profile definitions, sections, and attributes.

**All functions verified from actual source code.**

---

## Profile Definitions

- `getProfileDefinitions(dotYouClient)` - Get all profile definitions
- `getProfileDefinition(dotYouClient, profileId)` - Get single profile
- `saveProfileDefinition(dotYouClient, profile)` - Save profile
- `saveProfileSection(dotYouClient, profileId, section)` - Save section
- `removeProfileSection(dotYouClient, profileId, sectionId)` - Remove section
- `removeProfileDefinition(dotYouClient, profileId)` - Remove profile
- `getProfileSections(dotYouClient, profileId)` - Get all sections
- `GetTargetDriveFromProfileId(profileId)` - Convert profile ID to target drive

---

## Profile Configuration

- `ProfileConfig` class - Profile configuration constants
- `BuiltInProfiles` class - Built-in profile types
- `MinimalProfileFields` class - Minimal profile fields
- `LinkFields` class - Link field definitions
- `LocationFields` class - Location field definitions
- `NicknameFields` class - Nickname field definitions
- `BirthdayFields` class - Birthday field definitions
- `PhoneFields` class - Phone field definitions
- `EmailFields` class - Email field definitions
- `CredictCardFields` class - Credit card field definitions
- `SocialFields` class - Social media field definitions
- `UNLINKABLE_SOCIALS` - Array of non-linkable social platforms
- `getSocialLink(type, username)` - Generate social media link

---

## Profile Types

- `ProfileDefinition` interface
- `ProfileSection` interface
- `AttributeSpec` interface

---

## Attribute Data

- `getProfileAttributes(dotYouClient, odinId, profileId?)` - Get attributes
- `getProfileAttribute(dotYouClient, odinId, profileId, attributeId)` - Get single attribute
- `homebaseFileToProfileAttribute(dotYouClient, file)` - Convert file to attribute

### Attribute Configuration
- `AttributeConfig` class
- `sortByPriority(a, b)` - Sort by priority
- `BuiltInAttributes` class - Built-in attribute types

### Attribute Types
- `AttributeDisplayHash` interface
- `Attribute` interface
- `SecurityGroupDefinition` type
- `LandingPageLink` type
- `LandingPageLinkFile` interface

---

All exports verified from `packages/libs/js-lib/src/profile/`.
