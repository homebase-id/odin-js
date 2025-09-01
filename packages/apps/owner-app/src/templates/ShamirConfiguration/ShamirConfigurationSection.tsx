import {
  useRemoveNotifications,
  OWNER_APP_ID,
  ActionButton,
  t,
  SubtleMessage,
  useDotYouClient, Label, formatDateExludingYearIfCurrent,
} from '@homebase-id/common-app';
import {useEffect, useState} from 'react';
import {Arrow, Plus} from '@homebase-id/common-app/icons';
import {ShamirDistributionDialog} from "./ShamirDistributionDialog";
import {DealerShardConfig, getShamirConfiguration} from "../../provider/auth/ShamirProvider";
import {PlayerStatusList} from "./PlayerStatusList";

const ShamirConfigurationSection = () => {
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

  return (
    <>
      <div className="mb-2">
        <Label>{t('Your recovery key is split among trusted people you choose. You can share with many, but only need some of them to help you get back in.')}</Label>

        <SubtleMessage className="flex flex-row items-center gap-3">
          <details className="space-y-3 not-italic">
            <summary className="cursor-pointer text-blue-600 hover:underline">
              Say more…
            </summary>
            <ol className="list-decimal pl-5 space-y-3 mt-3">
              <li>
                <strong>Choose trusted people</strong> – Pick friends, family, or colleagues to hold recovery pieces.
              </li>
              <li>
                <strong>Set the rules</strong> – Decide how many must help you regain access.
              </li>
              <li>
                <strong>Share the pieces</strong> – Each trusted person gets a secure part of a random key. It only has
                meaning to you.
              </li>
              <li>
                <strong>Forgot your password?</strong> – Start recovery and we’ll ask your trusted people to share their
                piece.
              </li>
              <li>
                <strong>Recover your account</strong> – Once enough pieces are combined, your key is restored and you 
                can reset your password.  We'll email you a link to the recovery page
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
  );
};

export default ShamirConfigurationSection;