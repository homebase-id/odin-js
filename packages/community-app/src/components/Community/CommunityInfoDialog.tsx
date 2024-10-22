import { useParams } from 'react-router-dom';
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
} from '@homebase-id/common-app';
import { createPortal } from 'react-dom';
import { Clipboard } from '@homebase-id/common-app/icons';
import { useState } from 'react';
import { CommunityDefinition } from '../../providers/CommunityDefinitionProvider';
import { HomebaseFile } from '@homebase-id/js-lib/core';

export const CommunityInfoDialog = ({ onClose }: { onClose: () => void }) => {
  const { communityKey } = useParams();
  const { data: community } = useCommunity({ communityId: communityKey }).fetch;

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
                <div className="flex flex-row items-center justify-between" key={recipient}>
                  <div className="flex flex-row items-center gap-2">
                    <AuthorImage
                      odinId={recipient}
                      className="border border-neutral-200 dark:border-neutral-800"
                      size="sm"
                    />
                    <AuthorName odinId={recipient} />
                  </div>
                  {recipient !== identity ? <InviteClickToCopy community={community} /> : null}
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

const InviteClickToCopy = ({ community }: { community: HomebaseFile<CommunityDefinition> }) => {
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
    <ActionButton className="relative cursor-pointer" type="mute" onClick={doCopy}>
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
