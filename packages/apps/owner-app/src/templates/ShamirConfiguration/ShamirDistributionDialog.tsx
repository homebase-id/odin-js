import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {
  Alert,
  Textarea,
  t,
  useCheckIdentity,
  usePortal,
  ErrorNotification,
  ActionButton,
  CircleSelector,
  useFollowingInfinite,
  Input,
  Label,
  DialogWrapper,
  CheckboxToggle,
  useIsConnected,
} from '@homebase-id/common-app';
import {getDomainFromUrl} from '@homebase-id/js-lib/helpers';
import {Arrow} from '@homebase-id/common-app/icons';
import {ConnectionListItem, GroupContactSearch} from "./GroupContactSearch";

const DEFAULT_MESSAGE = t('Hi, I would like to connect with you');

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
  const [players, setPlayers] = useState<string[]>([]);
  const [minShards, setMinShards] = useState<number>(3);
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

          <div className="flex w-full flex-col gap-2 p-5">
            <Label htmlFor="duration">
              {t('Minimum matching shards')}
            </Label>
            <Input
              onChange={(e) => setMinShards(Number(e.target.value))}
              className="w-full"
              placeholder={t('Set min shards')}
              value={minShards}
            />
          </div>

          {players?.length ? (
            <div className="flex-grow overflow-auto">
              {players.map((odinId, index) => (
                <ConnectionListItem
                  odinId={odinId as string}
                  isActive={false}
                  key={odinId || index}
                  onClick={() => {
                    if (!odinId) return;
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-grow items-center justify-center p-5">
              <p className="text-slate-400">{t('Select players from list below')}</p>
            </div>
          )}
          
          <hr />
          
          <GroupContactSearch
            addContact={(newContact) => {
              setPlayers([...players.filter((x) => x !== newContact), newContact]);
            }}
            defaultValue={players}
          />

          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton state="idle" icon={Arrow}>
              {t('Send')}
            </ActionButton>
            <ActionButton
              onClick={(e) => {
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
                onCancel();
              }}
            >
              {t('Cancel')}
            </ActionButton>
          </div>

        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
