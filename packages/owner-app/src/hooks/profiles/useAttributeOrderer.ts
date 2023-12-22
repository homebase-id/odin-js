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
  currentGroupAttributes,
  groupedAttributes,
}: {
  currentGroupAttributes: DriveSearchResult<AttributeVm>[];
  groupedAttributes: GroupedAttributes[];
}) => {
  const { mutateAsync: saveAttribute } = useAttribute({}).save;

  const flatAttributes = groupedAttributes.flatMap((group) => group.attributes);

  const respreadAttributes = async (orderedAttributes: DriveSearchResult<AttributeVm>[]) => {
    const increment = 1000;
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
                  priority: increment + index * increment,
                },
              },
            },
          })
      )
    );
  };

  const reorderAttr = async (attr: DriveSearchResult<AttributeVm>, dir: -1 | 1) => {
    const currentPos = flatAttributes.indexOf(attr);
    const toBecomePos = currentPos + dir;

    if (toBecomePos === -1 || toBecomePos >= flatAttributes.length) return attr.priority;

    if (
      flatAttributes[toBecomePos].fileMetadata.appData.content.type !==
      attr.fileMetadata.appData.content.type
    ) {
      const currentGroup = groupedAttributes.find((group) =>
        group.attributes.some((groupAttr) => groupAttr.fileId === attr.fileId)
      );
      // Sanity
      if (!currentGroup) throw new Error('Cannot find current group');
      reorderAttrGroup(currentGroup, dir);

      return;
    }

    const beforeAttr =
      flatAttributes[dir === -1 ? toBecomePos - 1 : toBecomePos]?.fileMetadata?.appData?.content;
    const afterAttr =
      flatAttributes[dir === -1 ? toBecomePos : toBecomePos + 1]?.fileMetadata?.appData?.content;

    // Force new priority to stay within existing priority bounds
    const minPriority = Math.min(
      ...currentGroupAttributes.map((attr) => attr.fileMetadata.appData.content.priority)
    );
    const maxPriority = Math.max(
      ...currentGroupAttributes.map((attr) => attr.fileMetadata.appData.content.priority)
    );

    const newPriority = Math.ceil(
      Math.abs(
        (beforeAttr?.priority ?? minPriority) +
          ((afterAttr?.priority ?? maxPriority) - (beforeAttr?.priority ?? minPriority)) / 2
      )
    );

    // Validate if new priority has no conflicts
    const updatedAttributes = [...flatAttributes];
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
      await respreadAttributes(updatedAttributes);
      return;
    }

    return newPriority;
  };

  const reorderAttrGroup = async (group: GroupedAttributes, dir: -1 | 1) => {
    const currentPos = groupedAttributes.indexOf(group);
    const toBecomePos = currentPos + dir;

    // there is a priority conflict, going to spread evenly and save
    moveElementInArray(groupedAttributes, currentPos, toBecomePos);
    const updatedAttributesOrder = groupedAttributes.flatMap((group) => group.attributes);
    respreadAttributes(updatedAttributesOrder);
  };

  return { reorderAttr };
};
