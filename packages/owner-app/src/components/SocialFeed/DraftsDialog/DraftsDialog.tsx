import {
  usePortal,
  useDrafts,
  useChannels,
  DialogWrapper,
  t,
  LoadingParagraph,
  ActionLink,
  ActionButton,
  ChannelDefinitionVm,
  ErrorNotification,
  FakeAnchor,
  PostMeta,
  Quote,
} from '@youfoundation/common-app';
import { PostFile, PostContent } from '@youfoundation/js-lib';
import { createPortal } from 'react-dom';

const DraftsDialog = ({ isOpen, onCancel }: { isOpen: boolean; onCancel: () => void }) => {
  const target = usePortal('modal-container');
  const {
    fetch: { data: drafts, isLoading: draftsLoading },
  } = useDrafts();
  const { data: channels } = useChannels({ isOwner: true, isAuthenticated: true });

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        <div className="flex flex-row items-center">
          <Quote className="mr-2 h-6 w-6" /> {t('Drafts')}
        </div>
      }
      onClose={onCancel}
      isSidePanel={true}
      keepOpenOnBlur={true}
    >
      {draftsLoading ? (
        <>
          <LoadingParagraph className="my-2 h-4" />
          <LoadingParagraph className="my-2 h-4" />
          <LoadingParagraph className="my-2 h-4" />
        </>
      ) : null}
      {!drafts && !draftsLoading ? <>{t('No drafts found')}</> : null}
      {drafts ? (
        <div className="-m-3">
          {!drafts?.length ? (
            <p className="m-3">{t('No drafts found')}</p>
          ) : (
            drafts.map((draft, index) => {
              const channel = channels?.find((chnl) => chnl.channelId === draft.content.channelId);
              return (
                <DraftItem
                  draft={draft}
                  channel={channel}
                  key={draft.fileId ?? index}
                  onNavigate={onCancel}
                  className="bg-slate-50 dark:bg-slate-900"
                />
              );
            })
          )}
        </div>
      ) : null}
      <div className="-m-2 flex flex-row-reverse py-3">
        <ActionLink
          className="m-2 cursor-pointer"
          onClick={() => {
            window.location.href = '/home/feed/new';
          }}
          icon="plus"
        >
          {t('New Draft')}
        </ActionLink>
        <ActionButton className="m-2" onClick={onCancel} type="secondary">
          {t('Cancel')}
        </ActionButton>
      </div>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export const DraftItem = ({
  draft,
  channel,
  onNavigate,
  className,
}: {
  draft: PostFile<PostContent>;
  channel?: ChannelDefinitionVm;
  onNavigate?: () => void;
  className?: string;
}) => {
  const {
    remove: { mutate: removeDraft, error: removeDraftError },
  } = useDrafts();

  return (
    <>
      <ErrorNotification error={removeDraftError} />
      <div
        className={`m-3 rounded-lg ${
          className ?? ''
        } p-3 hover:shadow-md hover:dark:shadow-slate-600`}
        key={draft.fileId}
      >
        <FakeAnchor
          href={`/home/feed/edit/${channel?.slug ?? 'public-posts'}/${draft.content.id}`}
          onNavigate={onNavigate}
        >
          <div className="flex flex-col">
            <div className="mr-auto">
              <h2 className="mr-2 text-xl">
                {draft.content.caption?.length ? draft.content.caption : t('Untitled')}
              </h2>
              {channel && (
                <PostMeta
                  postFile={draft}
                  channel={channel}
                  className=""
                  excludeContextMenu={true}
                />
              )}
            </div>
            <div className="flex flex-row justify-end">
              {draft.fileId ? (
                <div onClick={(e) => e.stopPropagation()} className="m-1 flex-shrink-0">
                  <ActionButton
                    icon="trash"
                    type="remove"
                    confirmOptions={{
                      title: `${t('Remove')} "${draft.content.caption.substring(0, 50) ?? ''}"`,
                      buttonText: 'Permanently remove',
                      body: t(
                        'Are you sure you want to remove this draft? This action cannot be undone.'
                      ),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDraft({
                        channelId: draft.content.channelId,
                        postFileId: draft.fileId as string,
                      });
                      return false;
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </FakeAnchor>
      </div>
    </>
  );
};

export default DraftsDialog;
