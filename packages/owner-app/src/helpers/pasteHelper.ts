export const getImagesFromPasteEvent = (e: React.ClipboardEvent<HTMLElement>) => {
  // Doesn't work for multi file pastes in FF (https://bugzilla.mozilla.org/show_bug.cgi?id=906420)
  const clipboardItems = e.clipboardData.items;
  const itemArray = [];
  for (let i = 0; i < clipboardItems.length; i++) {
    itemArray.push(clipboardItems[i]);
  }

  return itemArray
    .filter(function (item: DataTransferItem) {
      // Filter the image items only
      return /^image\//.test(item.type);
    })
    .map((item) => item.getAsFile())
    .filter(Boolean) as File[];
};
