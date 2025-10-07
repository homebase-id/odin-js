import {useState} from 'react';
import {ActionButton, DialogWrapper, t, useDotYouClient, usePortal,} from '@homebase-id/common-app';
import {Arrow, Person} from '@homebase-id/common-app/icons';
import {Step2SelectPlayers} from "./Step2SelectPlayers";
import {Step3OtherOptions} from "./Step3OtherOptions";
import {DistributeShardsReview} from "./DistributeShardsReview";
import {
  configureShards,
  ConfigureShardsRequest,
  PlayerType,
  ShamiraPlayer,
  ShamirConfigurationType
} from "../../../provider/auth/ShamirProvider";
import {createPortal} from "react-dom";
import {WaitForShardConfig} from "./WaitForShardConfig";
import {Step1SelectConfigurationType} from "./Step1SelectConfigurationType";
import {enableAutoPasswordRecovery} from "../../../provider/system/SystemProvider";

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
  const [showAutoEnabledFinalized, setShowAutoEnabledFinalized] = useState<boolean>(false);
  const [showAutoRecoveryNotEnabled, setShowAutoRecoveryNotEnabled] = useState<boolean>(false);

  const reset = () => {
    setStepNumber(0);
    setPlayers([]);
    setMinShards(3);
    setAwaitConfigureShardsRequest(null);
    setValidationError(null);
    setShowAutoEnabledFinalized(false);
  }

  const updateConfigurationType = async (type: ShamirConfigurationType) => {
    if (type === "auto") {
      try {
        await enableAutoPasswordRecovery(client);
        setShowAutoEnabledFinalized(true);
      }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      catch (error) {
        setShowAutoRecoveryNotEnabled(true);
      }
    } else {
      setValidationError(null);
      setStepNumber(stepNumber + 1)
    }
  }

  const handleStep2Next = () => {
    if (players.length < minPlayers) {
      setValidationError(t(`You must select at least ${minPlayers} trusted connections`));
      return;
    }

    setValidationError(null);
    setStepNumber(stepNumber + 1)

  }

  const handleStep3Next = () => {
    if (minShards < 1) {
      setValidationError(t('Min shards cannot be less than 1'));
      return;
    }

    if (minShards > players.length) {
      setValidationError(t('Minimum shards cannot be more than the number of trusted connections you selected'));
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
      size="2xlarge"
      footer={
        <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          {awaitConfigureShardsRequest != null ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row-reverse">
              <ActionButton onClick={() => close()}>
                {t('Close')}
              </ActionButton>
            </div>
          ) : stepNumber === 0 ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row-reverse">
              {/* this page intentionally left blank.  why do books do this?  if the page is blank then does 
              the text make it not blank?  I don't get it... */}
            </div>
          ) : stepNumber === 1 ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row-reverse">
              <ActionButton onClick={() => handleStep2Next()} icon={Arrow}>
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
          ) : stepNumber === 2 ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <ActionButton onClick={() => handleStep3Next()} icon={Arrow}>
                {t('Next')}
              </ActionButton>
              <ActionButton
                onClick={(e) => {
                  setStepNumber(stepNumber - 1);
                  e.preventDefault();
                }}
                type="secondary"
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
          ) : stepNumber === 3 ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <ActionButton onClick={() => startConfigureShards()} icon={Arrow}>
                {t('Distribute')}
              </ActionButton>
              <ActionButton
                onClick={(e) => {
                  setStepNumber(stepNumber - 1);
                  e.preventDefault();
                }}
                type="secondary"
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
          ) : null}
        </div>
      }>
      {showAutoRecoveryNotEnabled &&
          <div className="flex flex-col gap-8">
              <div
                  className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex flex-row items-center gap-3">
                      <Person className="h-6 w-6 text-primary"/>
                      <h3 className="text-lg font-semibold">
                        {t('Auto Recovery not supported by Hosting Provider')}
                      </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      t{"This hosting provider does not have auto-password recovery enabled.  You can manually configure using your trusted connections"}
                  </p>
                  <div className="mt-4">
                      <ActionButton onClick={() => close()}>
                        {t('Close')}
                      </ActionButton>
                  </div>
              </div>
          </div>
      }

      {showAutoEnabledFinalized &&
          <div className="flex flex-col gap-8">
              <div
                  className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex flex-row items-center gap-3">
                      <Person className="h-6 w-6 text-primary"/>
                      <h3 className="text-lg font-semibold">
                        {t('Automatic Recovery Enabled')}
                      </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t("Your password recovery will be handled automatically by the system. Your recovery details have be divided among multiple managed identities for safekeeping.")}
                  </p>
                  <div className="mt-4">
                      <ActionButton onClick={() => close()}>
                        {t('Close')}
                      </ActionButton>
                  </div>
              </div>
          </div>
      }

      {!showAutoEnabledFinalized && awaitConfigureShardsRequest != null && (
        <WaitForShardConfig request={awaitConfigureShardsRequest}/>
      )}

      {!showAutoEnabledFinalized && awaitConfigureShardsRequest == null && (
        <>
          {validationError && (
            <span className="text-red-500">{validationError}</span>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              // start config process
            }}
            className="flex h-full flex-col">
            {stepNumber === 0 && (
              <div className="flex-1 overflow-y-auto">
                <Step1SelectConfigurationType
                  onUpdateType={updateConfigurationType}
                />
              </div>
            )}

            {stepNumber === 1 && (
              <div className="flex-1 overflow-y-auto">
                <Step2SelectPlayers
                  addPlayer={addPlayer}
                  removePlayer={removePlayer}
                  updatePlayerType={updatePlayerType}
                  players={players}
                />
              </div>
            )}

            {stepNumber === 2 && (
              <Step3OtherOptions
                config={cfg}
                removePlayer={undefined}
                updatePlayerType={updatePlayerType}
                onChange={(s) => setMinShards(s)}
              />
            )}

            {stepNumber === 2 && <DistributeShardsReview config={cfg}/>}
          </form>
        </>
      )}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

