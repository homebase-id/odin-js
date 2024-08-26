import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  t,
  ActionButton,
  ActionButtonState,
  useActiveConnections,
  usePortal,
  DialogWrapper,
  Pager,
} from '@youfoundation/common-app';
import { Arrow } from '@youfoundation/common-app/icons';
import ConnectionCard from '../../Connection/ConnectionCard/ConnectionCard';

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
    pageSize: 12,
  }).fetch;

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

        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {!membersLoading ? (
            !members?.pages?.[activePage - 1]?.results?.length ? (
              <p className="py-2 text-slate-400">{t('No connections found')}</p>
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
                    className={`relative cursor-pointer`}
                    isChecked={checked}
                    canSave={true}
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
        <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
          <ActionButton
            icon={Arrow}
            state={confirmationStatus}
            onClick={() => {
              onConfirm([...toProvideMembers], [...toRevokeMembers]);
              setToProviderMembers([]);
              setToRevokeMembers([]);
            }}
          >
            {confirmText || t('Update Circle')}
          </ActionButton>
          <ActionButton type="secondary" onClick={onCancel}>
            {t('Cancel')}
          </ActionButton>
          {toProvideMembers?.length || toRevokeMembers?.length ? (
            <div className="my-auto">
              {toProvideMembers?.length
                ? `${
                    toProvideMembers.length >= 2
                      ? `${toProvideMembers.length} ${t('people')}`
                      : `${t('One person')}`
                  } ${t('will gain access')}`
                : ''}
              {toRevokeMembers?.length
                ? `${
                    toRevokeMembers.length >= 2
                      ? `${toRevokeMembers.length} ${t('people')}`
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
