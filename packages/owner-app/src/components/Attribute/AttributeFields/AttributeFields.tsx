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
import { debounce } from 'lodash-es';
import { useMemo, useState } from 'react';
import { Textarea, t } from '@youfoundation/common-app';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { AsYouType } from 'libphonenumber-js';

import ImageSelector from '@youfoundation/common-app/src/form/image/ImageSelector';
import { ThumbnailInstruction } from '@youfoundation/js-lib/core';
import { generateDisplayLocation, generateDisplayName } from '@youfoundation/js-lib/helpers';
import { ThemeAttributeEditor } from './ThemeAttributeEditor';

const profileInstructionThumbSizes: ThumbnailInstruction[] = [
  { quality: 85, width: 250, height: 250 },
  { quality: 75, width: 600, height: 600 },
];

const AttributeFields = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const debouncedChange = useMemo(() => debounce(onChange, 500), [onChange]);

  switch (attribute.type) {
    case BuiltInAttributes.Name:
      return <NameAttributeEditor attribute={attribute} onChange={debouncedChange} />;
      break;
    case BuiltInAttributes.Status:
      return (
        <div className="mb-5">
          <Label htmlFor="status">{t('Status')}</Label>
          <Input
            id="status"
            name={MinimalProfileFields.Status}
            defaultValue={attribute.data?.[MinimalProfileFields.Status] ?? ''}
            onChange={debouncedChange}
          />
        </div>
      );
      break;
    case BuiltInAttributes.Nickname:
      return (
        <div className="mb-5 w-2/5">
          <Label htmlFor="nickName">{t('Nickname')}</Label>
          <Input
            id="nickName"
            name={NicknameFields.NickName}
            defaultValue={attribute.data?.[NicknameFields.NickName] ?? ''}
            onChange={debouncedChange}
          />
        </div>
      );
      break;
    case BuiltInAttributes.Address:
      return <LocationAttributeEditor attribute={attribute} onChange={debouncedChange} />;
      break;
    case BuiltInAttributes.Birthday:
      return (
        <div className="-mx-2 flex flex-row">
          <div className="mb-5 w-2/5 px-2">
            <Label htmlFor="Birthday">{t('Birthday')}</Label>
            <Input
              id="Birthday"
              type="date"
              name={BirthdayFields.Date}
              defaultValue={attribute.data?.[BirthdayFields.Date] ?? ''}
              onChange={debouncedChange}
            />
          </div>
        </div>
      );
      break;
    case BuiltInAttributes.PhoneNumber:
      return <PhoneAttributeEditor attribute={attribute} onChange={debouncedChange} />;
      break;
    case BuiltInAttributes.Email:
      return (
        <div className="-mx-2 flex flex-row">
          <div className="mb-5 w-2/5 px-2">
            <Label htmlFor="Label">{t('Label')}</Label>
            <Input
              id="Label"
              name={EmailFields.Label}
              defaultValue={attribute.data?.[EmailFields.Label] ?? ''}
              onChange={debouncedChange}
            />
          </div>
          <div className="mb-5 w-3/5 px-2">
            <Label htmlFor="Email">{t('Email')}</Label>
            <Input
              id="Email"
              name={EmailFields.Email}
              defaultValue={attribute.data?.[EmailFields.Email] ?? ''}
              onChange={debouncedChange}
            />
          </div>
        </div>
      );
      break;
    case BuiltInAttributes.Photo:
      return (
        <div className="mb-5">
          <Label htmlFor="profileImageId">{t('Profile Image')}</Label>
          <ImageSelector
            id="profileImageId"
            name={MinimalProfileFields.ProfileImageId}
            defaultValue={attribute.data?.[MinimalProfileFields.ProfileImageId] ?? ''}
            onChange={(e) =>
              onChange({ target: { name: e.target.name, value: e.target.value?.fileId } })
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
    case BuiltInAttributes.EpicUsername:
    case BuiltInAttributes.RiotUsername:
    case BuiltInAttributes.SteamUsername:
    case BuiltInAttributes.MinecraftUsername:
    case BuiltInAttributes.GithubUsername:
    case BuiltInAttributes.StackoverflowUsername:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor="handle">
              {attribute.typeDefinition.name} {t('Username')}
            </Label>
            <Input
              id="handle"
              name={attribute.typeDefinition.name.toLowerCase()}
              defaultValue={attribute.data?.[attribute.typeDefinition.name.toLowerCase()] ?? ''}
              onChange={debouncedChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.HomebaseIdentity:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor="handle">{attribute.typeDefinition.name}</Label>
            <Input
              id="handle"
              name={SocialFields.Homebase}
              defaultValue={attribute.data?.[SocialFields.Homebase] ?? ''}
              onChange={debouncedChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.FullBio:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor="short-bio">{t('Bio')}</Label>
            <Input
              id="short-bio"
              name={MinimalProfileFields.ShortBioId}
              defaultValue={attribute.data?.[MinimalProfileFields.ShortBioId] ?? ''}
              onChange={debouncedChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="full-bio">{t('Full bio')}</Label>
            <Textarea
              id="full-bio"
              name={MinimalProfileFields.FullBioId}
              defaultValue={attribute.data?.[MinimalProfileFields.FullBioId] ?? ''}
              onChange={debouncedChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.ShortBio:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor="short-bio">{t('Bio')}</Label>
            <Input
              id="short-bio"
              name={MinimalProfileFields.ShortBioId}
              defaultValue={attribute.data?.[MinimalProfileFields.ShortBioId] ?? ''}
              onChange={debouncedChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.Link:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor="link-text">{t('Text')}</Label>
            <Input
              id="link-text"
              name={LinkFields.LinkText}
              defaultValue={attribute.data?.[LinkFields.LinkText] ?? ''}
              onChange={debouncedChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="link-target">{t('Target')}</Label>
            <Input
              id="link-target"
              name={LinkFields.LinkTarget}
              defaultValue={attribute.data?.[LinkFields.LinkTarget] ?? 'https://'}
              onChange={debouncedChange}
            />
          </div>
        </>
      );
      break;
    case BuiltInAttributes.CreditCard:
      return (
        <>
          <div className="mb-5">
            <Label htmlFor="cc-alias">{t('Alias')}</Label>
            <Input
              id="cc-alias"
              name={CredictCardFields.Alias}
              defaultValue={attribute.data?.[CredictCardFields.Alias] ?? ''}
              onChange={debouncedChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="cc-name">{t('Name on Card')}</Label>
            <Input
              id="cc-name"
              name={CredictCardFields.Name}
              defaultValue={attribute.data?.[CredictCardFields.Name] ?? ''}
              onChange={debouncedChange}
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="cc-number">{t('Credit Card Number')}</Label>
            <Input
              id="cc-number"
              name={CredictCardFields.Number}
              defaultValue={attribute.data?.[CredictCardFields.Number] ?? ''}
              onChange={debouncedChange}
            />
          </div>
          <div className="-mx-2 mb-5 flex flex-row">
            <div className="w-1/2 px-2">
              <Label htmlFor="cc-expiration">{t('Credit Card Expiration')}</Label>
              <Input
                id="cc-expiration"
                name={CredictCardFields.Expiration}
                defaultValue={attribute.data?.[CredictCardFields.Expiration] ?? ''}
                onChange={debouncedChange}
              />
            </div>
            <div className="w-1/2 px-2">
              <Label htmlFor="cc-cvc">{t('Credit Card CVC')}</Label>
              <Input
                id="cc-cvc"
                name={CredictCardFields.Cvc}
                defaultValue={attribute.data?.[CredictCardFields.Cvc] ?? ''}
                onChange={debouncedChange}
              />
            </div>
          </div>
        </>
      );
      break;
    case HomePageAttributes.Theme:
      return <ThemeAttributeEditor attribute={attribute} onChange={debouncedChange} />;
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
          <Label htmlFor="givenName">{t('First name')}</Label>
          <Input
            id="givenName"
            name={MinimalProfileFields.GivenNameId}
            defaultValue={attribute.data?.[MinimalProfileFields.GivenNameId] ?? ''}
            onChange={onChange}
          />
        </div>
        {showMore ? (
          <div className="mb-5 px-2 sm:w-2/5">
            <Label htmlFor="additionalName">{t('Additional Names')}</Label>
            <Input
              id="additionalName"
              name={MinimalProfileFields.AdditionalName}
              defaultValue={attribute.data?.[MinimalProfileFields.AdditionalName] ?? ''}
              onChange={onChange}
            />
          </div>
        ) : null}
        <div className="mb-5 px-2 sm:w-3/5">
          <Label htmlFor="surname">{t('Surname')}</Label>
          <Input
            id="surname"
            name={MinimalProfileFields.SurnameId}
            defaultValue={attribute.data?.[MinimalProfileFields.SurnameId] ?? ''}
            onChange={onChange}
          />
        </div>
      </div>
      {showMore ? (
        <div className="mb-5 mt-5 border-t pt-5">
          <Label htmlFor="displayName">{t('Display name')}</Label>
          <Input
            id="displayName"
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
        <Label htmlFor="Label">{t('Label')}</Label>
        <Input
          id="Label"
          name={LocationFields.Label}
          defaultValue={attribute.data?.[LocationFields.Label] ?? ''}
          onChange={onChange}
        />
      </div>
      <div className="mb-5">
        <Label htmlFor="addressLine1">{t('Street address')}</Label>
        <Input
          id="addressLine1"
          name={LocationFields.AddressLine1}
          defaultValue={attribute.data?.[LocationFields.AddressLine1] ?? ''}
          onChange={onChange}
        />
      </div>
      {showMore ? (
        <div className="mb-5">
          <Label htmlFor="addressLine2">{t('Street address line 2')}</Label>
          <Input
            id="addressLine2"
            name={LocationFields.AddressLine2}
            defaultValue={attribute.data?.[LocationFields.AddressLine2] ?? ''}
            onChange={onChange}
          />
        </div>
      ) : null}
      <div className="flex-rox -mx-2 mb-5 flex">
        <div className="w-2/5 px-2">
          <Label htmlFor="Postcode">{t('Postcode')}</Label>
          <Input
            id="Postcode"
            name={LocationFields.Postcode}
            defaultValue={attribute.data?.[LocationFields.Postcode] ?? ''}
            onChange={onChange}
          />
        </div>
        <div className="w-3/5 px-2">
          <Label htmlFor="City">{t('City')}</Label>
          <Input
            id="City"
            name={LocationFields.City}
            defaultValue={attribute.data?.[LocationFields.City] ?? ''}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="mb-5">
        <Label htmlFor="Country">{t('Country')}</Label>
        <Input
          id="Country"
          name={LocationFields.Country}
          defaultValue={attribute.data?.[LocationFields.Country] ?? ''}
          onChange={onChange}
        />
      </div>
      {showMore ? (
        <>
          <hr className="mb-5" />
          <div className="mb-5">
            <Label htmlFor="DisplayLocation">{t('Display Location')}</Label>
            <Input
              id="DisplayLocation"
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
            <Label htmlFor="Coordinates">{t('Coordinates')}</Label>
            <Input
              id="Coordinates"
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
        <Label htmlFor="Label">{t('Label')}</Label>
        <Input
          id="Label"
          name={PhoneFields.Label}
          defaultValue={attribute.data?.[PhoneFields.Label] ?? ''}
          onChange={onChange}
        />
      </div>
      <div className="mb-5 w-3/5 px-2">
        <Label htmlFor="Phone">{t('Phone')}</Label>
        <Input
          id="Phone"
          name={PhoneFields.PhoneNumber}
          defaultValue={attribute.data?.[PhoneFields.PhoneNumber] ?? ''}
          onChange={onChange}
          onKeyDown={(e) => (e.currentTarget.value = new AsYouType().input(e.currentTarget.value))} // Phone number formatting with: https://github.com/catamphetamine/libphonenumber-js
        />
      </div>
    </div>
  );
};

export default AttributeFields;
