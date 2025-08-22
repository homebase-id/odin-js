import {
  useRemoveNotifications,
  OWNER_APP_ID,
  ActionButton,
  t,
  SubtleMessage,
  useDotYouClient,
} from '@homebase-id/common-app';
import {SectionTitle} from '../../components/ui/Sections/Section';
import {useEffect, useState} from 'react';
import {PageMeta} from '@homebase-id/common-app';
import {Cog, Persons, Plus} from '@homebase-id/common-app/icons';
import {ShamirDistributionDialog} from "./ShamirDistributionDialog";
import {DealerShardConfig, getShamirConfiguration} from "../../provider/auth/ShamirProvider";
import {PlayerStatusList} from "./PlayerStatusList";

const ShamirConfiguration = () => {
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [shardConfig, setshardConfig] = useState<DealerShardConfig | null>(null);
  useRemoveNotifications({appId: OWNER_APP_ID});

  const {getDotYouClient} = useDotYouClient();
  const handleConfirm = () => {
    setIsConfigurationOpen(false);
  }

  useEffect(() => {
    const client = getDotYouClient();
    getShamirConfiguration(client).then(cfg => {
      setshardConfig(cfg);
    })
  }, []);

  return (
    <>
      <PageMeta
        icon={Persons}
        title={'Shamira Shamira'}
        actions={
          <>
            <ActionButton onClick={() => setIsConfigurationOpen(true)} icon={Cog}>
              {t('Configure')}
            </ActionButton>
            {/*<ActionGroup*/}
            {/*  options={[*/}
            {/*    {*/}
            {/*      label: t('Introduce'),*/}
            {/*      icon: Persons,*/}
            {/*      onClick: () => setIsIntroduceOpen(true),*/}
            {/*    },*/}
            {/*  ]}*/}
            {/*  type="mute"*/}
            {/*/>*/}
          </>
        }
      />

      {!shardConfig ? (
        <SubtleMessage className="flex flex-row items-center gap-3">
          <span>{t('You have not yet configured shamir password recovery.')}</span>
          <ActionButton
            onClick={(e) => {
              e.preventDefault();
              setIsConfigurationOpen(true);

              return false;
            }}
            type="secondary"
            icon={Plus}
          >
            {t('Get started')}
          </ActionButton>
        </SubtleMessage>
      ) : null}

      {shardConfig &&
          <>
              <SectionTitle title="Shamir Shard Holders"/>
              <PlayerStatusList config={shardConfig}/>
          </>
      }

      <ShamirDistributionDialog
        title={t('Configure new password recovery')}
        isOpen={isConfigurationOpen}
        onConfirm={() => handleConfirm}
        onCancel={() => setIsConfigurationOpen(false)}
      />
    </>
  );
};

export default ShamirConfiguration;