import { ReactRenderer } from '@tiptap/react';
import type {
  SuggestionOptions,
  SuggestionProps,
  SuggestionKeyDownProps,
} from '@tiptap/suggestion';
import type { ComponentType, RefAttributes } from 'react';

export type SuggestionListRef = { onKeyDown: (props: SuggestionKeyDownProps) => boolean };

const GAP = 6;

/** Puts the popup under the caret (or above it when there's no room below), inside the viewport. */
const place = (element: HTMLElement, rect: DOMRect | null | undefined) => {
  if (!rect) return;
  const { offsetWidth: width, offsetHeight: height } = element;
  const below = rect.bottom + GAP + height <= window.innerHeight || rect.top < height + GAP;
  element.style.top = `${below ? rect.bottom + GAP : rect.top - GAP - height}px`;
  element.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
};

/**
 * `render` for a @tiptap/suggestion: the list component in a fixed popup at the caret. The list
 * takes the suggestion props and handles the keys through its ref.
 */
export const suggestionPopup =
  <I, P extends SuggestionProps<I>>(
    List: ComponentType<P & RefAttributes<SuggestionListRef>>
  ): SuggestionOptions<I>['render'] =>
  () => {
    let component: ReactRenderer<SuggestionListRef, P> | undefined;
    let popup: HTMLDivElement | undefined;
    // Escape hides the popup until the suggestion ends; its keys then go to the editor again
    let dismissed = false;

    return {
      onStart: (props) => {
        component = new ReactRenderer(List as never, { props, editor: props.editor });
        popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.zIndex = '60';
        popup.appendChild(component.element);
        document.body.appendChild(popup);
        // Measured once React has rendered the list
        requestAnimationFrame(() => popup && place(popup, props.clientRect?.()));
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        requestAnimationFrame(() => popup && place(popup, props.clientRect?.()));
      },
      onKeyDown: (props) => {
        if (dismissed) return false;
        if (props.event.key === 'Escape') {
          dismissed = true;
          popup?.remove();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.remove();
        component?.destroy();
        popup = undefined;
        component = undefined;
        dismissed = false;
      },
    };
  };
