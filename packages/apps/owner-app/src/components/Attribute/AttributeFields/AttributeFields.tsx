import { lazy } from 'react';
import { HomePageAttributes } from '@homebase-id/js-lib/public';
import {
  BirthdayFields,
  BuiltInAttributes,
  CredictCardFields,
  EmailFields,
  LinkFields,
  LocationFields,
  MinimalProfileFields,
  NicknameFields,
  PhoneFields,
  SocialFields,
} from '@homebase-id/js-lib/profile';
import { ClipboardEventHandler, useState } from 'react';
import { t, Textarea } from '@homebase-id/common-app';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { Input } from '@homebase-id/common-app';
import { Label } from '@homebase-id/common-app';
import { AsYouType } from 'libphonenumber-js';

import { generateDisplayLocation, generateDisplayName } from '@homebase-id/js-lib/helpers';
import { ThemeAttributeEditor } from './ThemeAttributeEditor';
import { PhotoAttributeEditor } from './PhotoAttributeEditor';
import { ExperienceAttributeEditor } from './ExperienceAttributeEditor';
const RichTextEditor = lazy(() =>
  import('@homebase-id/rich-text-editor').then((m) => ({ default: m.RichTextEditor }))
);

const AttributeFields = ({
  fileId,
  lastModified,
  attribute,
  onChange,
}: {
  fileId: string | undefined;
  lastModified: number | undefined;
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  switch (attribute.type) {
    case BuiltInAttributes.Name:
      return <NameAttributeEditor attribute={attribute} onChange={onChange} fileId={fileId} />;
      break;
    case BuiltInAttributes.Status:
      return (
        <div className="mb-5">
          <Label htmlFor={`${fileId ?? 'new'}-status`}>{t('Status')}</Label>
          <Input
            id={`${fileId ?? 'new'}-status`}
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
          <Label htmlFor={`${fileId ?? 'new'}-nickName`}>{t('Nickname')}</Label>
          <Input
            id={`${fileId ?? 'new'}-nickName`}
            name={NicknameFields.NickName}
            defaultValue={attribute.data?.[NicknameFields.NickName] ?? ''}
            onChange={onChange}
          />
        </div>
      );
      break;
    case BuiltInAttributes.Address:
      return <LocationAttributeEditor attribute={attribute} onChange={onChange} fileId={fileId} />;
      break;
    case BuiltInAttributes.Birthday:
      return (
        <div className="flex flex-row">
          <div className="mb-5 w-2/5">
            <Label htmlFor={`${fileId ?? 'new'}-Birthday`}>{t('Birthday')}</Label>
            <Input
              id={`${fileId ?? 'new'}-Birthday`}
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
      return <PhoneAttributeEditor attribute={attribute} onChange={onChange} fileId={fileId} />;
      break;
    case BuiltInAttributes.Email:
      return (
        <div className="flex flex-row gap-2">
          <div className="mb-5 w-2/5">
            <Label htmlFor={`${fileId ?? 'new'}-Label`}>{t('Label')}</Label>
            <Input
              id={`${fileId ?? 'new'}-Label`}
              name={EmailFields.Label}
              defaultValue={attribute.data?.[EmailFields.Label] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5 w-3/5">
            <Label htmlFor={`${fileId ?? 'new'}-Email`}>{t('Email')}</Label>
            <Input
              id={`${fileId ?? 'new'}-Email`}
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
        <PhotoAttributeEditor
          attribute={attribute}
          onChange={onChange}
          fileId={fileId}
          lastModified={lastModified}
        />
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
      return <SocialAttributeEditor attribute={attribute} onChange={onChange} fileId={fileId} />;
      break;
    case BuiltInAttributes.HomebaseIdentity:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-handle`}>{attribute.typeDefinition?.name}</Label>
            <Input
              id={`${fileId ?? 'new'}-handle`}
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
        <ExperienceAttributeEditor
          attribute={attribute}
          onChange={onChange}
          fileId={fileId}
          lastModified={lastModified}
        />
      );
      break;
    case BuiltInAttributes.FullBio:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-short-bio`}>{t('Bio')}</Label>
            <RichTextEditor
              uniqueId={fileId}
              name={MinimalProfileFields.BioId}
              defaultValue={attribute.data?.[MinimalProfileFields.BioId] ?? ''}
              onChange={onChange}
              className="rounded border border-gray-300 px-2 pb-3 dark:border-gray-700"
              contentClassName="max-h-[50vh] overflow-auto"
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.BioSummary:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-meta-bio`}>
              {t('Short bio')}{' '}
              <span className="text-sm text-slate-400">({t('Max 160 characters')})</span>
            </Label>
            <Textarea
              maxLength={160}
              name={MinimalProfileFields.BioId}
              defaultValue={attribute.data?.[MinimalProfileFields.BioId] ?? ''}
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
            <Label htmlFor={`${fileId ?? 'new'}-link-text`}>{t('Text')}</Label>
            <Input
              id={`${fileId ?? 'new'}-link-text`}
              name={LinkFields.LinkText}
              defaultValue={attribute.data?.[LinkFields.LinkText] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-link-target`}>{t('Target')}</Label>
            <Input
              id={`${fileId ?? 'new'}-link-target`}
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
            <Label htmlFor={`${fileId ?? 'new'}-ccalias`}>{t('Alias')}</Label>
            <Input
              id={`${fileId ?? 'new'}-ccalias`}
              name={CredictCardFields.Alias}
              defaultValue={attribute.data?.[CredictCardFields.Alias] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-ccname`}>{t('Name on Card')}</Label>
            <Input
              id={`${fileId ?? 'new'}-ccname`}
              name={CredictCardFields.Name}
              defaultValue={attribute.data?.[CredictCardFields.Name] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-ccnumber`}>{t('Credit Card Number')}</Label>
            <Input
              id={`${fileId ?? 'new'}-ccnumber`}
              name={CredictCardFields.Number}
              defaultValue={attribute.data?.[CredictCardFields.Number] ?? ''}
              onChange={onChange}
            />
          </div>
          <div className="mb-5 flex flex-row gap-2">
            <div className="w-1/2">
              <Label htmlFor={`${fileId ?? 'new'}-ccexpiration`}>
                {t('Credit Card Expiration')}
              </Label>
              <Input
                id={`${fileId ?? 'new'}-ccexpiration`}
                name={CredictCardFields.Expiration}
                defaultValue={attribute.data?.[CredictCardFields.Expiration] ?? ''}
                onChange={onChange}
              />
            </div>
            <div className="w-1/2">
              <Label htmlFor={`${fileId ?? 'new'}-cccvc`}>{t('Credit Card CVC')}</Label>
              <Input
                id={`${fileId ?? 'new'}-cccvc`}
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
      return (
        <ThemeAttributeEditor
          attribute={attribute}
          onChange={onChange}
          fileId={fileId}
          lastModified={lastModified}
        />
      );
      break;
    default:
      return (
        <>
          {Object.keys(attribute.data || {}).map((dataKey) => {
            return (
              <p className="whitespace-pre-line" key={dataKey}>
                {dataKey}: {attribute.data?.[dataKey]}
              </p>
            );
          })}
        </>
      );
  }
};

const NameAttributeEditor = ({
  fileId,
  attribute,
  onChange,
}: {
  fileId?: string;
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="mb-5 sm:w-2/5">
          <Label htmlFor={`${fileId ?? 'new'}-givenName`}>{t('First name')}</Label>
          <Input
            id={`${fileId ?? 'new'}-givenName`}
            name={MinimalProfileFields.GivenNameId}
            defaultValue={attribute.data?.[MinimalProfileFields.GivenNameId] ?? ''}
            onChange={onChange}
          />
        </div>
        {showMore ? (
          <div className="mb-5 sm:w-2/5">
            <Label htmlFor={`${fileId ?? 'new'}-additionalName`}>{t('Additional Names')}</Label>
            <Input
              id={`${fileId ?? 'new'}-additionalName`}
              name={MinimalProfileFields.AdditionalName}
              defaultValue={attribute.data?.[MinimalProfileFields.AdditionalName] ?? ''}
              onChange={onChange}
            />
          </div>
        ) : null}
        <div className="mb-5 sm:w-3/5">
          <Label htmlFor={`${fileId ?? 'new'}-surname`}>{t('Surname')}</Label>
          <Input
            id={`${fileId ?? 'new'}-surname`}
            name={MinimalProfileFields.SurnameId}
            defaultValue={attribute.data?.[MinimalProfileFields.SurnameId] ?? ''}
            onChange={onChange}
          />
        </div>
      </div>
      {showMore ? (
        <div className="mb-5 mt-5 border-t pt-5">
          <Label htmlFor={`${fileId ?? 'new'}-displayName`}>{t('Display name')}</Label>
          <Input
            id={`${fileId ?? 'new'}-displayName`}
            name={MinimalProfileFields.ExplicitDisplayName}
            placeholder={displayName}
            defaultValue={attribute.data?.[MinimalProfileFields.ExplicitDisplayName]}
            onChange={onChange}
          />
        </div>
      ) : null}
      <button onClick={() => setShowMore(!showMore)} className="text-primary">
        {showMore ? 'Show less' : 'Show more'}
      </button>
    </>
  );
};

const LocationAttributeEditor = ({
  fileId,
  attribute,
  onChange,
}: {
  fileId?: string;
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
        <Label htmlFor={`${fileId ?? 'new'}-Label`}>{t('Label')}</Label>
        <Input
          id={`${fileId ?? 'new'}-Label`}
          name={LocationFields.Label}
          defaultValue={attribute.data?.[LocationFields.Label] ?? ''}
          onChange={onChange}
        />
      </div>
      <div className="mb-5">
        <Label htmlFor={`${fileId ?? 'new'}-addressLine1`}>{t('Street address')}</Label>
        <Input
          id={`${fileId ?? 'new'}-addressLine1`}
          name={LocationFields.AddressLine1}
          defaultValue={attribute.data?.[LocationFields.AddressLine1] ?? ''}
          onChange={onChange}
        />
      </div>
      {showMore ? (
        <div className="mb-5">
          <Label htmlFor={`${fileId ?? 'new'}-addressLine2`}>{t('Street address line 2')}</Label>
          <Input
            id={`${fileId ?? 'new'}-addressLine2`}
            name={LocationFields.AddressLine2}
            defaultValue={attribute.data?.[LocationFields.AddressLine2] ?? ''}
            onChange={onChange}
          />
        </div>
      ) : null}
      <div className="flex-rox mb-5 flex gap-2">
        <div className="w-2/5">
          <Label htmlFor={`${fileId ?? 'new'}-Postcode`}>{t('Postcode')}</Label>
          <Input
            id={`${fileId ?? 'new'}-Postcode`}
            name={LocationFields.Postcode}
            defaultValue={attribute.data?.[LocationFields.Postcode] ?? ''}
            onChange={onChange}
          />
        </div>
        <div className="w-3/5">
          <Label htmlFor={`${fileId ?? 'new'}-City`}>{t('City')}</Label>
          <Input
            id={`${fileId ?? 'new'}-City`}
            name={LocationFields.City}
            defaultValue={attribute.data?.[LocationFields.City] ?? ''}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="mb-5">
        <Label htmlFor={`${fileId ?? 'new'}-Country`}>{t('Country')}</Label>
        <Input
          id={`${fileId ?? 'new'}-Country`}
          name={LocationFields.Country}
          defaultValue={attribute.data?.[LocationFields.Country] ?? ''}
          onChange={onChange}
        />
      </div>
      {showMore ? (
        <>
          <hr className="mb-5" />
          <div className="mb-5">
            <Label htmlFor={`${fileId ?? 'new'}-DisplayLocation`}>{t('Display Location')}</Label>
            <Input
              id={`${fileId ?? 'new'}-DisplayLocation`}
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
            <Label htmlFor={`${fileId ?? 'new'}-Coordinates`}>{t('Coordinates')}</Label>
            <Input
              id={`${fileId ?? 'new'}-Coordinates`}
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
  fileId,
  attribute,
  onChange,
}: {
  fileId?: string;
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  return (
    <div className="flex flex-row gap-2">
      <div className="mb-5 w-2/5">
        <Label htmlFor={`${fileId ?? 'new'}-Label`}>{t('Label')}</Label>
        <Input
          id={`${fileId ?? 'new'}-Label`}
          name={PhoneFields.Label}
          defaultValue={attribute.data?.[PhoneFields.Label] ?? ''}
          onChange={onChange}
        />
      </div>
      <div className="mb-5 w-3/5">
        <Label htmlFor={`${fileId ?? 'new'}-Phone`}>{t('Phone')}</Label>
        <Input
          id={`${fileId ?? 'new'}-Phone`}
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
  fileId,
  attribute,
  onChange,
}: {
  fileId?: string;
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
        <Label htmlFor={`${fileId ?? 'new'}-handle`}>
          {attribute.typeDefinition?.name} {t('Username')}
        </Label>
        <Input
          id={`${fileId ?? 'new'}-handle`}
          name={attribute.typeDefinition?.name.toLowerCase()}
          defaultValue={attribute.data?.[attribute.typeDefinition?.name.toLowerCase() || ''] ?? ''}
          onChange={onChange}
          onPaste={pasteHandler}
        />
      </div>
    </>
  );
};

export default AttributeFields;
