import {
  ActionButton,
  DialogWrapper,
  EmojiSelector,
  Input,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { Ellipsis } from '@homebase-id/common-app/icons';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMyStatus } from '../../../hooks/community/status/useMyStatus';
import { useCommunity } from '../../../hooks/community/useCommunity';
import { useParams } from 'react-router-dom';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { CommunityDefinition } from '../../../providers/CommunityDefinitionProvider';

export const MyProfileStatus = ({ className }: { className?: string }) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;
  const [isManageStatusDialogOpen, setManageStatusDialogOpen] = useState(false);

  const {
    get: { data: myStatus, isFetched },
  } = useMyStatus({ community });
  const hasStatus = myStatus?.emoji || myStatus?.status;

  if (!community || !isFetched) return null;

  return (
    <>
      <ActionButton
        icon={hasStatus ? undefined : Ellipsis}
        size="none"
        type="mute"
        className={`opacity-50 hover:opacity-100 ${className || ''}`}
        onClick={(e) => {
          e.preventDefault();
          setManageStatusDialogOpen(true);
        }}
        title={myStatus?.status}
      >
        {myStatus?.emoji}
      </ActionButton>
      {community && isManageStatusDialogOpen ? (
        <StatusDialog
          community={community}
          isOpen={isManageStatusDialogOpen}
          onClose={() => setManageStatusDialogOpen(false)}
        />
      ) : null}
    </>
  );
};

export const ProfileStatus = ({ odinId, className }: { odinId: string; className?: string }) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;

  const {
    get: { data: myStatus, isFetched },
  } = useMyStatus({ community, odinId });
  const hasStatus = myStatus?.emoji || myStatus?.status;

  if (!community || !isFetched || !hasStatus) return null;

  return (
    <span title={myStatus.status} className={className}>
      {myStatus?.emoji}
    </span>
  );
};

export const StatusDialog = ({
  community,
  isOpen,
  onClose,
}: {
  community: HomebaseFile<CommunityDefinition>;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const {
    get: { data: myStatus, isFetched },
    set: { mutate: setStatus, status: saveStatus },
  } = useMyStatus({ community });
  const [draftStatus, setDraftStatus] = useState(myStatus);

  useEffect(() => {
    if (isFetched) setDraftStatus(myStatus);
  }, [isFetched, myStatus]);
  useEffect(() => {
    if (saveStatus === 'success') onClose();
  }, [saveStatus]);

  const target = usePortal('modal-container');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);

  const doSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!draftStatus) return;

    setStatus({
      community,
      status: draftStatus,
    });
  };

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={t('Set a status')}
      onClose={onClose}
      isSidePanel={false}
      isOverflowLess={true}
    >
      <form onSubmit={doSubmit}>
        <div className="flex w-full flex-row rounded-lg border">
          <EmojiSelector
            wrapperClassName="relative flex flex-row justify-center items-center"
            className="text-xl text-foreground/70 hover:text-opacity-100"
            onInput={(val) => setDraftStatus((old) => ({ ...(old || {}), emoji: val }))}
            isOpen={isEmojiOpen}
            onClose={() => setIsEmojiOpen(false)}
            defaultValue={draftStatus?.emoji}
          />
          <Input
            className="border-0"
            placeholder={t(`What's your status?`)}
            onChange={(e) => setDraftStatus((old) => ({ ...old, status: e.target.value }))}
          />
        </div>
        <div className="mt-5 flex flex-row-reverse gap-4">
          <ActionButton
            type={'primary'}
            disabled={!draftStatus}
            state={saveStatus}
            onClick={doSubmit}
          >
            {t('Save')}
          </ActionButton>
          <ActionButton
            type={'secondary'}
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            {t('Cancel')}
          </ActionButton>
        </div>
      </form>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
