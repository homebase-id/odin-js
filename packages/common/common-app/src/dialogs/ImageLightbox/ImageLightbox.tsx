import { createPortal } from 'react-dom';

import { EmbeddedThumb, SystemFileType, TargetDrive } from '@homebase-id/js-lib/core';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from 'react';
import { ButtonColors } from '../../ui/Buttons/ColorConfig';
import { usePortal } from '../../hooks/portal/usePortal';
import { Times } from '../../ui/Icons/Times';
import { Chevron, ChevronLeft } from '../../ui/Icons/Chevron';
import { OdinImage } from '@homebase-id/ui-lib';
import { useDotYouClientContext } from '../../hooks';
import { t } from '../../helpers/i18n/dictionary';

/** An image to show: a Homebase payload, or a plain url. */
export type LightboxImage =
  | { src: string; alt?: string }
  | {
      targetDrive: TargetDrive;
      fileId: string;
      fileKey: string;
      globalTransitId?: string;
      odinId?: string;
      previewThumbnail?: EmbeddedThumb;
      lastModified?: number;
      systemFileType?: SystemFileType;
      alt?: string;
    };

type OneImage = {
  targetDrive: TargetDrive;
  fileId: string;
  fileKey: string;
  previewThumbnail?: EmbeddedThumb;
  lastModified: number | undefined;
  systemFileType?: SystemFileType;
  images?: never;
};

/** Several images, from `startIndex`: arrow keys, swipes and the side buttons move through them. */
type ManyImages = { images: LightboxImage[]; startIndex?: number };

/** Swipes shorter than this (px) are taps */
const SWIPE = 50;

/**
 * An image, or a set of them, full screen at full size. Focus stays in the dialog while it is
 * open and goes back to where it was when it closes.
 */
export const ImageLightbox = (props: (OneImage | ManyImages) & { onClose: () => void }) => {
  const { onClose } = props;
  const dotYouClient = useDotYouClientContext();
  const target = usePortal('modal-container');
  const images: LightboxImage[] = props.images ?? [
    {
      targetDrive: (props as OneImage).targetDrive,
      fileId: (props as OneImage).fileId,
      fileKey: (props as OneImage).fileKey,
      previewThumbnail: (props as OneImage).previewThumbnail,
      lastModified: (props as OneImage).lastModified,
      systemFileType: (props as OneImage).systemFileType,
    },
  ];
  const count = images.length;
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(count - 1, (props as ManyImages).startIndex ?? 0))
  );
  const go = useCallback(
    (step: number) => setIndex((i) => Math.max(0, Math.min(count - 1, i + step))),
    [count]
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | undefined>(undefined);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  /** The side button that has focus, which keeps it when it goes disabled (at the first or last image) */
  const focusedSide = useRef<'prev' | 'next'>(undefined);
  useLayoutEffect(() => {
    if (focusedSide.current === 'prev' && index === 0) nextRef.current?.focus();
    else if (focusedSide.current === 'next' && index === count - 1) prevRef.current?.focus();
  }, [index, count]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        go(e.key === 'ArrowRight' ? 1 : -1);
      } else if (e.key === 'Tab') {
        // Focus stays on the dialog's buttons
        const buttons = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
        );
        if (!buttons.length) return;
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.shiftKey
          ? at <= 0
            ? buttons.length - 1
            : at - 1
          : (at + 1) % buttons.length;
        e.preventDefault();
        buttons[next].focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, go]);

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  const onTouchStart = (e: TouchEvent) => {
    // A second finger (a pinch) is no swipe
    if (e.touches.length !== 1) {
      touch.current = undefined;
      return;
    }
    const { clientX: x, clientY: y } = e.touches[0];
    touch.current = { x, y };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = undefined;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const image = images[index];
  const sideButton = `absolute top-1/2 -translate-y-1/2 rounded-full p-3 disabled:opacity-30 ${ButtonColors.secondary}`;

  const dialog = (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-40 bg-media-backdrop lg:bg-transparent"
      role="dialog"
      aria-modal="true"
      aria-label={count > 1 ? `${t('Image')} ${index + 1} / ${count}` : t('Image')}
      onTouchStart={count > 1 ? onTouchStart : undefined}
      onTouchEnd={count > 1 ? onTouchEnd : undefined}
    >
      <div className="inset-0 bg-media-backdrop transition-opacity lg:fixed"></div>
      <div className="inset-0 z-10 lg:fixed lg:overflow-y-auto">
        <div className="relative flex h-full min-h-screen flex-col lg:flex-row" onClick={onClose}>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t('Close')}
            className={`absolute left-4 top-4 z-10 rounded-full p-3 ${ButtonColors.secondary}`}
          >
            <Times className="h-5 w-5" />
          </button>

          {'src' in image ? (
            <img
              key={index}
              src={image.src}
              alt={image.alt ?? ''}
              referrerPolicy="no-referrer"
              className="m-auto h-auto max-h-screen w-auto max-w-full object-contain"
            />
          ) : (
            <OdinImage
              key={index}
              dotYouClient={dotYouClient}
              className={`m-auto h-auto max-h-screen w-auto max-w-full object-contain`}
              odinId={image.odinId}
              fileId={image.fileId}
              globalTransitId={image.globalTransitId}
              fileKey={image.fileKey}
              targetDrive={image.targetDrive}
              previewThumbnail={image.previewThumbnail}
              lastModified={image.lastModified}
              systemFileType={image.systemFileType}
              alt={image.alt}
              fit="contain"
            />
          )}

          {count > 1 ? (
            <>
              <p
                aria-hidden="true"
                className="absolute right-4 top-6 rounded-full bg-media-backdrop/60 px-3 py-1 text-sm text-media-backdrop-contrast"
              >
                {index + 1} / {count}
              </p>
              <button
                ref={prevRef}
                onFocus={() => (focusedSide.current = 'prev')}
                onBlur={() => (focusedSide.current = undefined)}
                aria-label={t('Previous')}
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className={`${sideButton} left-4`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                ref={nextRef}
                onFocus={() => (focusedSide.current = 'next')}
                onBlur={() => (focusedSide.current = undefined)}
                aria-label={t('Next')}
                disabled={index === count - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className={`${sideButton} right-4`}
              >
                <Chevron className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};
