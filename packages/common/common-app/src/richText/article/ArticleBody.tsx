import { lazy, Suspense } from 'react';
import { RichTextRenderer } from '../renderer/RichTextRenderer';
import type { ArticleDocProps } from './ArticleDoc';

const ArticleDoc = lazy(() => import('./ArticleDoc'));

/**
 * An article's body: the Tiptap viewer when the article has a `bodyDoc` (only the new composer
 * writes one), else RichTextRenderer as before.
 */
export const ArticleBody = (props: ArticleDocProps) => {
  const { article, odinId, options, className } = props;
  if (!article.bodyDoc)
    return (
      <RichTextRenderer body={article.body} odinId={odinId} options={options} className={className} />
    );

  return (
    <Suspense
      fallback={
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-4/5 rounded bg-foreground/10"></div>
          <div className="h-4 w-3/5 rounded bg-foreground/10"></div>
        </div>
      }
    >
      <ArticleDoc {...props} />
    </Suspense>
  );
};
