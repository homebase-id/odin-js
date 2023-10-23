import { lazy } from 'react';
import { HomePageAttributes } from '@youfoundation/js-lib/public';
import {
  BirthdayFields,
  BuiltInAttributes,
  CredictCardFields,
  EmailFields,
  GetTargetDriveFromProfileId,
  LinkFields,
  LocationFields,
  MinimalProfileFields,
  NicknameFields,
  PhoneFields,
  SocialFields,
} from '@youfoundation/js-lib/profile';
import { ClipboardEventHandler, useState } from 'react';
import { t } from '@youfoundation/common-app';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { AsYouType } from 'libphonenumber-js';

import { ImageSelector } from '@youfoundation/common-app';
import { EmbeddedThumb, ThumbnailInstruction } from '@youfoundation/js-lib/core';
import { generateDisplayLocation, generateDisplayName } from '@youfoundation/js-lib/helpers';
import { ThemeAttributeEditor } from './ThemeAttributeEditor';
const RichTextEditor = lazy(() =>
  import('@youfoundation/rich-text-editor').then((m) => ({ default: m.RichTextEditor }))
);

const profileInstructionThumbSizes: ThumbnailInstruction[] = [
  { quality: 85, width: 250, height: 250 },
  { quality: 75, width: 600, height: 600 },
];

