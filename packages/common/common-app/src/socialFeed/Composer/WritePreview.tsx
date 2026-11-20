import { markdownToRichText, t } from '../../helpers';
import { RichTextRenderer, captionBlocksClassName } from '../../richText';

export const WritePreviewToggle = ({
  isPreview,
  onChange,
}: {
  isPreview: boolean;
  onChange: (isPreview: boolean) => void;
}) => (
  <div className="flex flex-row rounded-md bg-foreground/5 p-0.5 text-sm">
    {[false, true].map((preview) => (
      <button
        type="button"
        key={String(preview)}
        aria-pressed={isPreview === preview}
        onClick={() => onChange(preview)}
        className={`rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
          isPreview === preview
            ? 'bg-background text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {preview ? t('Preview') : t('Write')}
      </button>
    ))}
  </div>
);

export const CaptionPreview = ({ caption }: { caption: string }) => {
  const text = caption.trim();
  return text ? (
    <RichTextRenderer
      body={markdownToRichText(text) ?? [{ text }]}
      className={`min-h-12 py-2 ${captionBlocksClassName}`}
    />
  ) : (
    <p className="min-h-12 py-2 text-muted-foreground">{t('Nothing to preview')}</p>
  );
};
