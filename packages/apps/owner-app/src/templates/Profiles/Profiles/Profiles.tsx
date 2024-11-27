import { useState } from 'react';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { BuiltInProfiles } from '@homebase-id/js-lib/profile';
import { PageMeta } from '@homebase-id/common-app';
import ProfileDialog from '../../../components/Attribute/ProfileDialog/ProfileDialog';
import { ActionButton, LoadingBlock, t, useProfiles } from '@homebase-id/common-app';
import { Heart, Plus } from '@homebase-id/common-app/icons';

const Profiles = () => {
  const { data: profiles, isLoading } = useProfiles().fetchProfiles;
  const [isOpenCreate, setIsOpenCreate] = useState(false);

  return (
    <>
      <section>
        <PageMeta
          icon={Heart}
          title={t('Social Presence')}
          actions={
            <>
              <ActionButton icon={Plus} onClick={() => setIsOpenCreate(true)}>
                {t('Add Profile')}
              </ActionButton>
            </>
          }
        />
        {isLoading ? (
          <div className="flex gap-2">
            <LoadingBlock className="h-10 w-1/4" />
            <LoadingBlock className="h-10 w-1/4" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {profiles
              ?.filter((profile) => profile.profileId !== BuiltInProfiles.WalletId)
              ?.map((definition) => (
                <CardLink
                  href={`/owner/profile/${definition.slug}`}
                  title={definition.name}
                  description={definition.description}
                  key={definition.name}
                />
              ))}
            <CardLink
              href={`/owner/profile/homepage`}
              title={t('Homepage')}
              description={t('Edit your online identity')}
            />
            <CardLink
              href={`/owner/follow`}
              title={t('Following & Followers')}
              description={t('Who do you follow, and who follows you')}
            />
          </div>
        )}
      </section>
      <ProfileDialog
        isOpen={isOpenCreate}
        title={t('New Profile')}
        onCancel={() => {
          setIsOpenCreate(false);
        }}
        onConfirm={() => {
          setIsOpenCreate(false);
        }}
      />
    </>
  );
};

export default Profiles;
