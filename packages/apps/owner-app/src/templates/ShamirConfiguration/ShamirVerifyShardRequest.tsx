import {
  useRemoveNotifications,
  OWNER_APP_ID,
} from '@homebase-id/common-app';
import {useEffect} from 'react';
import {PageMeta} from '@homebase-id/common-app';
import {Persons} from '@homebase-id/common-app/icons';

const ShamirVerifyShardRequest = () => {
  useRemoveNotifications({appId: OWNER_APP_ID});

  // const {getDotYouClient} = useDotYouClient();
  // const handleConfirm = () => {
  //   reset();
  // }

  const reset = async () => {
    // const client = getDotYouClient();
  }

  useEffect(() => {
    reset();
  }, []);

  return (
    <>
      <PageMeta
        icon={Persons}
        title={'Verify Shard Requests'}
        actions={
          <>
            {/*<ActionButton onClick={() => setIsConfigurationOpen(true)} icon={Cog}>*/}
            {/*  {t('Configure')}*/}
            {/*</ActionButton>*/}
          </>
        }
      />
      <div>

        TODO: show all requests
      </div>
    </>
  );
};

export default ShamirVerifyShardRequest;