import { getNewId } from '@youfoundation/js-lib/helpers';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { convertTextToSlug } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import {
  AttributeDefinition,
  AttributeDefinitions,
} from '../../../hooks/profiles/AttributeDefinitions';
import useAttributeOrderer, { attributeGroup } from '../../../hooks/profiles/useAttributeOrderer';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { Collapse, Plus } from '@youfoundation/common-app';
import AttributeEditor from '../AttributeEditor/AttributeEditor';

const AttributeGroup = ({
  attributes,
  groupTitle,
  groupedAttributes,
}: {
  attributes: AttributeVm[];
  groupTitle: string;
  groupedAttributes?: attributeGroup[];
}) => {
  const { profileKey, sectionKey, typeKey } = useParams();
  const [isActive, setIsActive] = useState(
    attributes.length === 1 || convertTextToSlug(groupTitle) === typeKey
  );
  const { reorderAttr, reorderAttrGroup } = useAttributeOrderer({
    attributes,
    groupedAttributes: groupedAttributes ? groupedAttributes : [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (convertTextToSlug(groupTitle) === typeKey) setIsActive(true);
    else setIsActive(false);
  }, [typeKey]);

  const open = () => {
    if (!isActive) {
      if (profileKey) {
        navigate(
          `/owner/profile/${profileKey}/${
            sectionKey ?? attributes[0].sectionId
          }/${convertTextToSlug(groupTitle)}`
        );
      }
      setIsActive(true);
    }
  };

  const close = () => {
    if (profileKey) {
      navigate(`/owner/profile/${profileKey}/${sectionKey ?? attributes[0].sectionId}`);
    }
    setIsActive(false);
  };

  if (attributes.length === 1) {
    return (
      <>
        <div className={`relative my-6 overflow-x-hidden`}>
          <AttributeEditor
            attribute={attributes[0]}
            reorderAttr={(_attr, dir) => reorderAttrGroup(groupTitle, dir)}
            className="mb-2 mt-5"
          />
          <AddAnotherButton
            profileId={attributes[0].profileId}
            sectionId={attributes[0].sectionId}
            type={attributes[0].type}
            priority={attributes[0].priority + 10}
          />
        </div>
      </>
    );
  }

  return (
    <div
      className={`relative my-4 ${!isActive ? 'cursor-pointer transition-transform' : ''}`}
      style={{ paddingBottom: `${attributes.length * 10}px` }}
      onClick={open}
    >
      <span
        onClick={close}
        className={`text-slate-600 transition-opacity dark:text-slate-400 ${
          isActive ? 'cursor-pointer opacity-100' : 'opacity-0'
        }`}
      >
        <Collapse className={`inline-block h-4 w-4`} /> {t('Collapse')}
      </span>
      <div
        className={`mt-2 border-l-[8px] sm:border-l-[16px] ${
          isActive
            ? 'border-slate-200 border-opacity-40 dark:border-slate-800'
            : 'border-transparent opacity-90 grayscale hover:border-slate-200 hover:border-opacity-40 hover:dark:border-slate-800'
        } transition-all ${isActive ? 'pl-2 sm:pl-5' : '-translate-x-4 md:hover:translate-x-0'}`}
      >
        {attributes.map((attr, index) => {
          return (
            <React.Fragment key={attr.id ?? 'pending'}>
              <span
                key={attr.id ?? 'pending'}
                title={attr.id ?? 'pending'}
                className={
                  !isActive && index !== 0
                    ? `absolute left-0 right-0 top-0 max-h-full overflow-hidden rounded-lg border-b border-gray-200 border-opacity-80 bg-white shadow-slate-50 dark:border-gray-700 dark:bg-slate-900`
                    : ''
                }
                style={{ transform: `translateX(${index * 4}px) translateY(${index * 10}px)` }}
              >
                <AttributeEditor
                  attribute={attr}
                  className={`${!isActive ? 'pointer-events-none my-0' : 'mb-2 mt-0'}`}
                  reorderAttr={reorderAttr}
                  title={!isActive ? `${groupTitle} (${attributes.length})` : undefined}
                />
              </span>
              {isActive && (
                <AddAnotherButton
                  profileId={attributes[0].profileId}
                  sectionId={attributes[0].sectionId}
                  type={attributes[0].type}
                  priority={attr.priority + 10}
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
      id: getNewId(),
      type: type,
      sectionId: sectionId,
      priority: priority,
      data: {
        isNew: true,
      },
      typeDefinition: Object.values(AttributeDefinitions).find(
        (curr) => curr.type === type
      ) as AttributeDefinition,
      profileId: profileId,
      acl: undefined,
    } as unknown as AttributeVm;
  }, [type, profileId, sectionId, priority]);

  if (isActive) {
    return (
      <AttributeEditor
        attribute={newAttr}
        className="my-5"
        onCancel={() => setIsActive(false)}
        onSave={() => setIsActive(false)}
      />
    );
  }

  return (
    <div className="relative mb-4 mt-[-1.6rem] flex text-slate-500 transition-colors hover:text-slate-800 hover:dark:text-slate-100">
      <span
        className="relative mx-auto cursor-pointer rounded-full border bg-white transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 hover:dark:bg-slate-800"
        onClick={() => setIsActive(true)}
      >
        <Plus className="m-2 h-4 w-4" />
      </span>
    </div>
  );
};

export default AttributeGroup;
