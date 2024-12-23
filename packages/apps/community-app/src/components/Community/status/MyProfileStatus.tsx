import {
  ActionButton,
  DialogWrapper,
  EmojiSelector,
  formatDateExludingYearIfCurrent,
  Input,
  Label,
  Select,
  t,
  usePortal,
} from '@homebase-id/common-app';
import { Ellipsis, Save, Times } from '@homebase-id/common-app/icons';
import { useEffect, useMemo, useState } from 'react';
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
        key={myStatus?.status || myStatus?.emoji || 'none'}
        icon={hasStatus ? undefined : Ellipsis}
        size="none"
        type="mute"
        className={`opacity-50 hover:opacity-100 ${className || ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setManageStatusDialogOpen(true);
        }}
        title={
          hasStatus
            ? `"${myStatus?.status || myStatus?.emoji}" ${myStatus?.validTill ? `${t('till')} ${formatDateExludingYearIfCurrent(new Date(myStatus.validTill))}` : ''}`
            : undefined
        }
      >
        {hasStatus && (myStatus?.emoji || '💬')}
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
  const hasStatus =
    (myStatus?.emoji || myStatus?.status) &&
    (!myStatus?.validTill || new Date(myStatus.validTill) > new Date());

  if (!community || !isFetched || !hasStatus) return null;

  return (
    <span
      title={
        hasStatus
          ? `"${myStatus?.status || myStatus?.emoji}" ${myStatus?.validTill ? `${t('till')} ${formatDateExludingYearIfCurrent(new Date(myStatus.validTill))}` : ''}`
          : undefined
      }
      className={className}
    >
      {myStatus?.emoji || '💬'}
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

  const doClear = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!draftStatus) return;

    setStatus({
      community,
      status: {},
    });
  };

  const options = useMemo(() => {
    const thirtyMinutes = new Date();
    thirtyMinutes.setMinutes(thirtyMinutes.getMinutes() + 30);

    const oneHour = new Date();
    oneHour.setHours(oneHour.getHours() + 1);

    const fourHours = new Date();
    fourHours.setHours(fourHours.getHours() + 4);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return [
      { label: t(`Don't clear`), value: undefined },
      { label: t('30 minutes'), value: thirtyMinutes },
      { label: t('1 hour'), value: oneHour },
      { label: t('4 hours'), value: fourHours },
      { label: t('Today'), value: endOfDay },
    ];
  }, []);

  if (!isOpen) return null;

  const dialog = (
    <div onClick={(e) => e.stopPropagation()}>
      <DialogWrapper
        title={t('Set a status')}
        onClose={onClose}
        isSidePanel={false}
        isOverflowLess={true}
      >
        <form onSubmit={doSubmit}>
          <div className="relative flex w-full flex-row rounded-lg border">
            <EmojiSelector
              wrapperClassName="relative flex flex-row justify-center items-center"
              className="text-xl text-foreground/70 hover:text-opacity-100"
              onInput={(val) => setDraftStatus((old) => ({ ...(old || {}), emoji: val }))}
              isOpen={isEmojiOpen}
              onClose={() => setIsEmojiOpen(false)}
              defaultValue={draftStatus?.emoji || '💬'}
            />
            <Input
              className="border-0"
              placeholder={t(`What's your status?`)}
              onChange={(e) => setDraftStatus((old) => ({ ...old, status: e.target.value }))}
            />
          </div>
          <div className="mt-5">
            <Label>{t('Remove status after...')}</Label>
            <Select
              className="border py-3"
              onChange={(e) => {
                const expiry = options.find((o) => o.value?.getTime() === Number(e.target.value));
                setDraftStatus((old) => ({
                  ...old,
                  validTill: expiry?.value?.getTime() || undefined,
                }));
              }}
            >
              {options.map((option) => (
                <option key={option.label} value={option.value?.getTime()}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="mt-5 flex flex-col gap-4 md:flex-row-reverse">
            <ActionButton
              type={'primary'}
              disabled={!draftStatus}
              state={saveStatus}
              onClick={doSubmit}
              icon={Save}
            >
              {t('Save')}
            </ActionButton>
            <ActionButton
              type={'secondary'}
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="hidden md:flex"
            >
              {t('Cancel')}
            </ActionButton>
            {draftStatus ? (
              <ActionButton
                type={'secondary'}
                icon={Times}
                onClick={doClear}
                className="md:mr-auto"
              >
                {t('Clear')}
              </ActionButton>
            ) : null}
          </div>
        </form>
      </DialogWrapper>
    </div>
  );

  return createPortal(dialog, target);
};
