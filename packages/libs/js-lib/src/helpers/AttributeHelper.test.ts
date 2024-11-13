import { expect, test } from 'vitest';
import {
  generateDisplayLocation,
  generateDisplayName,
  getDisplayLocationFromLocationAttribute,
  getDisplayNameOfNameAttribute,
  getInitialsOfNameAttribute,
  slugify,
} from './AttributeHelpers';
import { LocationFields, MinimalProfileFields } from '../profile/ProfileData/ProfileConfig';
import { Attribute } from '../profile/AttributeData/AttributeDataTypes';

test('Slugify', () => {
  expect(slugify('test')).toEqual('test');
  expect(slugify('test ABC 123')).toEqual('test-abc-123');
  expect(slugify('test$%^#@!&*')).toEqual('test');
  expect(
    slugify(
      'this is a really long sentence, which would actually to be stupid to use as a slug, but can be done'
    )
  ).toEqual(
    'this-is-a-really-long-sentence-which-would-actually-to-be-stupid-to-use-as-a-slug-but-can-be-done'
  );
});

test('Generate Location Display Name', () => {
  expect(
    generateDisplayLocation('AddressLine1', 'AddressLine2', 'Postcode', 'City', 'Country')
  ).toEqual('AddressLine1, AddressLine2 Postcode City, Country');
  expect(generateDisplayLocation('AddressLine1', '', '', '', '')).toEqual('AddressLine1,');
  expect(generateDisplayLocation('', '', '', '', '')).toEqual('');
});

const _buildLocationAttribute = (
  displayLocation?: string,
  addressLine1?: string,
  addressLine2?: string,
  postcode?: string,
  city?: string,
  country?: string
) => {
  const attr = {
    data: {} as Record<string, unknown>,
  };

  attr.data[LocationFields.DisplayLocation] = displayLocation;
  attr.data[LocationFields.AddressLine1] = addressLine1;
  attr.data[LocationFields.AddressLine2] = addressLine2;
  attr.data[LocationFields.Postcode] = postcode;
  attr.data[LocationFields.City] = city;
  attr.data[LocationFields.Country] = country;

  return attr as Attribute;
};
test('Generate Display Location from Attribute', () => {
  expect(getDisplayLocationFromLocationAttribute(_buildLocationAttribute())).toEqual('');

  expect(
    getDisplayLocationFromLocationAttribute(_buildLocationAttribute('Display Location'))
  ).toEqual('Display Location');

  expect(
    getDisplayLocationFromLocationAttribute(
      _buildLocationAttribute(
        undefined,
        'AddressLine1',
        'AddressLine2',
        'Postcode',
        'City',
        'Country'
      )
    )
  ).toEqual('AddressLine1, AddressLine2 Postcode City, Country');
});

test('Generate Display Name', () => {
  expect(generateDisplayName('First', 'Last')).toEqual('First Last');
  expect(generateDisplayName('', 'Last')).toEqual('Last');
});

const _buildNameAttribute = (
  explicitDisplayName?: string,
  givenNameId?: string,
  surnameId?: string
) => {
  const attr = {
    data: {} as Record<string, unknown>,
  };

  attr.data[MinimalProfileFields.ExplicitDisplayName] = explicitDisplayName;
  attr.data[MinimalProfileFields.GivenNameId] = givenNameId;
  attr.data[MinimalProfileFields.SurnameId] = surnameId;

  return attr as Attribute;
};

test('Generate Display Name from Attribute', () => {
  expect(getDisplayNameOfNameAttribute(_buildNameAttribute('Display Name'))).toEqual(
    'Display Name'
  );
  expect(getDisplayNameOfNameAttribute(_buildNameAttribute(undefined, 'First', 'Last'))).toEqual(
    'First Last'
  );
  expect(getDisplayNameOfNameAttribute(_buildNameAttribute(undefined, 'First'))).toEqual('First');
  expect(getDisplayNameOfNameAttribute(_buildNameAttribute(undefined, undefined, 'Last'))).toEqual(
    'Last'
  );
});

test('Get Initials from Attribute', () => {
  expect(getInitialsOfNameAttribute(_buildNameAttribute(undefined, 'First', 'Last'))).toEqual('FL');
  expect(getInitialsOfNameAttribute(_buildNameAttribute(undefined, 'A', 'B'))).toEqual('AB');
});
