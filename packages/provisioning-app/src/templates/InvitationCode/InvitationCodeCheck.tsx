import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCheckInvitationCode } from '../../hooks/invitationCode/useCheckInvitationCode';
import { t } from '../../helpers/i18n/dictionary';
import { Loader } from '@youfoundation/common-app/icons';
import { Label, Input } from '@youfoundation/common-app';
import ActionLink from '../../components/ui/Buttons/ActionLink';
import ActionButton from '../../components/ui/Buttons/ActionButton';

const InvitationCodeCheck = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invitationCode, setInvitationCode] = useState<string | null>(
    searchParams.get('invitation-code')
  );
  const [isEnterCode, setIsEnterCode] = useState(false);

  const {
    data: isValid,
    isLoading,
    status,
  } = useCheckInvitationCode(invitationCode || undefined).checkInvitationCode;

  if (invitationCode && isLoading && !isEnterCode) return <Loader className="m-auto h-16 w-16" />;

  if (isValid === true) return <Navigate to={`/sign-up${window.location.search}`} />;

  const doSetInvitationCode = (newCode?: string) => {
    if (!newCode) {
      searchParams.delete('invitation-code');
      setInvitationCode(null);
    } else {
      searchParams.set('invitation-code', newCode);
      setInvitationCode(newCode);
    }
    setSearchParams(searchParams);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    const data = new FormData(e.currentTarget);
    const newCode = data.get('invitation-code') as string;

    doSetInvitationCode(newCode.trim());

    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section className="flex flex-grow flex-col">
      <div className="container mx-auto flex h-full min-h-full flex-grow flex-col px-5">
        <div className="mx-auto mt-20 min-h-[20rem] w-full max-w-lg text-center">
          <h1 className="mb-10 text-4xl">
            Homebase | Signup
            <span className="mt-1 block text-3xl text-slate-400">{t('Create a new identity')}</span>
          </h1>

          <p className="my-7 block border-y py-3 text-center italic">
            The Alpha release is by invitation only.
            {isValid === false ? (
              <small className="block text-base text-red-700">
                {t(`The code you supplied isn't valid (anymore)`)}
              </small>
            ) : null}
          </p>
          {isEnterCode ? (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <Label htmlFor="invitationCode" className="text-left">
                  {t('Your invitation code')}:
                </Label>
                <Input id="invitationCode" name="invitation-code" required key={'input'} />
              </div>
              <div className="flex flex-row-reverse gap-2">
                <ActionButton
                  key="form-submit"
                  className="flex-grow justify-center text-center"
                  type="primary"
                  state={
                    (status === 'pending' || status === 'error') && invitationCode
                      ? status
                      : undefined
                  }
                >
                  {t('Next')}
                </ActionButton>
                <ActionButton
                  key="form-cancel"
                  className="flex-grow justify-center text-center"
                  type="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsEnterCode(false);
                    doSetInvitationCode();
                  }}
                >
                  {t('Cancel')}
                </ActionButton>
              </div>
            </form>
          ) : (
            <div className="grid grid-flow-col gap-2">
              <ActionButton
                className="flex-grow justify-center text-center"
                type="primary"
                onClick={() => setIsEnterCode(true)}
              >
                {t('I have an invitation')}
              </ActionButton>
              <ActionLink
                className="flex-grow justify-center text-center"
                type="secondary"
                href={'https://homebase.id/sign-up'}
              >
                {t('Join the wait list')}
              </ActionLink>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InvitationCodeCheck;
