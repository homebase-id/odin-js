import React, { useMemo, useState } from 'react';

import { cn, withRef } from '@udecode/cn';
import { PlateElement } from '@udecode/plate-common';

import { TChannel, getChannelOnSelectItem } from './RTEChannelDropdownPlugin';

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxInput,
  InlineComboboxItem,
  InlineComboboxSeleactableEmpty,
} from '@youfoundation/rich-text-editor';
import { ErrorNotification, t } from '@youfoundation/common-app';
import { useParams } from 'react-router-dom';
import { useCommunityChannels } from '../../../../hooks/community/channels/useCommunityChannels';
import { useCommunity } from '../../../../hooks/community/useCommunity';
import { useCommunityChannel } from '../../../../hooks/community/channels/useCommunityChannel';

const onSelectItem = getChannelOnSelectItem();

export const RTEChannelDropdownInputElement = withRef<typeof PlateElement>(
  ({ className, ...props }, ref) => {
    const { children, editor, element } = props;
    const [search, setSearch] = useState('');

    const { communityKey } = useParams();
    const { data: community } = useCommunity({ communityId: communityKey }).fetch;
    const {
      mutate: createCommunityChannel,
      status: creationStatus,
      error: creationError,
    } = useCommunityChannel().create;

    const { data: channelTargets } = useCommunityChannels({
      communityId: communityKey,
    }).fetch;

    const channels: TChannel[] = useMemo(
      () =>
        channelTargets?.map((chnl) => ({
          key: chnl.fileId,
          text: chnl.fileMetadata.appData.content.title,
        })) || [],
      [channelTargets]
    );

    if (!channels) return null;

    return (
      <>
        <ErrorNotification error={creationError} />
        <PlateElement as="span" data-slate-value={element.value} ref={ref} {...props}>
          <InlineCombobox
            element={element}
            setValue={setSearch}
            showTrigger={false}
            trigger="#"
            value={search}
          >
            <span
              className={cn(
                'bg-muted ring-ring inline-block rounded-md px-1.5 py-0.5 align-baseline text-sm focus-within:ring-2',
                className
              )}
            >
              <InlineComboboxInput />
            </span>

            <InlineComboboxContent className="my-1.5">
              <InlineComboboxSeleactableEmpty
                onClick={() => {
                  if (!community || !search) return;
                  createCommunityChannel({
                    community,
                    channelName: search,
                  });
                }}
              >
                {creationStatus === 'pending' ? t('Creating...') : t('Create "{0}"', search)}
              </InlineComboboxSeleactableEmpty>

              {channels.map((item) => (
                <InlineComboboxItem
                  key={item.key}
                  onClick={() => onSelectItem(editor, item, search)}
                  value={item.text}
                >
                  # {item.text}
                </InlineComboboxItem>
              ))}
            </InlineComboboxContent>
          </InlineCombobox>

          {children}
        </PlateElement>
      </>
    );
  }
);
