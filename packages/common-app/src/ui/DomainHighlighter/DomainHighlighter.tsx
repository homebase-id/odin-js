import React from 'react';

const COMMON_TLDS = ['.com', '.net', '.org', '.us'];

const CharacterHighlighter = ({ children }: { children: string }) => {
  return (
    <>
      {children.split('').map((char, index) => {
        const charCode = char.charCodeAt(0);
        if (
          charCode === 46 ||
          (charCode >= 97 && charCode <= 122) ||
          (charCode >= 48 && charCode <= 57)
        )
          return <React.Fragment key={index}>{char}</React.Fragment>;

        return (
          <React.Fragment key={index}>
            <span className="text-orange-400 underline">{char}</span>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const DomainHighlighter = ({ children: domain }: { children: string }) => {
  const strangeTld = COMMON_TLDS.find((tld) => domain.includes(tld) && !domain.endsWith(tld));
  if (strangeTld) {
    const tldIndex = domain.indexOf(strangeTld);
    const parts = [domain.slice(0, tldIndex), domain.slice(tldIndex)];
    return (
      <>
        <CharacterHighlighter>{parts[0]}</CharacterHighlighter>
        <span className="text-orange-400 underline">{parts[1]}</span>
      </>
    );
  }

  return <CharacterHighlighter>{domain}</CharacterHighlighter>;
};
