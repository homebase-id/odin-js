import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import useActiveConnections from '../../../hooks/connections/useActiveConnections';
import usePortal from '../../../hooks/portal/usePortal';
import ActionButton, { ActionButtonState } from '../../ui/Buttons/ActionButton';
import ConnectionCard from '../../Connection/ConnectionCard/ConnectionCard';
import { DialogWrapper, Pager } from '@youfoundation/common-app';

const MemberLookupDialog = ({
  title,
  confirmText,

  isOpen,
  defaultMembers,
  confirmationStatus,

  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText?: string;

  isOpen: boolean;
  defaultMembers: string[];
  confirmationStatus: ActionButtonState;

  onConfirm: (toProvide: string[], toRevoke: string[]) => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [activePage, setActivePage] = useState(1);
  const {
    data: members,
    isLoading: membersLoading,
    isFetchedAfterMount: membersFetchedAfterMount,
    hasNextPage: membersHasNextPageOnServer,
    fetchNextPage: fetchNextMembersPage,
  } = useActiveConnections({
    active: { pageSize: 12 },
  }).fetchActive;

  useEffect(() => {
    if (!membersFetchedAfterMount) {
      return;
    }

    if (members?.pages[activePage - 1]) {
      // already have that
    } else {
      fetchNextMembersPage();
    }
  }, [activePage, membersFetchedAfterMount]);

  const activeHasNextPage = members?.pages[activePage] || membersHasNextPageOnServer;

  const [toProvideMembers, setToProviderMembers] = useState<string[]>([]);
  const [toRevokeMembers, setToRevokeMembers] = useState<string[]>([]);

  if (!isOpen) {
    return null;
  }

  const toggleMember = (checked: boolean, odinId: string) => {
    if (checked) {
      // If member wasn't there, add to provide
      if (!defaultMembers.some((defaultMember) => defaultMember === odinId)) {
        setToProviderMembers([...toProvideMembers, odinId]);
      }
      setToRevokeMembers(toRevokeMembers.filter((defaultMember) => defaultMember !== odinId));
    } else {
      // If member was there, add to revoke
      if (defaultMembers.some((defaultMember) => defaultMember === odinId)) {
        setToRevokeMembers([...toRevokeMembers, odinId]);
      }
      setToProviderMembers(toProvideMembers.filter((defaultMember) => defaultMember !== odinId));
    }
  };

  const dialog = (
    <DialogWrapper size="4xlarge" onClose={onCancel} title={title}>
      <>
        <div className="flex flex-row">
          <h2 className="mr-auto">{t('Your Connections:')}</h2>
          <Pager
            totalPages={activeHasNextPage ? activePage + 1 : activePage}
            setPage={setActivePage}
            currentPage={activePage}
            className="m-2"
          />
        </div>

        <div className="-mx-1 flex flex-row">
          {!membersLoading ? (
            !members?.pages?.[activePage - 1]?.results?.length ? (
              <>{t('No connections found')}</>
            ) : (
              members?.pages?.[activePage - 1].results?.map((member) => {
                const checked =
                  (defaultMembers.some((selectedMember) => selectedMember === member.odinId) &&
                    !toRevokeMembers.some((revokedMember) => revokedMember === member.odinId)) ||
                  toProvideMembers.some((providedMember) => providedMember === member.odinId);

                return (
                  <ConnectionCard
                    key={member.odinId}
                    odinId={member.odinId}
                    className={`relative w-1/2 cursor-pointer p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6`}
                    isChecked={checked}
                    onClick={() => {
                      const isInDefault = defaultMembers.some(
                        (defaultMember) => defaultMember === member.odinId
                      );
                      const isRevoked = toRevokeMembers.some(
                        (defaultMember) => defaultMember === member.odinId
                      );
                      const isProvided = toProvideMembers.some(
                        (defaultMember) => defaultMember === member.odinId
                      );

                      const currentState = isInDefault ? !isRevoked : isProvided;
                      toggleMember(!currentState, member.odinId);
                    }}
                  />
                );
              })
            )
          ) : (
            <></>
          )}
        </div>
        <div className="-m-2 flex flex-row-reverse py-3">
          <ActionButton
            className="m-2"
            icon={'send'}
            state={confirmationStatus}
            onClick={() => {
              onConfirm(toProvideMembers, toRevokeMembers);
            }}
          >
            {confirmText || t('Update Circle')}
          </ActionButton>
          <ActionButton className="m-2" type="secondary" onClick={onCancel}>
            {t('Cancel')}
          </ActionButton>
          {toProvideMembers?.length || toRevokeMembers?.length ? (
            <div className="m-2 my-auto">
              {toProvideMembers?.length
                ? `${
                    toProvideMembers.length >= 2
                      ? `${toProvideMembers.length} ${t('people')}`
                      : `${t('One person')}`
                  } ${t('will gain access')}`
                : ''}
              {toRevokeMembers?.length
                ? `${
                    toProvideMembers.length >= 2
                      ? `${toProvideMembers.length} ${t('people')}`
                      : `${t('One person')}`
                  } ${t('will loose access')}`
                : ''}
            </div>
          ) : null}
        </div>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default MemberLookupDialog;
