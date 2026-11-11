import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { RichTextRenderer } from '../renderer/RichTextRenderer';
import type { ArticleDocProps } from './ArticleDoc';

const ArticleDoc = lazy(() => import('./ArticleDoc'));

/**
 * Falls back to `fallback` when the viewer throws, whether loading its chunk or rendering a
 * document it can't handle. Tries again when `resetKey` changes.
 */
class ArticleDocBoundary extends Component<
  { resetKey: unknown; fallback: ReactNode; children: ReactNode },
  { failed: boolean; resetKey: unknown }
> {
  state = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: { resetKey: unknown }, state: { resetKey: unknown }) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ArticleBody] The article viewer failed; showing the Slate body instead', error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * An article's body: the Tiptap viewer when the article has a `bodyDoc` (an article
 * published from Journal), else RichTextRenderer as before. RichTextRenderer on `body` is also the fallback
 * when the viewer fails.
 */
export const ArticleBody = (props: ArticleDocProps) => {
  const { article, odinId, options, className } = props;
  const slate = (
    <RichTextRenderer body={article.body} odinId={odinId} options={options} className={className} />
  );
  if (!article.bodyDoc) return slate;

  return (
    <ArticleDocBoundary resetKey={article.bodyDoc} fallback={slate}>
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
    </ArticleDocBoundary>
  );
};
