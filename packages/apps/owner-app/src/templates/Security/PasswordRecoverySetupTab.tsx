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

export const PasswordRecoverySetupTab = () => {
 
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const [shardConfig, setShardConfig] = useState<DealerShardConfig | null>(null);
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
  }

  useEffect(() => {
    reset();
  }, []);
  
  const systemSettingsLoading = false; //todo for loading
  return (
    <>
      {/*<ErrorNotification error={updateFlagError}/>*/}
      {!systemSettingsLoading && (
        <>
          <Section title={
            <div className="flex flex-col">
              <small className="text-sm text-gray-400">
                {t('Your recovery key is split among trusted people you choose. You can share with many, but only need some of them to help you get back in.')}
              </small>
            </div>
          }>

            <>
              <div className="mb-2">

                <SubtleMessage className="flex flex-row items-center gap-3">
                  <details className="space-y-3 not-italic">
                    <summary className="cursor-pointer text-blue-600 hover:underline">
                      Say more…
                    </summary>
                    <ol className="list-decimal pl-5 space-y-3 mt-3">
                      <li>
                        <strong>Choose trusted people</strong> – Pick friends, family, or colleagues to hold recovery
                        pieces.
                      </li>
                      <li>
                        <strong>Set the rules</strong> – Decide how many must help you regain access.
                      </li>
                      <li>
                        <strong>Share the pieces</strong> – Each trusted person gets a secure part of a random key. It
                        only has
                        meaning to you.
                      </li>
                      <li>
                        <strong>Forgot your password?</strong> – Start recovery and we’ll ask your trusted people to
                        share their
                        piece.
                      </li>
                      <li>
                        <strong>Recover your account</strong> – Once enough pieces are combined, your key is restored
                        and you
                        can reset your password. We will email you a link to the recovery page
                      </li>
                    </ol>
                  </details>
                </SubtleMessage>

                <SubtleMessage className="flex flex-row items-center gap-3">
                  {t('You can change this at any time.')}
                </SubtleMessage>


                {shardConfig && (<ActionButton
                  onClick={(e) => {
                    e.preventDefault();
                    setIsConfigurationOpen(true);
                    return false;
                  }}
                  type="secondary"
                  icon={Arrow}>
                  {t('Change now?')}
                </ActionButton>)}
              </div>

              <hr className="mb-5"/>

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

              {shardConfig && <PlayerStatusList config={shardConfig}/>}

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
