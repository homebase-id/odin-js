import { TargetDrive } from '@youfoundation/js-lib/core';
import React, { ReactNode } from 'react';
import { ActionLink, Image } from '@youfoundation/common-app';

export const RichTextRenderer = ({
  body,
  odinId,
  options,
  className,
}: {
  body: string | Record<string, unknown>[] | undefined;
  odinId?: string;
  options?: {
    imageDrive: TargetDrive;
    defaultFileId: string;
    defaultGlobalTransitId?: string;
  };
  className?: string;
}) => {
  if (!body || typeof body === 'string') return <p className={className}>{body}</p>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = (node: any): ReactNode => {
    if ('text' in node && (!('type' in node) || node.type === 'text')) {
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
    leaf: { text?: string; bold?: boolean; italic?: boolean; underline?: boolean; code?: boolean },
    children: ReactNode,
    attributes: Record<string, unknown>
  ) => {
    if (leaf.bold) {
      children = <strong className="font-bold">{children}</strong>;
    }

    if (leaf.code) {
      children = <code>{children}</code>;
    }

    if (leaf.italic) {
      children = <em>{children}</em>;
    }

    if (leaf.underline) {
      children = <u>{children}</u>;
    }

    return <span {...attributes}>{children}</span>;
  };

  const renderElement = (
    node: {
      type?: string;
      attributes?: Record<string, unknown>;
    },
    children: ReactNode
  ) => {
    const { type, attributes } = node;

    switch (type) {
      case 'blockquote':
        return (
          <blockquote {...attributes} className="border-l-4 pl-2">
            {children}
          </blockquote>
        );
      case 'code_block':
        return (
          <code {...attributes} className="">
            {children}
          </code>
        );

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
            className="text-primary hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {children ?? (attributes?.text || attributes?.url) + ''}
          </a>
        );
      case 'local_image':
        if (attributes && options) {
          return (
            <Image
              targetDrive={options.imageDrive}
              fileId={(attributes.fileId as string) || options.defaultFileId}
              globalTransitId={attributes.fileId ? undefined : options.defaultGlobalTransitId}
              fileKey={attributes.fileKey as string}
              className="my-4 max-w-md"
              odinId={odinId}
            />
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
          <p {...attributes} className="mb-3">
            {children}
          </p>
        );
      default:
        return <span {...attributes}>{children}</span>;
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
