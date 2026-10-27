import { useEffect, useState } from 'react';
import { ActionButton, ActionButtonState, t, useDotYouClient } from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import { PasswordInput } from '../../components/Password/PasswordInput';
import { isVaultPrivate, makeVaultPrivate } from '../../provider/auth/ZeroKnowledgeProvider';

/**
 * Off until a chat-kmp that reads zero-knowledge drives has reached people's devices: converting Vault before that
 * leaves every older device with an empty Vault (odin-core docs/zero-knowledge-drive-api-plan.md, step 3).
 */
export const SHOW_MAKE_VAULT_PRIVATE = false;

/**
 * "Make Vault private": Vault keeps its key, now locked only in this browser, and the server keeps no copy it could
 * open. Each of the owner's devices gets the key at its next sign-in. There is no way back.
 */
export const MakeVaultPrivateSection = () => {
  const { getDotYouClient } = useDotYouClient();
  const [isPrivate, setIsPrivate] = useState<boolean>();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<ActionButtonState>('idle');
  const [error, setError] = useState<string>();

  useEffect(() => {
    isVaultPrivate(getDotYouClient())
      .then(setIsPrivate)
      .catch((e) => console.warn(e));
  }, []);

  const convert = async () => {
    setState('loading');
    setError(undefined);
    try {
      await makeVaultPrivate(getDotYouClient(), password);
      setIsPrivate(true);
      setState('success');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t('Vault could not be made private'));
      setState('error');
    }
  };

  if (isPrivate === undefined) return null;

  return (
    <Section title={t('Vault encryption')}>
      {isPrivate ? (
        <p>{t('Vault is private: only your own devices can open it, and your server cannot.')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p>
            {t(
              'Make Vault private with true zero-knowledge encryption: only your own devices open it, never your server. Each device signs in once more to get the key. This cannot be undone.'
            )}
          </p>
          <PasswordInput
            autoComplete="current-password"
            placeholder={t('Your password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-red-500">{error}</p> : null}
          <ActionButton
            type="primary"
            className="mr-auto"
            state={state}
            disabled={!password}
            onClick={convert}
          >
            {t('Make Vault private')}
          </ActionButton>
        </div>
      )}
    </Section>
  );
};
