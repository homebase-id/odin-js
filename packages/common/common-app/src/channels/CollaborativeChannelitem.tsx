import { ApiType, OdinClient, HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';

import {
  CollaborativeChannelDefinition,
  RemoteCollaborativeChannelDefinition,
} from '@homebase-id/js-lib/public';
import { t } from '../helpers/i18n/dictionary';
import { AclSummary } from '../acl/AclInfo/AclInfo';
import { Persons } from '../ui/Icons/Persons';
import { ActionLink } from '../ui';
import { ExternalLink } from '../ui/Icons';

export const CollaborativeChannelItem = ({
  odinId,
  className,
  chnlDsr,
  children,
}: {
  odinId: string;
  className?: string;
  chnlDsr:
    | HomebaseFile<CollaborativeChannelDefinition | RemoteCollaborativeChannelDefinition>
    | NewHomebaseFile<CollaborativeChannelDefinition | RemoteCollaborativeChannelDefinition>;
  children?: React.ReactNode;
}) => {
  const chnl = chnlDsr?.fileMetadata.appData.content;

  return (
    <div
      className={`${
        className ?? ''
      } rounded-md border border-slate-100 px-4 py-4 dark:border-slate-800`}
    >
      <div className="flex flex-row items-center gap-2">
        <h2 className="text-lg">
          {chnl.name}{' '}
          {chnlDsr?.serverMetadata?.accessControlList ? (
            <small className="text-xs mr-1">
              ({<AclSummary acl={chnlDsr?.serverMetadata?.accessControlList} />})
            </small>
          ) : null}
          <small className="text-xs">({odinId})</small>
          <small className="text-md block">{chnl.description}</small>
        </h2>
        <span className="ml-auto"></span>
        {children}
        {chnl?.isCollaborative ? (
          <p title={t('Collaborative')}>
            <Persons className="w-5 h-5" />
          </p>
        ) : null}
        <ActionLink
          icon={ExternalLink}
          size="square"
          type="mute"
          href={`${new OdinClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot()}/posts/${chnl?.slug}`}
        ></ActionLink>
      </div>
    </div>
  );
};