const AttributeFields = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: {
    target: { value: unknown; name: string; previewThumbnail?: EmbeddedThumb };
  }) => void;
}) => {
  switch (attribute.type) {
    case BuiltInAttributes.Name:
      return <NameAttributeEditor attribute={attribute} onChange={onChange} />;
      break;
    case BuiltInAttributes.Status:
      return (
        <div className="mb-5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-status`}>{t('Status')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-status`}
            name={MinimalProfileFields.Status}
            defaultValue={attribute.data?.[MinimalProfileFields.Status] ?? ''}
            onChange={onChange}
          />
        </div>
      );
      break;
    case BuiltInAttributes.Nickname:
      return (
        <div className="mb-5 w-2/5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-nickName`}>{t('Nickname')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-nickName`}
            name={NicknameFields.NickName}
            defaultValue={attribute.data?.[NicknameFields.NickName] ?? ''}
            onChange={onChange}
          />
        </div>
      );
      break;
    case BuiltInAttributes.Address:
      return <LocationAttributeEditor attribute={attribute} onChange={onChange} />;
      break;
    case BuiltInAttributes.Birthday:
      return (
        <div className="-mx-2 flex flex-row">
          <div className="mb-5 w-2/5 px-2">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-Birthday`}>{t('Birthday')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-Birthday`}
              type="date"
              name={BirthdayFields.Date}
              defaultValue={attribute.data?.[BirthdayFields.Date] ?? ''}
              onChange={onChange}
            />
          </div>
        </div>
      );
      break;
    case BuiltInAttributes.PhoneNumber:
      return <PhoneAttributeEditor attribute={attribute} onChange={onChange} />;
      break;
    case BuiltInAttributes.Email:
      return (
        <div className="-mx-2 flex flex-row">
          <div className="mb-5 w-2/5 px-2">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-Label`}>{t('Label')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-Label`}
              name={EmailFields.Label}
              defaultValue={attribute.data?.[EmailFields.Label] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5 w-3/5 px-2">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-Email`}>{t('Email')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-Email`}
              name={EmailFields.Email}
              defaultValue={attribute.data?.[EmailFields.Email] ?? ''}
              onChange={onChange}
            />
          </div>
        </div>
      );
      break;
    case BuiltInAttributes.Photo:
      return (
        <div className="mb-5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-profileImageId`}>
            {t('Profile Image')}
          </Label>
          <ImageSelector
            id={`${attribute.fileId ?? 'new'}-profileImageId`}
            name={MinimalProfileFields.ProfileImageId}
            defaultValue={attribute.data?.[MinimalProfileFields.ProfileImageId] ?? ''}
            onChange={(e) =>
              onChange({
                target: {
                  name: e.target.name,
                  value: e.target.value?.fileId,
                  previewThumbnail: e.target.value?.previewThumbnail,
                },
              })
            }
            acl={attribute.acl}
            targetDrive={GetTargetDriveFromProfileId(attribute.profileId)}
            expectedAspectRatio={1}
            maxHeight={500}
            maxWidth={500}
            thumbInstructions={profileInstructionThumbSizes}
          />
        </div>
      );
      break;
    case BuiltInAttributes.InstagramUsername:
    case BuiltInAttributes.TiktokUsername:
    case BuiltInAttributes.TwitterUsername:
    case BuiltInAttributes.LinkedinUsername:
    case BuiltInAttributes.FacebookUsername:
    case BuiltInAttributes.YoutubeUsername:
    case BuiltInAttributes.DiscordUsername:
    case BuiltInAttributes.SnapchatUsername:
    case BuiltInAttributes.EpicUsername:
    case BuiltInAttributes.RiotUsername:
    case BuiltInAttributes.SteamUsername:
    case BuiltInAttributes.MinecraftUsername:
    case BuiltInAttributes.GithubUsername:
    case BuiltInAttributes.StackoverflowUsername:
      return <SocialAttributeEditor attribute={attribute} onChange={onChange} />;
      break;
    case BuiltInAttributes.HomebaseIdentity:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-handle`}>
              {attribute.typeDefinition.name}
            </Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-handle`}
              name={SocialFields.Homebase}
              defaultValue={attribute.data?.[SocialFields.Homebase] ?? ''}
              onChange={onChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.Experience:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-title`}>{t('Title')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-experience-title`}
              name={MinimalProfileFields.ExperienceTitleId}
              defaultValue={attribute.data?.[MinimalProfileFields.ExperienceTitleId] ?? ''}
              onChange={onChange}
              placeholder={t('Job, project, life event, etc.')}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-description`}>
              {t('Description')}
            </Label>
            <RichTextEditor
              uniqueId={attribute.fileId}
              name={MinimalProfileFields.ExperienceDecriptionId}
              defaultValue={attribute.data?.[MinimalProfileFields.ExperienceDecriptionId] ?? ''}
              onChange={onChange}
              className="rounded border border-gray-300 px-2 pb-3 dark:border-gray-700"
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-link`}>{t('Link')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-experience-link`}
              name={MinimalProfileFields.ExperienceLinkId}
              defaultValue={attribute.data?.[MinimalProfileFields.ExperienceLinkId] ?? ''}
              onChange={onChange}
              placeholder={t('Link to the project, company, etc.')}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-image`}>{t('Image')}</Label>
            <ImageSelector
              id={`${attribute.fileId ?? 'new'}-experience-image`}
              name={MinimalProfileFields.ExperienceImageFileId}
              defaultValue={attribute.data?.[MinimalProfileFields.ExperienceImageFileId] ?? ''}
              onChange={(e) =>
                onChange({
                  target: {
                    name: e.target.name,
                    value: e.target.value?.fileId,
                    previewThumbnail: e.target.value?.previewThumbnail,
                  },
                })
              }
              acl={attribute.acl}
              targetDrive={GetTargetDriveFromProfileId(attribute.profileId)}
              expectedAspectRatio={1}
              maxHeight={500}
              maxWidth={500}
              thumbInstructions={profileInstructionThumbSizes}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.ShortBio:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-short-bio`}>{t('Bio')}</Label>
            <RichTextEditor
              uniqueId={attribute.fileId}
              name={MinimalProfileFields.ShortBioId}
              defaultValue={attribute.data?.[MinimalProfileFields.ShortBioId] ?? ''}
              onChange={onChange}
              className="rounded border border-gray-300 px-2 pb-3 dark:border-gray-700"
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.Link:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-link-text`}>{t('Text')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-link-text`}
              name={LinkFields.LinkText}
              defaultValue={attribute.data?.[LinkFields.LinkText] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-link-target`}>{t('Target')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-link-target`}
              name={LinkFields.LinkTarget}
              defaultValue={attribute.data?.[LinkFields.LinkTarget] ?? 'https://'}
              onChange={onChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.CreditCard:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-ccalias`}>{t('Alias')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-ccalias`}
              name={CredictCardFields.Alias}
              defaultValue={attribute.data?.[CredictCardFields.Alias] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-ccname`}>{t('Name on Card')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-ccname`}
              name={CredictCardFields.Name}
              defaultValue={attribute.data?.[CredictCardFields.Name] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-ccnumber`}>
              {t('Credit Card Number')}
            </Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-ccnumber`}
              name={CredictCardFields.Number}
              defaultValue={attribute.data?.[CredictCardFields.Number] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="-mx-2 mb-5 flex flex-row">
            <div className="w-1/2 px-2">
              <Label htmlFor={`${attribute.fileId ?? 'new'}-ccexpiration`}>
                {t('Credit Card Expiration')}
              </Label>
              <Input
                id={`${attribute.fileId ?? 'new'}-ccexpiration`}
                name={CredictCardFields.Expiration}
                defaultValue={attribute.data?.[CredictCardFields.Expiration] ?? ''}
                onChange={onChange}
              />
            </div>
            <div className="w-1/2 px-2">
              <Label htmlFor={`${attribute.fileId ?? 'new'}-cccvc`}>{t('Credit Card CVC')}</Label>
              <Input
                id={`${attribute.fileId ?? 'new'}-cccvc`}
                name={CredictCardFields.Cvc}
                defaultValue={attribute.data?.[CredictCardFields.Cvc] ?? ''}
                onChange={onChange}
              />
            </div>
          </div>
        </>
      );
      break;
    case HomePageAttributes.Theme:
      return <ThemeAttributeEditor attribute={attribute} onChange={onChange} />;
      break;
    default:
      return (
        <>
          {Object.keys(attribute.data).map((dataKey) => {
            return (
              <p className="whitespace-pre-line" key={dataKey}>
                {dataKey}: {attribute.data[dataKey]}
              </p>
            );
          })}
        </>
      );
  }
};

const NameAttributeEditor = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const [showMore, setShowMore] = useState(false);

  const displayName = generateDisplayName(
    attribute.data?.[MinimalProfileFields.GivenNameId],
    attribute.data?.[MinimalProfileFields.SurnameId]
  );

  return (
    <>
      <div className="-mx-2 flex flex-col sm:flex-row">
        <div className="mb-5 px-2 sm:w-2/5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-givenName`}>{t('First name')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-givenName`}
            name={MinimalProfileFields.GivenNameId}
            defaultValue={attribute.data?.[MinimalProfileFields.GivenNameId] ?? ''}
            onChange={onChange}
          />
        </div>
        {showMore ? (
          <div className="mb-5 px-2 sm:w-2/5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-additionalName`}>
              {t('Additional Names')}
            </Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-additionalName`}
              name={MinimalProfileFields.AdditionalName}
              defaultValue={attribute.data?.[MinimalProfileFields.AdditionalName] ?? ''}
              onChange={onChange}
            />
          </div>
        ) : null}
        <div className="mb-5 px-2 sm:w-3/5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-surname`}>{t('Surname')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-surname`}
            name={MinimalProfileFields.SurnameId}
            defaultValue={attribute.data?.[MinimalProfileFields.SurnameId] ?? ''}
            onChange={onChange}
          />
        </div>
      </div>
      {showMore ? (
        <div className="mb-5 mt-5 border-t pt-5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-displayName`}>{t('Display name')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-displayName`}
            name={MinimalProfileFields.ExplicitDisplayName}
            placeholder={displayName}
            defaultValue={attribute.data?.[MinimalProfileFields.ExplicitDisplayName]}
            onChange={onChange}
          />
        </div>
      ) : null}
      <button onClick={() => setShowMore(!showMore)} className="text-indigo-500">
        {showMore ? 'Show less' : 'Show more'}
      </button>
    </>
  );
};

const LocationAttributeEditor = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const [showMore, setShowMore] = useState(false);

  const displayLocation = generateDisplayLocation(
    attribute.data?.[LocationFields.AddressLine1],
    attribute.data?.[LocationFields.AddressLine2],
    attribute.data?.[LocationFields.Postcode],
    attribute.data?.[LocationFields.City],
    attribute.data?.[LocationFields.Country]
  );

  return (
    <>
      <div className="mb-5 w-2/5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-Label`}>{t('Label')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-Label`}
          name={LocationFields.Label}
          defaultValue={attribute.data?.[LocationFields.Label] ?? ''}
          onChange={onChange}
        />
      </div>
      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-addressLine1`}>{t('Street address')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-addressLine1`}
          name={LocationFields.AddressLine1}
          defaultValue={attribute.data?.[LocationFields.AddressLine1] ?? ''}
          onChange={onChange}
        />
      </div>
      {showMore ? (
        <div className="mb-5">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-addressLine2`}>
            {t('Street address line 2')}
          </Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-addressLine2`}
            name={LocationFields.AddressLine2}
            defaultValue={attribute.data?.[LocationFields.AddressLine2] ?? ''}
            onChange={onChange}
          />
        </div>
      ) : null}
      <div className="flex-rox -mx-2 mb-5 flex">
        <div className="w-2/5 px-2">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-Postcode`}>{t('Postcode')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-Postcode`}
            name={LocationFields.Postcode}
            defaultValue={attribute.data?.[LocationFields.Postcode] ?? ''}
            onChange={onChange}
          />
        </div>
        <div className="w-3/5 px-2">
          <Label htmlFor={`${attribute.fileId ?? 'new'}-City`}>{t('City')}</Label>
          <Input
            id={`${attribute.fileId ?? 'new'}-City`}
            name={LocationFields.City}
            defaultValue={attribute.data?.[LocationFields.City] ?? ''}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-Country`}>{t('Country')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-Country`}
          name={LocationFields.Country}
          defaultValue={attribute.data?.[LocationFields.Country] ?? ''}
          onChange={onChange}
        />
      </div>
      {showMore ? (
        <>
          <hr className="mb-5" />
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-DisplayLocation`}>
              {t('Display Location')}
            </Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-DisplayLocation`}
              name={LocationFields.DisplayLocation}
              placeholder={displayLocation}
              defaultValue={attribute.data?.[LocationFields.DisplayLocation] ?? ''}
              onChange={onChange}
            />
          </div>
        </>
      ) : null}
      {/* {showMore ? (
        <>
          <hr className="mb-5" />
          <div className="mb-5">
            <Label htmlFor={`${attribute.fileId ?? 'new'}-Coordinates`}>{t('Coordinates')}</Label>
            <Input
              id={`${attribute.fileId ?? 'new'}-Coordinates`}
              name={LocationFields.Coordinates}
              defaultValue={attribute.data?.[LocationFields.Coordinates] ?? ''}
              onChange={onChange}
            />
          </div>
        </>
      ) : null} */}
      <button onClick={() => setShowMore(!showMore)} className="text-indigo-500">
        {showMore ? 'Show less' : 'Show more'}
      </button>
    </>
  );
};

const PhoneAttributeEditor = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  return (
    <div className="-mx-2 flex flex-row">
      <div className="mb-5 w-2/5 px-2">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-Label`}>{t('Label')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-Label`}
          name={PhoneFields.Label}
          defaultValue={attribute.data?.[PhoneFields.Label] ?? ''}
          onChange={onChange}
        />
      </div>
      <div className="mb-5 w-3/5 px-2">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-Phone`}>{t('Phone')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-Phone`}
          name={PhoneFields.PhoneNumber}
          defaultValue={attribute.data?.[PhoneFields.PhoneNumber] ?? ''}
          onChange={onChange}
          onKeyDown={(e) => (e.currentTarget.value = new AsYouType().input(e.currentTarget.value))} // Phone number formatting with: https://github.com/catamphetamine/libphonenumber-js
        />
      </div>
    </div>
  );
};

const SocialAttributeEditor = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  // When a URL is paste, only use the last part of it, as it's most likely the username; And we don't support url values either...
  const pasteHandler: ClipboardEventHandler<HTMLInputElement> = (e) => {
    const text = e.clipboardData.getData('text');

    if (text.startsWith('https://')) {
      const lastPart = text.split('/').pop();
      if (lastPart && lastPart.length > 0) {
        e.currentTarget.value = lastPart;
        onChange({ target: { name: e.currentTarget.name, value: lastPart } });
        e.preventDefault();
      }
    }
  };

  return (
    <>
      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-handle`}>
          {attribute.typeDefinition.name} {t('Username')}
        </Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-handle`}
          name={attribute.typeDefinition.name.toLowerCase()}
          defaultValue={attribute.data?.[attribute.typeDefinition.name.toLowerCase()] ?? ''}
          onChange={onChange}
          onPaste={pasteHandler}
        />
      </div>
    </>
  );
};

export default AttributeFields;
