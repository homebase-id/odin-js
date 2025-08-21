import {useState} from 'react';
import {
  ActionButton,
  ConnectionImage,
  ConnectionName,
  ErrorBoundary,
  Label,
  t,
} from '@homebase-id/common-app';
import {Arrow, Times} from '@homebase-id/common-app/icons';
import {useNavigate} from 'react-router-dom';

export const NewShamirPlayerGroup = () => {
  const [isStepOne, setIsStepOne] = useState<boolean>(true);
  const [players, setPlayers] = useState<string[]>([]);

  const navigate = useNavigate();

  // const { mutateAsync: createNew, status: createStatus } = useConversation().create;
  const doCreate = async () => {
    if (!players?.length) return;
    try {

      // newRecipients is my list of shamira players
      // navigate(``);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-row items-center justify-between bg-primary/20 p-5">
        <h2 className="font-semibold">{t('New Configuration')}</h2>
        {/*<ActionButton onClick={() => navigate(`/owner/shamir`)} icon={Times} type="mute" />*/}
      </div>
      {players?.length ? (
        <div className="flex flex-col gap-2 bg-primary/10 p-5">
          {isStepOne ? (
            <>
              {players.map((recipient, index) => (
                <div
                  className="flex flex-row items-center gap-1 rounded-lg bg-background px-2 py-1"
                  key={recipient || index}
                >
                  <ConnectionImage odinId={recipient} size="xs"/>
                  <ConnectionName odinId={recipient}/>
                  <ActionButton
                    icon={Times}
                    type="mute"
                    className="ml-auto"
                    onClick={() => setPlayers(players.filter((x) => x !== recipient))}
                  />
                </div>
              ))}
            </>
          ) : (
            <>
              <div>
                <Label>
                  {t('Group name')}{' '}
                  <small className="text-sm text-foreground/80">({t('optional')})</small>
                </Label>
              </div>
            </>
          )}
          <div className="mt-3">
            {isStepOne ? (
              <ActionButton className="w-full" icon={Arrow} onClick={() => setIsStepOne(false)}>
                {t('Next')}
              </ActionButton>
            ) : (
              <div className="flex w-full flex-row gap-2">
                <ActionButton
                  className="w-full"
                  type="secondary"
                  onClick={() => setIsStepOne(true)}>
                  {t('Back')}
                </ActionButton>
                <ActionButton
                  className="w-full"
                  icon={Arrow}
                  onClick={doCreate}
                  state="idle">
                  {t('Create')}
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      ) : null}

    </ErrorBoundary>
  );
};
