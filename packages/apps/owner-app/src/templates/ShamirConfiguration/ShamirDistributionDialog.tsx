import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ActionButton, DialogWrapper, t, usePortal,} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';
import {Step1SelectPlayers} from "./Step1SelectPlayers";
import {Step2OtherOptions} from "./Step2OtherOptions";
import {Step3Finalize} from "./Step3Finalize";
import {PlayerType} from "../../provider/auth/ShamirProvider";

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
        {/*<ErrorNotification error={actionError || followError}/>*/}

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
                <ActionButton onClick={() => setStepNumber(1)} icon={Arrow}>
                  {t('Next')}
                </ActionButton>
                <ActionButton
                  className="sm:mr-auto"
                  type="secondary"
                  onClick={() => {
                    setStepNumber(0);
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
                  onClick={() => setStepNumber(stepNumber + 1)}
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
                    setStepNumber(0);
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
              <Step3Finalize config={{
                players: players.map(p => {
                  return {
                    odinId: p,
                    type: PlayerType.Delegate
                  }
                }),
                minMatchingShards: minShards,
                totalShards: players.length,
              }}/>

              <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                <ActionButton onClick={() => setStepNumber(1)} icon={Arrow}>
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
                    setStepNumber(0);
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
