import { slugify, getNewId } from '@youfoundation/js-lib/helpers';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import {
  AttributeDefinition,
  AttributeDefinitions,
} from '../../../hooks/profiles/AttributeDefinitions';
import {
  useAttributeOrderer,
  GroupedAttributes,
} from '../../../hooks/profiles/useAttributeOrderer';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { Collapse, Plus } from '@youfoundation/common-app';
import AttributeEditor from '../AttributeEditor/AttributeEditor';
import { HomebaseFile, NewHomebaseFile } from '@youfoundation/js-lib/core';

const AttributeGroup = ({
  attributes,
  groupTitle,
  groupIndex,
  groupedAttributes,
}: {
  attributes: HomebaseFile<AttributeVm>[];
  groupTitle: string;
  groupIndex: number;
  groupedAttributes?: GroupedAttributes[];
}) => {
  const firstAttrVm = attributes[0].fileMetadata.appData.content;

  const { profileKey, sectionKey, typeKey } = useParams();
  const [isActive, setIsActive] = useState(
    attributes.length === 1 || slugify(groupTitle) === typeKey
  );
  const { reorderAttr } = useAttributeOrderer({
    currentGroupAttributes: attributes,
    groupedAttributes: groupedAttributes ? groupedAttributes : [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (slugify(groupTitle) === typeKey) setIsActive(true);
    else setIsActive(false);
  }, [typeKey]);

  const doOpen = () => {
    if (!isActive) {
      if (profileKey) {
        navigate(
          `/owner/profile/${profileKey}/${sectionKey ?? firstAttrVm.sectionId}/${slugify(
            groupTitle
          )}`,
          {
            replace: true,
          }
        );
      }
      setIsActive(true);
    }
  };

  const doClose = () => {
    if (profileKey) {
      navigate(`/owner/profile/${profileKey}/${sectionKey ?? firstAttrVm.sectionId}`, {
        replace: true,
      });
    }

    setIsActive(false);
  };

  if (attributes.length === 1)
    return (
      <>
        <div className={`relative mb-3 pt-6`}>
          <AttributeEditor
            attribute={attributes[0]}
            orderAttrUp={groupIndex === 0 ? undefined : () => reorderAttr(attributes[0], -1)}
            orderAttrDown={
              groupedAttributes && groupIndex === groupedAttributes?.length - 1
                ? undefined
                : () => reorderAttr(attributes[0], 1)
            }
            className="mb-2 mt-2"
          />
          <AddAnotherButton
            profileId={firstAttrVm.profileId}
            sectionId={firstAttrVm.sectionId}
            type={firstAttrVm.type}
            priority={firstAttrVm.priority + 10}
          />
        </div>
      </>
    );

  return (
    <div
      className={`relative mb-3 overflow-x-hidden sm:overflow-x-visible ${
        !isActive ? 'cursor-pointer transition-transform' : ''
      }`}
      onClick={doOpen}
      style={{ paddingBottom: `${(attributes.length - 1) * 0.5}rem` }}
    >
      <span
        onClick={doClose}
        className={`mb-2 inline-block text-slate-600 transition-opacity dark:text-slate-400 ${
          isActive ? 'cursor-pointer opacity-100' : 'opacity-0'
        }`}
      >
        <Collapse className={`inline-block h-5 w-5`} /> {t('Collapse')}
      </span>
      <div
        className={`border-l-[8px] sm:border-l-[16px] ${
          isActive
            ? 'border-slate-200 border-opacity-40 dark:border-slate-800'
            : ' border-transparent opacity-90 grayscale hover:border-slate-200 hover:border-opacity-40 hover:dark:border-slate-800'
        } transition-all ${
          isActive ? 'pl-2 sm:pl-5' : '-translate-x-2 md:-translate-x-4 md:hover:translate-x-0'
        }`}
      >
        {/* Sort again, as the normal order of the attributes takes the ACL into account, which the user can't "change" */}
        {attributes
          .sort(
            (a, b) =>
              a.fileMetadata.appData.content.priority - b.fileMetadata.appData.content.priority
          )
          .map((attr, index) => {
            return (
              <React.Fragment key={attr.fileMetadata.appData.content.id ?? 'pending'}>
                <span
                  key={attr.fileMetadata.appData.content.id ?? 'pending'}
                  title={attr.fileMetadata.appData.content.id ?? 'pending'}
                  className={`block rounded-lg bg-white shadow-slate-50 dark:border-gray-700 dark:bg-slate-900 ${
                    !isActive && index !== 0 ? `absolute` : 'relative z-10'
                  }`}
                  style={
                    index === 0 || isActive
                      ? undefined
                      : {
                          top: `${index * 0.5}rem`,
                          bottom: `${index * -0.5}rem`,
                          left: `${index * 0.5}rem`,
                          right: `${index * -0.5}rem`,
                          zIndex: 5 - index,
                          opacity: 1 - 0.3 * index,
                        }
                  }
                >
                  <AttributeEditor
                    attribute={attr}
                    className={`${
                      !isActive
                        ? 'pointer-events-none my-0 max-h-full overflow-hidden'
                        : 'mb-2 mt-0'
                    }`}
                    orderAttrUp={
                      index === 0 && groupIndex === 0 ? undefined : () => reorderAttr(attr, -1)
                    }
                    orderAttrDown={
                      groupedAttributes && groupIndex === groupedAttributes?.length - 1
                        ? undefined
                        : () => reorderAttr(attr, 1)
                    }
                  />
                </span>
                {isActive && (
                  <AddAnotherButton
                    profileId={firstAttrVm.profileId}
                    sectionId={firstAttrVm.sectionId}
                    type={firstAttrVm.type}
                    priority={attr.fileMetadata.appData.content.priority + 10}
                  />
                )}
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
};

const AddAnotherButton = ({
  type,
  profileId,
  sectionId,
  priority,
}: {
  type: string;
  profileId: string;
  sectionId: string;
  priority: number;
}) => {
  const [isActive, setIsActive] = useState(false);
  const newAttr = useMemo(() => {
    return {
      fileMetadata: {
        appData: {
          content: {
            id: getNewId(),
            type: type,
            sectionId: sectionId,
            priority: priority,
            data: {},
            typeDefinition: Object.values(AttributeDefinitions).find(
              (curr) => curr.type === type
            ) as AttributeDefinition,
            profileId: profileId,
          },
        },
      },
    } as NewHomebaseFile<AttributeVm>;
    // isActive ensures that a new one is created each time the AddAnother is opened up again
  }, [type, profileId, sectionId, priority, isActive]);

  if (isActive)
    return (
      <AttributeEditor
        attribute={newAttr}
        className="my-5"
        onCancel={() => setIsActive(false)}
        onSave={() => setIsActive(false)}
      />
    );

  return (
    <div className="relative z-10 mb-2 mt-[-1.6rem] flex text-slate-500 transition-colors hover:text-slate-800 hover:dark:text-slate-100">
      <span
        className="relative mx-auto flex cursor-pointer flex-row items-center gap-1 rounded-full border bg-white transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 hover:dark:bg-slate-800"
        onClick={() => setIsActive(true)}
      >
        <Plus className="m-2 h-5 w-5" />
      </span>
    </div>
  );
};

export default AttributeGroup;
