import React from 'react';

export const highlightQuery = (text: string | undefined, query: string | undefined | null) => {
  if (!query || !text || !(typeof text === 'string')) return text;

  const regEscape = (v: string) => v.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const strArr = text.split(new RegExp(regEscape(query), 'ig'));

  return strArr.map((str, index) => {
    if (index === strArr.length - 1) return str;
    return (
      <React.Fragment key={index}>
        {str}
        <span className="bg-amber-200 dark:bg-yellow-600">{query}</span>
      </React.Fragment>
    );
  });
};
