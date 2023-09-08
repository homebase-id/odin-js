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
    // Fail silently
  }
};

// Sums up the text length +1 of all previous siblings + 1 (for the current node)
const getTextLengthFromPreviousSiblings = (elem: Node) => {
  return (
    getPreviousSiblings(elem)
      .map((node) => node.textContent)
      .join('x').length + 1
  );
};

// Gets the absolute offset of a node to the root node
export const getAbsoluteOffsetToParent = (
  elem: Node,
  relativeOffset: number,
  rootNode: Node
): number => {
  if (elem.nodeType === 3) {
    // It's a text node
    const currentOffset = getTextLengthFromPreviousSiblings(elem) + relativeOffset;
    if (rootNode === elem.parentNode || !elem.parentNode) {
      // console.log('text, so get siblings');
      return currentOffset;
    } else {
      // console.log('text, but deeper', currentOffset);
      return getAbsoluteOffsetToParent(elem.parentNode, 0, rootNode) + currentOffset + 1;
    }
  } else {
    // It's a normal node
    if (elem === rootNode) {
      // console.log('normal node but it is the parent');
      return getAbsoluteOffsetToParent(rootNode.childNodes[relativeOffset], 0, rootNode) + 1;
    }

    if (rootNode === elem.parentNode || !elem.parentNode) {
      return getTextLengthFromPreviousSiblings(elem);
    } else {
      // 'How did you get that? Way too complex structure, not supported',
      return 0;
      // return getAbsoluteOffsetToParent(elem.parentNode, currentOffset, rootNode);
    }
  }
};

// export const getAbsoluteOffsetToParent = (elem: Node, relativeOffset: number, parentNode: Node) => {
//   let directChildOfParent = elem;

//   if (directChildOfParent === parentNode && parentNode.lastChild) {
//     directChildOfParent = parentNode.childNodes[relativeOffset];
//     console.log('force ', parentNode.childNodes[relativeOffset], parentNode.childNodes);
//     relativeOffset = 0;
//   }

//   while (directChildOfParent.parentNode && directChildOfParent.parentNode !== parentNode) {
//     directChildOfParent = directChildOfParent.parentNode;
//   }

//   const elementsToCharOffset =
//     getPreviousSiblings(directChildOfParent)
//       .map((node) => node.textContent)
//       .join('x').length + 1;

//   return elementsToCharOffset + relativeOffset;
// };

export const getRelativeOffset = (absoluteOffset: number, parentNode: Node) => {
  const children = parentNode.childNodes;
  console.log(children);

  let runningOffset = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const relativeOffset = absoluteOffset - runningOffset;

    runningOffset += child.textContent?.length ? child.textContent?.length + 1 : 0;

    const node = child.childNodes[0] || child;
    if (child.childNodes.length > 1) {
      console.log(child.childNodes);
    }
    if (runningOffset > absoluteOffset) {
      return { node: node, offset: relativeOffset };
    }

    // If we are at the end of the parent node, return the last child, with length as offset
    if (children[children.length - 1] === child) {
      console.log('last child');
      // return { node: node, offset: Array.from(node.textContent || '').length || 0 };
      return { node: node, offset: relativeOffset };
    }
  }
};
