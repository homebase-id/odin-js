import type { JSONContent } from '@tiptap/core';
import { articleDocOf, type Article } from '@homebase-id/js-lib/public';
import { useEffect, useState } from 'react';
import { RichTextRenderer } from '../renderer/RichTextRenderer';
import { ArticleDocRenderer, type ArticleDocOptions } from './ArticleDocRenderer';

export type ArticleDocProps = {
  article: Pick<Article, 'body' | 'bodyDoc'>;
  odinId?: string;
  options?: ArticleDocOptions;
  className?: string;
  tableOfContents?: boolean;
};

type Resolved = { doc: JSONContent } | { failed: true } | undefined;

/** An article's body through the Tiptap viewer: its `bodyDoc` while that still matches `body`. */
const ArticleDoc = ({ article, ...props }: ArticleDocProps) => {
  const [resolved, setResolved] = useState<Resolved>();

  useEffect(() => {
    let current = true;
    setResolved(undefined);
    articleDocOf(article).then(
      (doc) => current && setResolved({ doc }),
      // No document to show: the Slate body still is one
      () => current && setResolved({ failed: true })
    );
    return () => {
      current = false;
    };
  }, [article.body, article.bodyDoc]);

  if (!resolved) return null;
  if ('failed' in resolved)
    return (
      <RichTextRenderer
        body={article.body}
        odinId={props.odinId}
        options={props.options}
        className={props.className}
      />
    );
  return <ArticleDocRenderer doc={resolved.doc} {...props} />;
};

// Default export for React.lazy: KaTeX and the highlight grammars load with the first such article
export default ArticleDoc;
