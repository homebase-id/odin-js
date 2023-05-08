import { useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@youfoundation/common-app';
import useApps from '../../../hooks/apps/useApps';
import { usePortal } from '@youfoundation/common-app';
import ActionButton, { ActionButtonState } from '../../ui/Buttons/ActionButton';
import CheckboxToggle from '../../Form/CheckboxToggle';
import AppPermissionView from '../../PermissionViews/AppPermissionView/AppPermissionView';
import { CircleDefinition, stringGuidsEqual } from '@youfoundation/js-lib';
import useApp from '../../../hooks/apps/useApp';
import { ErrorNotification } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';

const CircleAppInteractionDialog = ({
  title,
  confirmText,
  isOpen,
  circleDef,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;

  isOpen: boolean;
  circleDef: CircleDefinition;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: apps, isLoading: appsLoading } = useApps().fetchRegistered;
  const { mutateAsync: updateAuthorizedCircle, error: updateAuthorizedCircleError } = useApp(
    {}
  ).updateAuthorizedCircles;

  const [toGrantApps, setToGrantApps] = useState<string[]>([]);
  const [toRevokeApps, setToRevokeApps] = useState<string[]>([]);

  const [updateState, setUpdateState] = useState<ActionButtonState>('idle');

  if (!isOpen) {
    return null;
  }

  const reset = () => {
    setToGrantApps([]);
    setToRevokeApps([]);
    setUpdateState('idle');
  };

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel} size="4xlarge">
      <>
        <ErrorNotification error={updateAuthorizedCircleError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setUpdateState('loading');

            try {
              await Promise.all(
                toGrantApps.map(async (toGrantAppId) => {
                  const app = apps?.find((app) => stringGuidsEqual(app.appId, toGrantAppId));
                  if (app)
                    await updateAuthorizedCircle({
                      appId: toGrantAppId,
                      circleIds: [...app.authorizedCircles, circleDef.id || ''],
                      circleMemberPermissionGrant: app.circleMemberPermissionSetGrantRequest,
                    });
                })
              );

              await Promise.all(
                toRevokeApps.map(async (toGrantAppId) => {
                  const app = apps?.find((app) => stringGuidsEqual(app.appId, toGrantAppId));
                  if (app)
                    await updateAuthorizedCircle({
                      appId: toGrantAppId,
                      circleIds: [
                        ...app.authorizedCircles.filter(
                          (circleId) => !stringGuidsEqual(circleId, circleDef.id || '')
                        ),
                      ],
                      circleMemberPermissionGrant: app.circleMemberPermissionSetGrantRequest,
                    });
                })
              );
            } catch (ex) {
              setUpdateState('error');
            }

            setUpdateState('success');
            reset();
            onConfirm();

            return false;
          }}
        >
          <h2 className="text-lg">{t('App Permissions')}:</h2>
          <p className="text-sm text-slate-500">{t('This circle can reach you on these apps')}:</p>

          <div className="my-7">
            <div className="-my-4">
              {!apps?.length && !appsLoading ? (
                <>{t('No apps regsitered on your identity')}</>
              ) : null}
              {apps?.map((app, index) => {
                const hadAccess = app.authorizedCircles.some((authorizedCircle) =>
                  stringGuidsEqual(authorizedCircle, circleDef?.id || '')
                );

                const checked =
                  (hadAccess &&
                    !toRevokeApps.some((toRevoke) => stringGuidsEqual(toRevoke, app.appId))) ||
                  toGrantApps.some((toGrant) => stringGuidsEqual(toGrant, app.appId));

                const clickHandler = () => {
                  if (!checked) {
                    if (!hadAccess) {
                      // Provide access
                      setToGrantApps([
                        ...toGrantApps.filter((appId) => !stringGuidsEqual(appId, app.appId)),
                        app.appId,
                      ]);
                    }
                    setToRevokeApps([
                      ...toRevokeApps.filter((appId) => !stringGuidsEqual(appId, app.appId)),
                    ]);
                  } else {
                    if (hadAccess) {
                      // Revoke access
                      setToRevokeApps([
                        ...toGrantApps.filter((appId) => !stringGuidsEqual(appId, app.appId)),
                        app.appId,
                      ]);
                    }
                    setToGrantApps([
                      ...toGrantApps.filter((appId) => !stringGuidsEqual(appId, app.appId)),
                    ]);
                  }
                };

                return (
                  <div
                    key={index}
                    className={`my-4 flex w-full select-none flex-row rounded-lg border p-4 dark:border-slate-800`}
                    onClick={clickHandler}
                  >
                    <AppPermissionView appDef={app} key={app.appId} className="my-auto" />
                    <CheckboxToggle
                      checked={checked}
                      className="pointer-events-none my-auto ml-auto"
                      readOnly={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="-m-2 flex flex-row-reverse py-3">
            <ActionButton className="m-2" state={updateState} icon={'send'}>
              {confirmText || t('Update')}
            </ActionButton>
            <ActionButton
              className="m-2"
              type="secondary"
              onClick={() => {
                reset();
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

export default CircleAppInteractionDialog;
