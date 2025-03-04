import { PayloadDescriptor, TargetDrive } from '@homebase-id/js-lib/core';
import React, { ReactNode } from 'react';
import { Image } from '../../media/Image';
import { ActionLink } from '../../ui/Buttons/ActionLink';
import { highlightQuery } from './HighlightQuery';
import { AuthorName } from '../../socialFeed';

export const RichTextRenderer = ({
  body,
  odinId,
  options,
  className,
  renderElement: renderElementProp,
}: {
  body: string | Record<string, unknown>[] | undefined;
  odinId?: string;
  options?: {
    imageDrive: TargetDrive;
    defaultFileId: string;
    defaultGlobalTransitId?: string;
    lastModified: number | undefined;
    previewThumbnails?: PayloadDescriptor[];
    query?: string;
  };
  renderElement?: (
    node: { type?: string; attributes?: Record<string, unknown> },
    children: ReactNode
  ) => ReactNode;
  className?: string;
}) => {
  if (!body || typeof body === 'string') return <p className={className}>{body}</p>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = (node: any): ReactNode => {
    if (
      'text' in node &&
      (!('type' in node) || node.type === 'text' || node.type === 'code_line')
    ) {
      return renderLeaf(node, node.text, {});
    } else {
      const { type, ...attributes } = node;

      return renderElement(
        { type, attributes },
        node.children ? (
          <>
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              node.children.map((childNode: any, index: number) => (
                <React.Fragment key={index}>{render(childNode)}</React.Fragment>
              ))
            }
          </>
        ) : undefined
      );
    }
  };

  const renderLeaf = (
    leaf: {
      text?: string;
      bold?: boolean;
      strong?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      code?: boolean;
      type?: string;
    },
    text: string,
    attributes: Record<string, unknown>
  ) => {
    let children: ReactNode;
    const highlightedText = highlightQuery(text, options?.query);

    if (leaf.bold || leaf.strong) {
      children = <strong className="font-bold">{highlightedText}</strong>;
    }

    if (leaf.code) {
      children = (
        <code className="bg-slate-100 p-[2px_3px_1px] rounded-md text-red-500 dark:text-orange-400 font-mono text-sm dark:bg-slate-800 border">
          {highlightedText}
        </code>
      );
    }

    if (leaf.italic) {
      children = <em>{highlightedText}</em>;
    }

    if (leaf.underline) {
      children = <u>{highlightedText}</u>;
    }

    if (leaf.strikethrough) {
      children = <del>{highlightedText}</del>;
    }

    return (
      <span data-type={leaf.type || 'leaf'} {...attributes}>
        {children || highlightedText}
      </span>
    );
  };

  const renderElement = (
    node: {
      type?: string;
      attributes?: Record<string, unknown>;
    },
    children: ReactNode
  ) => {
    const { type, attributes } = node;

    const customRendered = renderElementProp?.(node, children);
    if (customRendered) return customRendered;

    switch (type) {
      case 'blockquote':
        return (
          <blockquote {...attributes} className="border-l-4 pl-2">
            {children}
          </blockquote>
        );
      case 'code_block':
        return (
          <code
            {...attributes}
            className="bg-slate-100 px-3 py-3 w-full rounded-lg text-foreground font-mono text-sm flex flex-col whitespace-pre-wrap break-all dark:bg-slate-800 border"
          >
            {children}
          </code>
        );
      case 'code_line': {
        const lang = attributes && 'lang' in attributes ? attributes.lang : undefined;

        return (
          // min height so empty code lines are still visible
          <span
            {...attributes}
            className={[`min-h-4`, lang ? 'contents' : undefined].filter(Boolean).join(' ')}
          >
            {children}
          </span>
        );
      }
      case 'h1':
        return (
          <h1 {...attributes} className={'text-2xl'}>
            {children}
          </h1>
        );
      case 'h2':
        return (
          <h2 {...attributes} className={'text-xl'}>
            {children}
          </h2>
        );
      case 'ol':
        return (
          <ol {...attributes} className="list-decimal pl-5">
            {children}
          </ol>
        );
      case 'ul':
        return (
          <ul {...attributes} className="list-disc pl-5">
            {children}
          </ul>
        );
      case 'li':
        return <li {...attributes}>{children}</li>;
      case 'a':
        // TODO: expand with check for attributes?.odinId, and if so check if it is a contact, and if we have a name for them...
        return (
          <a
            href={(attributes?.url as string) ?? ''}
            {...attributes}
            target={
              (attributes?.url as string)?.startsWith(window.location.origin) ? '_self' : '_blank'
            }
            rel="noopener noreferrer"
            className="text-primary hover:underline break-words"
            onClick={(e) => e.stopPropagation()}
          >
            {children ?? (attributes?.text || attributes?.url) + ''}
          </a>
        );
      case 'local_image':
        if (attributes && options) {
          const matchingPreviewThumbnail = options.previewThumbnails?.find(
            (payload) => payload.key === attributes.fileKey
          )?.previewThumbnail;

          return (
            <div
              className={matchingPreviewThumbnail ? '' : 'w-full max-w-md aspect-square'}
              data-thumb={!!matchingPreviewThumbnail}
            >
              <Image
                targetDrive={options.imageDrive}
                fileId={(attributes.fileId as string) || options.defaultFileId}
                globalTransitId={attributes.fileId ? undefined : options.defaultGlobalTransitId}
                lastModified={options.lastModified}
                fileKey={attributes.fileKey as string}
                previewThumbnail={matchingPreviewThumbnail}
                className="my-4 max-w-md"
                odinId={odinId}
              />
            </div>
          );
        }
        return <></>;
      case 'link':
        if (attributes && 'linkText' in attributes && attributes && 'linkTarget' in attributes) {
          return (
            <div className="flex">
              <ActionLink
                className="break-all my-2 w-auto rounded-md px-3 py-2 text-left"
                href={attributes.linkTarget as string}
                type="secondary"
              >
                {attributes.linkText as string}
              </ActionLink>
            </div>
          );
        }
        return <></>;
      case 'p':
      case 'paragraph':
        return (
          <p {...attributes} className="mb-2 last-of-type:mb-0">
            {children}
          </p>
        );

      case 'mention':
        if (attributes && 'value' in attributes && typeof attributes.value === 'string') {
          const domainRegex =
            /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;

          if (domainRegex.test(attributes.value))
            return (
              <a
                href={`https://${attributes.value}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline break-words"
              >
                @<AuthorName odinId={attributes.value} excludeLink={true} />
              </a>
            );
          else return <span className="break-all text-primary">@{attributes.value}</span>;
        } else return <></>;

      default:
        return children ? (
          <span {...attributes} data-type={type}>
            {children}
          </span>
        ) : null;
    }
  };

  return (
    <div className={`whitespace-pre-wrap break-words ${className ?? ''}`}>
      {body.map((element, index) => {
        return <React.Fragment key={index}>{render(element)}</React.Fragment>;
      })}
    </div>
  );
};
