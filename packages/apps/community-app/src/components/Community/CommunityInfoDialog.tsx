import { Link, useParams } from 'react-router-dom';
import { useCommunity } from '../../hooks/community/useCommunity';
import {
  usePortal,
  DialogWrapper,
  t,
  formatDateExludingYearIfCurrent,
  AuthorImage,
  AuthorName,
  ActionButton,
  Label,
  Input,
  ImageSelector,
  ActionLink,
  useDotYouClientContext,
  COMMUNITY_ROOT_PATH,
  useCircle,
  OWNER_ROOT,
  useRawImage,
} from '@homebase-id/common-app';
import { Circles, Clipboard } from '@homebase-id/common-app/icons';
import { useMemo, useState, type ChangeEvent } from 'react';
import {
  COMMUNITY_DEF_PROFILE_KEY,
  CommunityDefinition,
  getTargetDriveFromCommunityId,
} from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile, NewHomebaseFile, NewPayloadDescriptor } from '@homebase-id/js-lib/core';
import { createPortal } from 'react-dom';

export const CommunityInfoDialog = ({ onClose }: { onClose: () => void }) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;

  const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();
  const isCommunityOwner = community?.fileMetadata?.senderOdinId === loggedOnIdentity;

  const communityIcon = community?.fileMetadata.payloads?.find((p) =>
    p.key.includes(COMMUNITY_DEF_PROFILE_KEY)
  );

  const { data: defaultImage } = useRawImage({
    imageFileId: community?.fileId,
    imageFileKey: communityIcon?.key,
    // If we have a community, we can derive the drive from it
    imageDrive: community
      ? getTargetDriveFromCommunityId(community?.fileMetadata.appData.uniqueId as string)
      : undefined,
  }).fetch;

  const target = usePortal('modal-container');

  // Draft state for Server Profile edits
  const [draftTitle, setDraftTitle] = useState<string | undefined>(
    community?.fileMetadata.appData.content.title
  );
  const [draftImage, setDraftImage] = useState<NewPayloadDescriptor | undefined>(undefined);
  const { mutateAsync: updateCommunity, status: updateStatus } = useCommunity().update;

  const isDirty = useMemo(() => {
    if (!community) return false;
    const originalTitle = community.fileMetadata.appData.content.title || '';
    const hasTitleChange = (draftTitle ?? '') !== originalTitle;
    const hasImageChange = !!draftImage;
    return hasTitleChange || hasImageChange;
  }, [community, draftTitle, draftImage]);

  const doReset = () => {
    setDraftTitle(community?.fileMetadata.appData.content.title);
    setDraftImage(undefined);
  };

  const doSave = async () => {
    if (!community) return;
    const updated: Partial<NewHomebaseFile<CommunityDefinition>> &
      HomebaseFile<CommunityDefinition> = {
      ...(community as HomebaseFile<CommunityDefinition>),
      fileMetadata: {
        ...community.fileMetadata,
        appData: {
          ...community.fileMetadata.appData,
          content: {
            ...community.fileMetadata.appData.content,
            title: (draftTitle ?? '').trim(),
          },
        },
      },
    } as unknown as HomebaseFile<CommunityDefinition>;

    await updateCommunity({
      communityDef: updated,
      payloads: draftImage ? [draftImage] : undefined,
    });

    onClose();
  };

  if (!community) return null;
  const members = community.fileMetadata.appData.content.members;

  const dialog = (
    <>
      <DialogWrapper
        onClose={onClose}
        title={t(draftTitle || 'Community Info')}
        isSidePanel={true}
        keepOpenOnBlur={true}
        size={'2xlarge'}
      >
        <div className="w-full">
          {/* Main content */}
          <section>
            <div className="mb-6">
              <p className="mb-3 text-2xl font-semibold">{t('Server Profile')}</p>
              <p className="mb-4 text-sm text-slate-500">
                {t('Est.')}{' '}
                {formatDateExludingYearIfCurrent(new Date(community.fileMetadata.created))}
              </p>
              <div className="grid grid-cols-1 gap-6">
                {/* Left: fields */}
                <div className="flex flex-col gap-4">
                  <div>
                    <Label>{t('Name')}</Label>
                    <Input
                      className="max-w-md"
                      defaultValue={draftTitle}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraftTitle(e.target.value)}
                      disabled={!isCommunityOwner}
                    />
                  </div>
                  <div>
                    <Label>{t('Icon')}</Label>
                    <ImageSelector
                      id={community.fileId}
                      defaultValue={draftImage?.pendingFile || defaultImage?.url}
                      label={t('No image selected')}
                      onChange={(e: { target: { value?: Blob | string; name?: string } }) =>
                        setDraftImage(
                          e.target.value
                            ? {
                                pendingFile: e.target.value as Blob,
                                contentType:
                                  typeof e.target.value === 'object' &&
                                  'type' in (e.target.value as Blob)
                                    ? (e.target.value as Blob).type || 'image/png'
                                    : 'image/png',
                                descriptorContent: 'groupImage',
                              }
                            : undefined
                        )
                      }
                      disabled={!isCommunityOwner}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Members list (read-only) */}
            <div className="mt-4">
              <p className="mb-2 text-xl">{t('Members')}</p>
              <div className="flex flex-col gap-4">
                {members.map((recipient) => {
                  return (
                    <div
                      className="flex flex-col justify-between sm:flex-row sm:items-center"
                      key={recipient}
                      style={{
                        order: Array.from(recipient)
                          .map((char) => char.charCodeAt(0))
                          .reduce((acc, curr) => acc + curr, 0),
                      }}
                    >
                      <Link
                        to={`${COMMUNITY_ROOT_PATH}/${odinKey}/${communityKey}/direct/${recipient}`}
                        className="group flex flex-shrink flex-row items-center gap-3"
                        key={recipient}
                      >
                        <AuthorImage
                          odinId={recipient}
                          className="border border-neutral-200 dark:border-neutral-800"
                          size="sm"
                          excludeLink={true}
                        />
                        <div className="flex flex-col group-hover:underline">
                          <AuthorName odinId={recipient} excludeLink={true} />
                          <p className="text-slate-400">{recipient}</p>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {members.length > 1 ? (
                <div className="mt-4">
                  <InviteClickToCopy community={community} className="mb-1 mt-2" />
                  <p className="text-sm text-slate-400">
                    {t(
                      'This link only works for people that are already a member of the community. To add new members they first need to receive access to the community.'
                    )}
                  </p>
                </div>
              ) : null}

              {isCommunityOwner ? (
                <div className="mt-4">
                  <CircleLink community={community} className="mb-1 mt-2" />
                  <p className="text-sm text-slate-400">
                    {t(
                      'A community is directly linked to a circle. To add new members to the community, you have to add them into the circle.'
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Floating unsaved changes bar */}
        {isCommunityOwner && isDirty ? (
          <div className="pointer-events-auto fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-xl bg-slate-50 px-4 py-2 text-slate-700 shadow-lg dark:bg-slate-700 dark:text-white">
            <div className="flex items-center gap-3">
              <span>{t('Careful – you have unsaved changes!')}</span>
              <ActionLink type="secondary" onClick={doReset}>
                {t('Reset')}
              </ActionLink>
              <ActionButton type="primary" state={updateStatus} onClick={doSave}>
                {t('Save Changes')}
              </ActionButton>
            </div>
          </div>
        ) : null}
      </DialogWrapper>
    </>
  );

  return createPortal(dialog, target);
};

const InviteClickToCopy = ({
  community,
  className,
}: {
  community: HomebaseFile<CommunityDefinition>;
  className?: string;
}) => {
  const { mutateAsync: getInviteLink } = useCommunity().getInviteLink;
  const [showCopied, setShowCopied] = useState(false);

  const doCopy = async () => {
    const inviteLink = await getInviteLink({
      communityDef: community,
    });

    inviteLink && navigator.clipboard.writeText(inviteLink);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  return (
    <ActionButton
      className={`relative cursor-pointer ${className || ''}`}
      type="mute"
      size="none"
      onClick={doCopy}
    >
      <span className="flex flex-row items-center gap-2">
        {t('Copy member link')}

        <Clipboard className="h-5 w-5" />
      </span>
      {showCopied && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white dark:bg-slate-600">
            {t('Copied to clipboard')}
          </span>
        </div>
      )}
    </ActionButton>
  );
};

const CircleLink = ({
  community,
  className,
}: {
  community: HomebaseFile<CommunityDefinition>;
  className?: string;
}) => {
  const communityCircleId = community.fileMetadata.appData.content.acl.circleIdList?.[0];

  const { data: circle } = useCircle({ circleId: communityCircleId }).fetch;
  if (!communityCircleId || !circle) return null;

  return (
    <ActionLink
      className={`${className || ''}`}
      href={`${OWNER_ROOT}/circles/${communityCircleId}`}
      type="mute"
      size="none"
      icon={Circles}
    >
      {t('Manage circle')}
    </ActionLink>
  );
};
