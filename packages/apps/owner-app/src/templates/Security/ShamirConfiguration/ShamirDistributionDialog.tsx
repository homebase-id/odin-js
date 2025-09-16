import {useEffect, useState} from 'react';
import {ActionButton, DialogWrapper, LoadingBlock, t, useDotYouClient, usePortal,} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';
import {Step1SelectPlayers} from "./Step1SelectPlayers";
import {Step2OtherOptions} from "./Step2OtherOptions";
import {DistributeShardsReview} from "./DistributeShardsReview";
import {
  configureShards,
  ConfigureShardsRequest,
  PlayerType,
  ShamiraPlayer
} from "../../../provider/auth/ShamirProvider";
import {createPortal} from "react-dom";
import {PlayerStatusList} from "./PlayerStatusList";
import {getRecoveryInfo, RecoveryInfo, ShardTrustLevel} from "../../../provider/auth/SecurityHealthProvider";
import {TimeAgoUtc} from "../../../components/ui/Date/TimeAgoUtc";
import {DealerRecoveryRiskOverview} from "../DealerRecoveryRiskOverview";

export const ShamirDistributionDialog = ({
                                           title,
                                           isOpen,
                                           onConfirm,
                                           onCancel,
                                         }: {
  title: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {

  const minPlayers = 3;
  const target = usePortal('modal-container');
  const [stepNumber, setStepNumber] = useState(0);
  const [players, setPlayers] = useState<ShamiraPlayer[]>([]);
  const [minShards, setMinShards] = useState(3);
  const client = useDotYouClient().getDotYouClient();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [awaitConfigureShardsRequest, setAwaitConfigureShardsRequest] = useState<ConfigureShardsRequest | null>(null);

  const reset = () => {
    setStepNumber(0);
    setPlayers([]);
    setMinShards(3);
    setAwaitConfigureShardsRequest(null);
    setValidationError(null);

  }

  const handleStep1Next = () => {
    if (players.length < minPlayers) {
      setValidationError(t(`You must select at least ${minPlayers} players`));
      return;
    }

    setValidationError(null);
    setStepNumber(stepNumber + 1)

  }

  const handleStep2Next = () => {
    if (minShards < 1) {
      setValidationError(t('Min shards cannot be less than 1'));
      return;
    }

    if (minShards > players.length) {
      setValidationError(t('Min shards cannot be more than total players'));
      return;
    }

    setValidationError(null);
    setStepNumber(stepNumber + 1)
  }

  const startConfigureShards = async () => {

    setValidationError(null);

    const request: ConfigureShardsRequest = {
      players: players.map(p => {
        return {
          odinId: p.odinId,
          type: p.type
        }
      }),
      minMatchingShards: minShards
    };

    setAwaitConfigureShardsRequest(request);
    await configureShards(client, request);
  }

  const close = () => {
    reset();
    onConfirm();
  }

  const addPlayer = (odinId: string) => {
    if (players.find((p) => p.odinId === odinId)) {
      return;
    }
    setPlayers([...players, {odinId: odinId, type: PlayerType.Automatic}]);
  }
  const removePlayer = (odinId: string) => {
    setPlayers(players.filter((p) => p.odinId !== odinId));
  }

  const updatePlayerType = (odinId: string, type: PlayerType) => {
    setPlayers(
      players.map((p) =>
        p.odinId === odinId ? {...p, type} : p
      )
    );
  }

  if (!isOpen) return null;

  const cfg: ConfigureShardsRequest =
    {
      players: players.map(p => {
        return {
          odinId: p.odinId,
          type: p.type
        }
      }),
      minMatchingShards: minShards
    }

  const dialog = (
    <DialogWrapper
      title={title}
      onClose={() => {
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge">
      {awaitConfigureShardsRequest != null ? (
        <>
          <WaitForShardConfig request={awaitConfigureShardsRequest}/>
          <div className="mt-4 flex w-full flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton onClick={() => close()}>
              {t('Close')}
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          {validationError && <span className="text-red-500">{validationError}</span>}
          {/*<ErrorNotification error={}/>*/}

          <form onSubmit={async (e) => {
            e.preventDefault();
            // start config process
          }}>

            {stepNumber === 0 && (
              <>
                <Step1SelectPlayers
                  addPlayer={addPlayer}
                  removePlayer={removePlayer}
                  updatePlayerType={updatePlayerType}
                  players={players}
                />

                <div className="sticky bottom-0 mt-6 flex flex-col gap-2 border-t border-slate-200
                 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row-reverse">

                  <div className="flex w-full flex-col gap-2 py-3 sm:flex-row-reverse">
                    <ActionButton onClick={() => handleStep1Next()} icon={Arrow}>
                      {t('Next')}
                    </ActionButton>
                    <ActionButton
                      className="sm:mr-auto"
                      type="secondary"
                      onClick={() => {
                        reset();
                        onCancel();
                      }}>
                      {t('Cancel')}
                    </ActionButton>
                  </div>
                </div>
              </>
            )}

            {stepNumber === 1 && (
              <>
                <Step2OtherOptions
                  config={cfg}
                  removePlayer={undefined}
                  updatePlayerType={updatePlayerType}
                  onChange={(s) => setMinShards(s)}/>
                <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                  <ActionButton
                    onClick={() => handleStep2Next()}
                    icon={Arrow}>
                    {t('Next')}
                  </ActionButton>
                  <ActionButton
                    onClick={(e) => {
                      setStepNumber(stepNumber - 1);
                      e.preventDefault();
                    }}
                    type={'secondary'}
                  >
                    {t('Back')}
                  </ActionButton>
                  <ActionButton
                    className="sm:mr-auto"
                    type="secondary"
                    onClick={() => {
                      reset();
                      onCancel();
                    }}
                  >
                    {t('Cancel')}
                  </ActionButton>
                </div>
              </>

            )}

            {stepNumber === 2 && (
              <>
                <DistributeShardsReview config={cfg}/>

                <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                  <ActionButton onClick={() => startConfigureShards()} icon={Arrow}>
                    {t('Distribute')}
                  </ActionButton>
                  <ActionButton
                    onClick={(e) => {
                      setStepNumber(stepNumber - 1);
                      e.preventDefault();
                    }}
                    type={'secondary'}>
                    {t('Back')}
                  </ActionButton>
                  <ActionButton
                    className="sm:mr-auto"
                    type="secondary"
                    onClick={() => {
                      reset();
                      onCancel();
                    }}>
                    {t('Cancel')}
                  </ActionButton>
                </div>
              </>
            )}
          </form>
        </>)}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};


function WaitForShardConfig({request}: { request: ConfigureShardsRequest }) {
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let elapsedSec = 0;

    const fetchOnce = async () => {
      const cfg = await getRecoveryInfo(true);
      if (isMounted) setRecoveryInfo(cfg);
    };

    // immediate fetch
    fetchOnce();

    // polling + elapsed counter
    const POLL_INTERVAL_MS = 10_000; // every 10s
    const interval = setInterval(() => {
      elapsedSec += POLL_INTERVAL_MS / 1000;
      if (isMounted) setElapsed(elapsedSec);
      fetchOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [request]);

  // stop polling if recoverable
  useEffect(() => {
    if (recoveryInfo?.recoveryRisk?.isRecoverable) {
      // 🎉 recoverable — could clear interval if you want, 
      // or let the effect above stop automatically when component unmounts
    }
  }, [recoveryInfo]);

  // after X seconds, show issue message
  const SHOW_AFTER_SEC = 60; // e.g. 1 minute
  const hasIssue = elapsed >= SHOW_AFTER_SEC && !recoveryInfo?.recoveryRisk?.isRecoverable;

  const badShards =
    recoveryInfo?.recoveryRisk?.players.filter(
      (p) => !p.isValid || p.isMissing || p.trustLevel === ShardTrustLevel.RedAlert
    ) ?? [];

  if (hasIssue) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        You have an issue with one or more of your shards:
        <ul className="list-disc ml-5 mt-2">
          {badShards.map((p) => (
            <li key={p.player.odinId}>{p.player.odinId}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (recoveryInfo?.recoveryRisk) {
    return (
      <>
        <PlayerStatusList report={recoveryInfo.recoveryRisk}/>
      </>
    );
  }

  return (
    <>
      <LoadingBlock className="my-2 h-4"/>
      <LoadingBlock className="my-2 h-4"/>
      <LoadingBlock className="my-2 h-4"/>
    </>
  );
}

