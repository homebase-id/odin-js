export type SelectionData = [Node, number, Node, number];

export const getPreviousSiblings = (elem: Node) => {
  const sibs = [];
  while (elem.previousSibling) {
    elem = elem.previousSibling;
    sibs.push(elem);
  }
  return sibs;
};

// Gets the selection of the current window
export const saveSelection = (): SelectionData | undefined => {
  const selection = window.getSelection();
  if (selection && selection.anchorNode && selection.focusNode) {
    return [
      selection.anchorNode,
      selection.anchorOffset,
      selection.focusNode,
      selection.focusOffset,
    ];
  }
};

// Restores the selection of the current window
export const restoreSelection = (saved: SelectionData) => {
  try {
    const selection = window.getSelection();
    if (selection) selection.setBaseAndExtent(saved[0], saved[1], saved[2], saved[3]);
  } catch (e) {
    // Fail silently, selection will have changed in the mean time. Worst case: position will just be off
  }
};

// Sums up the text length of all previous siblings
const getTextLengthFromPreviousSiblings = (elem: Node) => {
  return Array.from(
    getPreviousSiblings(elem)
      .map((node) => node.textContent)
      .join('')
      // Dont't count line breaks; Chrome counts them.. Firefox doesn't
      .replaceAll('\n', '')
  ).length;
};

// Gets the absolute offset of a node to the root node
export const getAbsoluteOffsetToParent = (
  elem: Node,
  relativeOffset: number,
  rootNode: Node
): number => {
  if (!elem) return 0;
  if (elem.nodeType === 3) {
    // It's a text node
    const currentOffset = getTextLengthFromPreviousSiblings(elem) + relativeOffset;
    if (rootNode === elem.parentNode || !elem.parentNode) {
      return currentOffset;
    } else {
      return getAbsoluteOffsetToParent(elem.parentNode, 0, rootNode) + currentOffset;
    }
  } else {
    // It's a normal node
    if (elem === rootNode) {
      return getAbsoluteOffsetToParent(rootNode.childNodes[relativeOffset], 0, rootNode);
    }

    if (rootNode === elem.parentNode || !elem.parentNode) {
      return getTextLengthFromPreviousSiblings(elem);
    } else {
      // 'How did you get that? Way too complex structure, not supported',
      return 0;
    }
  }
};

export const getRelativeOffset = (absoluteOffset: number, parentNode: Node) => {
  const children = parentNode.childNodes;

  let runningOffset = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const relativeOffset = absoluteOffset - runningOffset;

    runningOffset += Array.from(child.textContent || '').length;

    const node = child.childNodes[0] || child;
    if (runningOffset > absoluteOffset) {
      return { node: node, offset: relativeOffset };
    }

    // If we are at the end of the parent node, return the last child, with length as offset
    if (children[children.length - 1] === child) {
      // If it's a text node, return the length of the text as the offset
      if (children[children.length - 1].nodeType === 3) {
        return { node: node, offset: relativeOffset };
      } else {
        // Else return the last child, which is probabaly an empty one
        return { node: child, offset: 0 };
      }
    }
  }
};
