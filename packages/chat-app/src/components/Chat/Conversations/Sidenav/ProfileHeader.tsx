import {
  ActionButton,
  ActionGroup,
  ActionLink,
  ChevronDown,
  House,
  Moon,
  Person,
  Plus,
  Sun,
  Times,
  t,
  useDarkMode,
  useDotYouClient,
  useSiteData,
} from '@youfoundation/common-app';
import { OdinImage } from '@youfoundation/ui-lib';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { useAuth } from '../../../../hooks/auth/useAuth';
import { CHAT_ROOT } from '../../../../templates/Chat/ChatHome';

export const ProfileHeader = ({ closeSideNav }: { closeSideNav: (() => void) | undefined }) => {
  const { data } = useSiteData();
  const { getIdentity, getDotYouClient } = useDotYouClient();
  const dotYouClient = getDotYouClient();
  const odinId = getIdentity() || undefined;
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const { logout } = useAuth();

  return (
    <div className="flex flex-row items-center gap-2 p-5">
      <OdinImage
        dotYouClient={dotYouClient}
        targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
        fileId={data?.owner.profileImageFileId}
        fileKey={data?.owner.profileImageFileKey}
        lastModified={data?.owner.profileImageLastModified}
        previewThumbnail={data?.owner.profileImagePreviewThumbnail}
        className="aspect-square max-h-[2.5rem] w-full max-w-[2.5rem] rounded-full border border-neutral-200 dark:border-neutral-800"
        fit="cover"
        odinId={odinId}
      />
      <ActionGroup
        type="mute"
        options={[
          {
            label: 'Open your owner profile',
            href: '/owner',
            icon: House,
          },
          {
            label: 'Logout',
            onClick: () => logout(),
            icon: Person,
          },
          isDarkMode
            ? {
                label: 'Light mode',
                icon: Sun,
                onClick: toggleDarkMode,
              }
            : {
                label: 'Dark mode',
                icon: Moon,
                onClick: () => toggleDarkMode(),
              },
        ]}
      >
        <ChevronDown className="h-4 w-4" />
      </ActionGroup>
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
