import { useState } from 'react';
import { t } from '@youfoundation/common-app';
import { useProfiles } from '@youfoundation/common-app';
import ActionButton from '../../../components/ui/Buttons/ActionButton';
import ProfileDialog from '../../../components/Dialog/ProfileDialog/ProfileDialog';
import { Heart } from '@youfoundation/common-app';
import { PageMeta } from '@youfoundation/common-app';
import { LoadingParagraph } from '@youfoundation/common-app';
import CardLink from '../../../components/ui/Buttons/CardLink';
import { BuiltInProfiles } from '@youfoundation/js-lib';

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
              <ActionButton icon="plus" onClick={() => setIsOpenCreate(true)}>
                {t('Add Profile')}
              </ActionButton>
            </>
          }
        />
        {isLoading ? (
          <div className="-m-2 flex">
            <LoadingParagraph className="m-2 h-10 w-1/4" />
            <LoadingParagraph className="m-2 h-10 w-1/4" />
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
