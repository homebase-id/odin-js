import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ActionButton, DialogWrapper, t, useDotYouClient, usePortal,} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';
import {Step1SelectPlayers} from "./Step1SelectPlayers";
import {Step2OtherOptions} from "./Step2OtherOptions";
import {DistributeShards} from "./DistributeShards";
import {configureShards, ConfigureShardsRequest, PlayerType} from "../../provider/auth/ShamirProvider";

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

  const target = usePortal('modal-container');
  const [stepNumber, setStepNumber] = useState(0);
  const [players, setPlayers] = useState<string[]>([]);
  const [minShards, setMinShards] = useState(3);
  const client = useDotYouClient().getDotYouClient();
  const [validationError, setValidationError] = useState<string | null>(null);

  const reset = () => {
    setStepNumber(0);
    setPlayers([]);
    setMinShards(3);
  }

  const handleStep1Next = () => {
    if (players.length < 3) {
      setValidationError(t('You must select at least 3 players'));
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
          odinId: p,
          type: PlayerType.Delegate
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
                  setPlayers([...players.filter((x) => x !== newContact), newContact]);
                }}

                removeContact={(contact) => {
                  setPlayers([...players.filter((x) => x !== contact), contact]);
                }}

                defaultValue={players}
              />

              <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                <ActionButton onClick={() => handleStep1Next()} icon={Arrow}>
                  {t('Next')}
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
                    odinId: p,
                    type: PlayerType.Delegate
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
