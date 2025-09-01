import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ActionButton, DialogWrapper, t, useDotYouClient, usePortal,} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';
import {PlayerMode, Step1SelectPlayers} from "./Step1SelectPlayers";
import {Step2OtherOptions} from "./Step2OtherOptions";
import {DistributeShards} from "./DistributeShards";
import {configureShards, ConfigureShardsRequest, PlayerType} from "../../provider/auth/ShamirProvider";

interface Player {
  odinId: string;
  mode: PlayerMode;
}

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
  // const [players, setPlayers] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [minShards, setMinShards] = useState(3);
  const client = useDotYouClient().getDotYouClient();
  const [validationError, setValidationError] = useState<string | null>(null);

  const reset = () => {
    setStepNumber(0);
    setPlayers([]);
    setMinShards(3);
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

  const handleStep3Finalize = async () => {

    setValidationError(null);

    const request: ConfigureShardsRequest = {
      players: players.map(p => {
        return {
          odinId: p.odinId,
          type: p.mode == "automated" ? PlayerType.Automatic : PlayerType.Delegate
        }
      }),
      minMatchingShards: minShards
    };

    await configureShards(client, request);

    // now we need to 
    reset();
    onConfirm();

  }

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={title}
      onClose={() => {
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge">
      <>
        {validationError && <span className="text-red-500">{validationError}</span>}
        {/*<ErrorNotification error={}/>*/}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            // start config process
          }}>

          {stepNumber === 0 && (
            <>
              <Step1SelectPlayers
                addContact={(newContact) => {
                  if (players.find((p) => p.odinId === newContact)) {
                    return;
                  }
                  setPlayers([...players, {odinId: newContact, mode: "automated"}]);
                }}
                removeContact={(contact) => {
                  setPlayers(players.filter((p) => p.odinId !== contact));
                }}
                updateContactMode={(contact, mode) => {
                  setPlayers(
                    players.map((p) =>
                      p.odinId === contact ? {...p, mode} : p
                    )
                  );
                }}
                defaultValue={players.map((p) => p.odinId)}
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

              <Step2OtherOptions minShards={minShards} onChange={(s) => setMinShards(s)}/>

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
              <DistributeShards config={{
                players: players.map(p => {
                  return {
                    odinId: p.odinId,
                    type: p.mode == "automated" ? PlayerType.Automatic : PlayerType.Delegate
                  }
                }),
                minMatchingShards: minShards
              }}/>

              <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                <ActionButton onClick={() => handleStep3Finalize()} icon={Arrow}>
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
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
