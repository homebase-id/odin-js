import { moveElementInArray } from '../../templates/DemoData/helpers';
import { useAttribute } from './useAttribute';
import { AttributeVm } from './useAttributes';

export type attributeGroup = {
  name: string;
  attributes: AttributeVm[];
  priority: number;
};

export const useAttributeOrderer = ({
  attributes,
  groupedAttributes,
}: {
  attributes: AttributeVm[];
  groupedAttributes: attributeGroup[];
}) => {
  const { mutateAsync: saveAttribute } = useAttribute({}).save;

  const respreadAttributes = async (orderedAttributes: AttributeVm[], minPrio: number) =>
    await Promise.all(
      orderedAttributes.map(
        async (attr, index) => await saveAttribute({ ...attr, priority: minPrio + index * 1000 })
      )
    );

  const reorderAttr = async (attr: AttributeVm, dir: -1 | 1) => {
    // Calculate new priority
    const currentPos = attributes.indexOf(attr);
    const toBecomePos = currentPos + dir;

    if (toBecomePos === -1 || toBecomePos >= attributes.length) {
      return attr.priority;
    }

    const beforeAttr = attributes[dir === -1 ? toBecomePos - 1 : toBecomePos];
    const afterAttr = attributes[dir === -1 ? toBecomePos : toBecomePos + 1];

    // Force new priority to stay within existing priority bounds
    const minPriority = Math.min(...attributes.map((attr) => attr.priority));
    const maxPriority = Math.max(...attributes.map((attr) => attr.priority));

    const newPriority = Math.ceil(
      Math.abs(
        (beforeAttr?.priority ?? minPriority) +
          ((afterAttr?.priority ?? maxPriority) - (beforeAttr?.priority ?? minPriority)) / 2
      )
    );

    // Validate if new priority has no conflicts
    const updatedAttributes = [...attributes];
    updatedAttributes[currentPos] = { ...updatedAttributes[currentPos], priority: newPriority };

    if (
      updatedAttributes.some((attr) =>
        updatedAttributes.some((item) => item.priority === attr.priority && item.id !== attr.id)
      )
    ) {
      // there is a priority conflict, going to spread evenly and save
      moveElementInArray(updatedAttributes, currentPos, toBecomePos);
      await respreadAttributes(updatedAttributes, minPriority);
      return;
    }

    return newPriority;
  };

  const reorderAttrGroup = async (attrGroupName: string, dir: -1 | 1) => {
    const currentPos = groupedAttributes.findIndex((group) => group.name === attrGroupName);
    const currentGroup = groupedAttributes[currentPos];
    const toBecomePos = currentPos + dir;

    if (toBecomePos === -1 || toBecomePos >= groupedAttributes.length) {
      return currentGroup.priority;
    }

    const beforeGroup = groupedAttributes[dir === -1 ? toBecomePos - 1 : toBecomePos];
    const afterGroup = groupedAttributes[dir === -1 ? toBecomePos : toBecomePos + 1];

    const beforeGroupMaxPrio = beforeGroup?.attributes?.length
      ? Math.max(...beforeGroup.attributes.map((attr) => attr.priority))
      : 0;

    const newPriority = Math.ceil(
      Math.abs(
        (beforeGroupMaxPrio ?? 0) +
          ((afterGroup?.priority ?? attributes[attributes.length - 1].priority + 2000) -
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
