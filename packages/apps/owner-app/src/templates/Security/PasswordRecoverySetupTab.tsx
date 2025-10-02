import {
  ActionButton,
  OWNER_APP_ID,
  SubtleMessage,
  t, useDotYouClient,
  useRemoveNotifications
} from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import {Arrow} from "@homebase-id/common-app/icons";
import {PlayerStatusList} from "./ShamirConfiguration/PlayerStatusList";
import {ShamirDistributionDialog} from "./ShamirConfiguration/ShamirDistributionDialog";
import {useEffect, useState} from "react";
import {DealerShardConfig, getShamirConfiguration} from "../../provider/auth/ShamirProvider";
import {getRecoveryInfo, RecoveryInfo} from "../../provider/auth/SecurityHealthProvider";
import {RevealRecoveryKey} from "./RevealRecoveryKey";

export const PasswordRecoverySetupTab = () => {

  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [shardConfig, setShardConfig] = useState<DealerShardConfig | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);
  useRemoveNotifications({appId: OWNER_APP_ID});

  const {getDotYouClient} = useDotYouClient();
  const handleConfirm = () => {
    setIsConfigurationOpen(false);
    reset();
  }

  const reset = async () => {
    const client = getDotYouClient();
    getShamirConfiguration(client).then(cfg => {
      setShardConfig(cfg);
    });

    getRecoveryInfo().then(info => {
      setRecoveryInfo(info);
    });
  }

  useEffect(() => {
    reset();
  }, []);

  const systemSettingsLoading = false; //todo for loading
  return (
    <>

      {/*<Section title={*/}
      {/*  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">*/}
      {/*    <div className="flex-1">*/}
      {/*      <span className="block text-lg">{t('Recovery Phrase')}</span>*/}
      {/*      <div className="mt-1 text-sm text-gray-400">*/}
      {/*        {t(*/}
      {/*          'Your recovery phrase lets you reset your password if you ever forget it.  Request your key by clicking the button below.  There is a 2-week waiting period to get your key'*/}
      {/*        )}*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*}>*/}
      {/*  <RevealRecoveryKey/>*/}
      {/*</Section>*/}

      {/*<ErrorNotification error={updateFlagError}/>*/}
      {!systemSettingsLoading && (
        <>
          <Section title={
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <span className="block text-lg">{t('Recovery Key Setup')}</span>
                <div className="mt-1 text-sm text-gray-400">
                  {t(
                    'Your recovery key is split among trusted people you choose. You can share with many, but only need some of them to help you get back in.'
                  )}
                </div>
              </div>
              <div className="sm:flex-shrink-0">
                {shardConfig && (
                  <ActionButton
                    onClick={(e) => {
                      e.preventDefault();
                      setIsConfigurationOpen(true);
                      return false;
                    }}
                    type="secondary"
                    icon={Arrow}
                  >
                    {t('Change now?')}
                  </ActionButton>
                )}
              </div>
            </div>
          }>
            <>
              {!shardConfig ? (
                <SubtleMessage className="flex flex-row items-center gap-3">
                  <ActionButton
                    onClick={(e) => {
                      e.preventDefault();
                      setIsConfigurationOpen(true);

                      return false;
                    }}
                    type="primary"
                    icon={Arrow}
                  >
                    {t('Get started')}
                  </ActionButton>
                </SubtleMessage>
              ) : null}

              {recoveryInfo && <PlayerStatusList report={recoveryInfo.recoveryRisk}/>}

              <ShamirDistributionDialog
                title={t('Configure new password recovery')}
                isOpen={isConfigurationOpen}
                onConfirm={() => handleConfirm()}
                onCancel={() => setIsConfigurationOpen(false)}
              />
            </>

          </Section>
        </>
      )}
    </>
  );
};
