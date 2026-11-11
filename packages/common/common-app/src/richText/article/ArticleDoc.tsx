import type { JSONContent } from '@tiptap/core';
import { articleDocOf, type Article } from '@homebase-id/js-lib/public';
import { useEffect, useState } from 'react';
import { ArticleDocRenderer, type ArticleDocOptions } from './ArticleDocRenderer';

export type ArticleDocProps = {
  article: Pick<Article, 'body' | 'bodyDoc'>;
  odinId?: string;
  options?: ArticleDocOptions;
  className?: string;
  tableOfContents?: boolean;
};

/** An article's body through the Tiptap viewer: its `bodyDoc` while that still matches `body`. */
const ArticleDoc = ({ article, ...props }: ArticleDocProps) => {
  const [doc, setDoc] = useState<JSONContent>();

  useEffect(() => {
    let current = true;
    articleDocOf(article).then(
      (resolved) => current && setDoc(resolved),
      () => current && setDoc(undefined)
    );
    return () => {
      current = false;
    };
  }, [article.body, article.bodyDoc]);

  return doc ? <ArticleDocRenderer doc={doc} {...props} /> : null;
};

// Default export for React.lazy: KaTeX and the highlight grammars load with the first such article
export default ArticleDoc;
