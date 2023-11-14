import { useState } from 'react';
import { t } from '@youfoundation/common-app';
import {
  AttributeGroups,
  AttributeDefinition,
  AttributeDefinitions,
} from '../../../hooks/profiles/AttributeDefinitions';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import AttributeEditor from '../AttributeEditor/AttributeEditor';
import { getNewId } from '@youfoundation/js-lib/helpers';
import { BuiltInProfiles } from '@youfoundation/js-lib/profile';
import { NewDriveSearchResult } from '@youfoundation/js-lib/core';

const getAllowedAttributes = (sectionId: string) => {
  if (sectionId === BuiltInProfiles.PersonalInfoSectionId)
    return Object.values(AttributeDefinitions).filter((def) =>
      AttributeGroups.PersonalInfoSectionAttributes.includes(def.type)
    );
  if (sectionId === BuiltInProfiles.ExternalLinksSectionId)
    return Object.values(AttributeDefinitions).filter((def) =>
      AttributeGroups.ExternalLinksSectionAttributes.includes(def.type)
    );
  if (sectionId === BuiltInProfiles.AboutSectionId)
    return Object.values(AttributeDefinitions).filter((def) =>
      AttributeGroups.AboutSectionAttributes.includes(def.type)
    );

  if (sectionId === BuiltInProfiles.CreditCardsSectionId)
    return Object.values(AttributeDefinitions).filter((def) =>
      AttributeGroups.CreditCardSectionAttributes.includes(def.type)
    );

  return Object.values(AttributeDefinitions);
};

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
  const [attribute, setAttribute] = useState<NewDriveSearchResult<AttributeVm>>();
  const [isActive, setIsActive] = useState(false);
  const alloweddAttributes = getAllowedAttributes(sectionId);

  const setType = (typeId: string) => {
    const targetObj = alloweddAttributes.find(
      (curr) => curr.type.toString() === typeId
    ) as AttributeDefinition;

    setAttribute({
      fileMetaData: {
        appData: {
          content: {
            id: getNewId(),
            type: typeId,
            sectionId: sectionId,
            priority: newPriority,
            data: {},
            typeDefinition: targetObj,
            profileId: profileId,
          },
        },
      },
    } as unknown as NewDriveSearchResult<AttributeVm>);
  };

  const discard = () => {
    setIsActive(false);
    setAttribute(undefined);
  };

  const onSelect = (type: string) => {
    type && setType(type);
    setIsActive(true);
  };

  return (
    <section className="pb-16">
      {isActive && attribute ? (
        <AttributeEditor
          attribute={attribute}
          className="mb-2 mt-5"
          onCancel={discard}
          onSave={discard}
        />
      ) : (
        <>
          <p className="mb-5 text-xl">
            {t('Add new')}
            <small className="block text-sm text-slate-400">
              {t(`Add the information you want, and keep it secure. You're in control.`)}
            </small>
          </p>
          <div className="flex flex-row flex-wrap gap-4">
            {alloweddAttributes
              .filter((attr) => !excludedTypes?.includes(attr.type))
              .map((option) => (
                <div
                  key={option.name}
                  className={`cursor-pointer rounded-md bg-background p-4 hover:shadow-md hover:dark:shadow-slate-600`}
                  onClick={() => onSelect(option.type)}
                  title={option.description}
                >
                  {option.name}
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  );
};

export default AttributeCreator;
