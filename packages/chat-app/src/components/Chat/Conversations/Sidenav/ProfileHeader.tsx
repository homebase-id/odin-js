import { ActionButton, ActionLink, Plus, Times, t } from '@youfoundation/common-app';
import { CHAT_ROOT } from '../../../../templates/Chat/ChatHome';

export const ProfileHeader = ({ closeSideNav }: { closeSideNav: (() => void) | undefined }) => {
  return (
    <div className="flex flex-row items-center gap-2 p-2 lg:p-5">
      <p className="text-2xl dark:text-white">Homebase Chat</p>
      {/* <OdinImage
        dotYouClient={dotYouClient}
        targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
        fileId={data?.owner.profileImageFileId}
        fileKey={data?.owner.profileImageFileKey}
        lastModified={data?.owner.profileImageLastModified}
        previewThumbnail={data?.owner.profileImagePreviewThumbnail}
        className="aspect-square max-h-[2.5rem] w-full max-w-[2.5rem] rounded-full border border-neutral-200 dark:border-neutral-800"
        fit="cover"
        odinId={odinId}
      /> */}
      {/* <ActionGroup
        type="mute"
        options={[
          {
            label: 'Logout',
            onClick: () => logout(),
            icon: Person,
          },
        ]}
      ><ChevronDown className="h-4 w-4" /></ActionGroup> */}
      <div className="ml-auto flex flex-row items-center gap-2">
        <ActionLink href={`${CHAT_ROOT}/new`} icon={Plus} type="secondary">
          {t('New')}
        </ActionLink>
        {closeSideNav ? (
          <ActionButton className="lg:hidden" type="mute" onClick={closeSideNav}>
            <Times className="h-5 w-5" />
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
};
