import {useState} from 'react';
import {ActionButton, DialogWrapper, t, useDotYouClient, usePortal,} from '@homebase-id/common-app';
import {Arrow} from '@homebase-id/common-app/icons';
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

const validationMatrix = [
    {players: 3, minShards: 2, approvals: 2},
    {players: 4, minShards: 3, approvals: 2},
    {players: 5, minShards: 3, approvals: 2},
    {players: 6, minShards: 4, approvals: 3},
    {players: 7, minShards: 4, approvals: 3},
    {players: 8, minShards: 5, approvals: 3},
    {players: 9, minShards: 5, approvals: 4},
    {players: 10, minShards: 6, approvals: 4},
];

// eslint-disable-next-line react-refresh/only-export-components
export function getRuleForPlayers(count: number) {
    return validationMatrix.find(r => r.players === count);
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
    const [players, setPlayers] = useState<ShamiraPlayer[]>([]);
    const [minShards, setMinShards] = useState(3);
    const client = useDotYouClient().getDotYouClient();
    const [validationError, setValidationError] = useState<string | null>(null);
    const [awaitConfigureShardsRequest, setAwaitConfigureShardsRequest] = useState<ConfigureShardsRequest | null>(null);
    const [allPlayersVerified, setAllPlayersVerified] = useState<boolean>(false);

    const reset = () => {
        setStepNumber(0);
        setPlayers([]);
        setMinShards(3);
        setAwaitConfigureShardsRequest(null);
        setValidationError(null);
    }

    const updateConfigurationType = async (type: ShamirConfigurationType) => {
        if (type === "manual") {
            setValidationError(null);
            setStepNumber(stepNumber + 1)
        }
    }

    const handleStep2Next = () => {
        if (players.length < minPlayers) {
            setValidationError(t(`You must select at least ${minPlayers} trusted connections`));
            return;
        }
        
        if(!allPlayersVerified)
        {
            alert('pie')
        }

        const rule = getRuleForPlayers(players.length);
        if (rule) {
            // Apply default min shards
            setMinShards(rule.minShards);

            // Apply default delegate assignments
            setPlayers(players.map((p, index) => ({
                ...p,
                type: index < rule.approvals ? PlayerType.Delegate : PlayerType.Automatic,
            })));
        }

        setValidationError(null);
        setStepNumber(stepNumber + 1);
    };

    const handleStep3Next = () => {
        const rule = getRuleForPlayers(players.length);
        const approvals = players.filter(p => p.type === PlayerType.Delegate).length;

        if (minShards < 1) {
            setValidationError(t('Min shards cannot be less than 1'));
            return;
        }

        if (minShards > players.length) {
            setValidationError(
                t('Minimum shards cannot be more than the number of trusted connections you selected')
            );
            return;
        }

        // Only enforce the approval minimum if *some* are delegates, but fewer than the suggested rule.
        // If all are automatic (approvals === 0), allow it.
        if (rule && approvals > 0 && approvals < rule.approvals) {
            setValidationError(
                t('Too few set to Approve — add another for better security or make them all automatic')
            );
            return;
        }

        setValidationError(null);
        setStepNumber(stepNumber + 1);
    };


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
                            <ActionButton disabled={players.length < 3 || !allPlayersVerified} onClick={() => handleStep2Next()} icon={Arrow}>
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

            {awaitConfigureShardsRequest != null && (
                <WaitForShardConfig request={awaitConfigureShardsRequest}/>
            )}

            {awaitConfigureShardsRequest == null && (
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
                                    onClose={() => onConfirm()}
                                />
                            </div>
                        )}

                        {stepNumber === 1 && (
                            <div className="flex-1 overflow-y-auto">
                                <Step2SelectPlayers
                                    addPlayer={addPlayer}
                                    removePlayer={removePlayer}
                                    players={players}
                                    onPlayerValidityChange={(valid) => setAllPlayersVerified(valid)}
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

                        {stepNumber === 3 && <DistributeShardsReview config={cfg}/>}
                    </form>
                </>
            )}
        </DialogWrapper>
    );

    return createPortal(dialog, target);
};

