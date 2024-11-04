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
  useDotYouClient,
  COMMUNITY_ROOT_PATH,
} from '@homebase-id/common-app';
import { createPortal } from 'react-dom';
import { Clipboard } from '@homebase-id/common-app/icons';
import { useState } from 'react';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile } from '@homebase-id/js-lib/core';

export const CommunityInfoDialog = ({ onClose }: { onClose: () => void }) => {
  const { odinKey, communityKey } = useParams();
  const { data: community } = useCommunity({ odinId: odinKey, communityId: communityKey }).fetch;

  const identity = useDotYouClient().getIdentity();

  const target = usePortal('modal-container');

  if (!community) return null;
  const members = community.fileMetadata.appData.content.members;

  const dialog = (
    <DialogWrapper onClose={onClose} title={community.fileMetadata.appData.content.title}>
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xl">{t('Details')}</p>
          <p>
            {t('Created')}:{' '}
            {formatDateExludingYearIfCurrent(new Date(community.fileMetadata.created))}
          </p>
        </div>

        <div>
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
                  {recipient !== identity ? (
                    <InviteClickToCopy community={community} className="hidden sm:block" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DialogWrapper>
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
      onClick={doCopy}
    >
      <span className="flex flex-row items-center gap-2">
        {t('Copy invite link')}

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
