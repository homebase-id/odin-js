import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { moveElementInArray } from '../../templates/DemoData/helpers';
import { useAttribute } from './useAttribute';
import { AttributeVm } from './useAttributes';

export type GroupedAttributes = {
  name: string;
  attributes: DriveSearchResult<AttributeVm>[];
  priority: number;
};

export const useAttributeOrderer = ({
  attributes,
  groupedAttributes,
}: {
  attributes: DriveSearchResult<AttributeVm>[];
  groupedAttributes: GroupedAttributes[];
}) => {
  const { mutateAsync: saveAttribute } = useAttribute({}).save;

  const respreadAttributes = async (
    orderedAttributes: DriveSearchResult<AttributeVm>[],
    minPrio: number,
    maxPrio?: number
  ) => {
    const increment = maxPrio ? Math.ceil((maxPrio - minPrio) / orderedAttributes.length) : 1000;
    await Promise.all(
      orderedAttributes.map(
        async (attr, index) =>
          await saveAttribute({
            ...attr,
            fileMetadata: {
              ...attr.fileMetadata,
              appData: {
                ...attr.fileMetadata.appData,
                content: {
                  ...attr.fileMetadata.appData.content,
                  priority: minPrio + index * increment,
                },
              },
            },
          })
      )
    );
  };

  const reorderAttr = async (attr: DriveSearchResult<AttributeVm>, dir: -1 | 1) => {
    // Calculate new priority
    const currentPos = attributes.indexOf(attr);
    const toBecomePos = currentPos + dir;

    if (toBecomePos === -1 || toBecomePos >= attributes.length) return attr.priority;

    const beforeAttr =
      attributes[dir === -1 ? toBecomePos - 1 : toBecomePos]?.fileMetadata?.appData?.content;
    const afterAttr =
      attributes[dir === -1 ? toBecomePos : toBecomePos + 1]?.fileMetadata?.appData?.content;

    // Force new priority to stay within existing priority bounds
    const minPriority = Math.min(
      ...attributes.map((attr) => attr.fileMetadata.appData.content.priority)
    );
    const maxPriority = Math.max(
      ...attributes.map((attr) => attr.fileMetadata.appData.content.priority)
    );

    const newPriority = Math.ceil(
      Math.abs(
        (beforeAttr?.priority ?? minPriority) +
          ((afterAttr?.priority ?? maxPriority) - (beforeAttr?.priority ?? minPriority)) / 2
      )
    );

    // Validate if new priority has no conflicts
    const updatedAttributes = [...attributes];
    updatedAttributes[currentPos] = { ...updatedAttributes[currentPos] };
    updatedAttributes[currentPos].fileMetadata.appData.content.priority = newPriority;

    if (
      updatedAttributes.some((attr) =>
        updatedAttributes.some(
          (item) =>
            item.fileMetadata.appData.content.priority ===
              attr.fileMetadata.appData.content.priority &&
            item.fileMetadata.appData.content.id !== attr.fileMetadata.appData.content.id
        )
      )
    ) {
      // there is a priority conflict, going to spread evenly and save
      moveElementInArray(updatedAttributes, currentPos, toBecomePos);
      await respreadAttributes(updatedAttributes, minPriority, maxPriority);
      return;
    }

    return newPriority;
  };

  const reorderAttrGroup = async (attrGroupName: string, dir: -1 | 1) => {
    const currentPos = groupedAttributes.findIndex((group) => group.name === attrGroupName);
    const currentGroup = groupedAttributes[currentPos];
    const toBecomePos = currentPos + dir;

    if (toBecomePos === -1 || toBecomePos >= groupedAttributes.length) return currentGroup.priority;

    const beforeGroup = groupedAttributes[dir === -1 ? toBecomePos - 1 : toBecomePos];
    const afterGroup = groupedAttributes[dir === -1 ? toBecomePos : toBecomePos + 1];

    const beforeGroupMaxPrio = beforeGroup?.attributes?.length
      ? Math.max(
          ...beforeGroup.attributes.map((attr) => attr.fileMetadata.appData.content.priority)
        )
      : 0;

    const newPriority = Math.ceil(
      Math.abs(
        (beforeGroupMaxPrio ?? 0) +
          ((afterGroup?.priority ??
            attributes[attributes.length - 1].fileMetadata.appData.content.priority + 2000) -
            (beforeGroupMaxPrio ?? 0)) /
            2
      )
    );

    // Validate if new priority has no conflicts
    const updatedAttrGroups = [...groupedAttributes];
    updatedAttrGroups[currentPos] = { ...updatedAttrGroups[currentPos], priority: newPriority };

    if (
      updatedAttrGroups.some((attr) =>
        updatedAttrGroups.some((item) => item.priority === attr.priority && item.name !== attr.name)
      )
    ) {
      // there is a priority conflict, going to spread evenly and save
      moveElementInArray(updatedAttrGroups, currentPos, toBecomePos);
      const updatedAttributesOrder = updatedAttrGroups.flatMap((group) => group.attributes);
      respreadAttributes(updatedAttributesOrder, 1000);

      return;
    }

    return newPriority;
  };

  return { reorderAttr, reorderAttrGroup };
};
