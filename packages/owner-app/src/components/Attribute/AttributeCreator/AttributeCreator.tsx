import { useState } from 'react';
import { t } from '@youfoundation/common-app';
import {
  AttributeDefinition,
  AttributeDefinitions,
} from '../../../hooks/profiles/AttributeDefinitions';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { ActionButtonWithOptions } from '@youfoundation/common-app';
import AttributeEditor from '../AttributeEditor/AttributeEditor';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { BuiltInAttributes } from '@youfoundation/js-lib/profile';

const AttributeCreator = ({
  profileId,
  sectionId,
  newPriority,
  excludedTypes,
}: {
  profileId: string;
  sectionId: string;
  newPriority: number;
  excludedTypes?: string[];
}) => {
  const [attribute, setAttribute] = useState<AttributeVm>();
  const [isActive, setIsActive] = useState(false);

  const setType = (typeId: string) => {
    const targetObj = Object.values(AttributeDefinitions).find(
      (curr) => curr.type.toString() === typeId
    ) as AttributeDefinition;

    setAttribute({
      id: getNewId(),
      type: typeId,
      sectionId: sectionId,
      priority: newPriority,
      isNew: true,
      data: {},
      typeDefinition: targetObj,
      profileId: profileId,
      acl: undefined,
    } as unknown as AttributeVm);
  };

  const discard = () => {
    setIsActive(false);
    setAttribute(undefined);
  };

  const options = Object.values(AttributeDefinitions)
    .filter((def) => !excludedTypes?.some((exclude) => exclude === def.type))
    .map((def) => {
      return {
        value: def.type.toString(),
        name: def.name,
        group: [...BuiltInAttributes.AllSocial, BuiltInAttributes.Link].includes(def.type)
          ? t('Link')
          : [
              BuiltInAttributes.Name,
              BuiltInAttributes.Photo,
              BuiltInAttributes.Address,
              BuiltInAttributes.Birthday,
              BuiltInAttributes.PhoneNumber,
              BuiltInAttributes.Email,
              BuiltInAttributes.Nickname,
              BuiltInAttributes.Status,
            ].includes(def.type)
          ? t('Details')
          : [BuiltInAttributes.FullBio, BuiltInAttributes.ShortBio].includes(def.type)
          ? t('Bio')
          : [BuiltInAttributes.CreditCard].includes(def.type)
          ? t('Wallet')
          : BuiltInAttributes.AllGames.includes(def.type)
          ? t('Games')
          : '',
      };
    });

  return (
    <>
      {isActive && attribute ? (
        <AttributeEditor
          attribute={attribute}
          className="mb-2 mt-5"
          onCancel={discard}
          onSave={discard}
        />
      ) : (
        <div className="flex flex-row">
          <ActionButtonWithOptions
            type="primary"
            className="mx-auto"
            onClick={(type) => {
              type && setType(type);
              setIsActive(true);
            }}
            options={options}
          >
            {t('Add Attribute')}
          </ActionButtonWithOptions>
        </div>
      )}
    </>
  );
};

export default AttributeCreator;
