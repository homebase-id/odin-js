import { hasDebugFlag } from '@homebase-id/js-lib/helpers';
const isDebug = hasDebugFlag();

export const getPreviousSiblings = (elem: Node) => {
  const sibs = [];
  while (elem.previousSibling) {
    elem = elem.previousSibling;
    sibs.push(elem);
  }
  return sibs;
};

// Gets the selection of the current window
export const saveSelection = (): { node: Node; relativeOffset: number } | undefined => {
  const selection = window.getSelection();

  if (selection && selection.anchorNode && selection.focusNode) {
    return { node: selection.anchorNode, relativeOffset: selection.anchorOffset };
  }
};

// Restores the selection of the current window
export const restoreSelection = (node: ChildNode, offset: number) => {
  const selection = window.getSelection();

  if (!selection) return;
  try {
    // selection.setBaseAndExtent(node, offset, node, offset);

    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    console.warn('Failed to restore selection');
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
      const allCharTillHere = Array.from(elem.textContent || '')
        .slice(0, relativeOffset)
        .join('');
      const allNewLinesInText = allCharTillHere.split('\n').length - 1;
      return currentOffset - allNewLinesInText;
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
      isDebug && console.debug('[getAbsoluteOffsetToParent] Too complex structure, not supported');
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

    // Dont't count line breaks; Chrome counts them.. Firefox doesn't
    runningOffset += Array.from(child.textContent?.replaceAll('\n', '') || '').length;

    const node = child.childNodes[0] || child;
    if (runningOffset === absoluteOffset) {
      const allCharTillHere = Array.from(node.textContent || '')
        .slice(0, relativeOffset)
        .join('');
      const allNewLinesInText = allCharTillHere.split('\n').length - 1;

      return { node: node, offset: relativeOffset + allNewLinesInText };
    }

    if (runningOffset > absoluteOffset) {
      // If we are past the offset, return the previous child, with the relative offset
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
