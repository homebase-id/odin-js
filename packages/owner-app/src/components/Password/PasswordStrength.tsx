import { t } from '@youfoundation/common-app';
import { useState, useEffect } from 'react';

const MAX_SCORE = 4;

export const PasswordStrength = ({
  password,
  userInputs,
  className,
}: {
  password: string;
  userInputs?: string[];
  className?: string;
}) => {
  const [passwordStrength, setPasswordStrength] = useState(0);
  useEffect(() => {
    (async () => {
      const zxcvbn = (await import('zxcvbn')).default;
      setPasswordStrength(zxcvbn(password, [window.location.host, ...(userInputs || [])]).score);
    })();
  }, [password]);

  return (
    <div className={`flex w-full flex-col items-center gap-2 sm:flex-row ${className ?? ''}`}>
      <div className={`grid w-full max-w-sm flex-shrink-0 grid-cols-4 gap-2`}>
        {Array.from({ length: MAX_SCORE }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-xl ${i < passwordStrength ? 'bg-green-500' : 'bg-gray-300'}`}
          />
        ))}
      </div>

      <p className="min-h-[1rem] leading-none">
        {password?.length ? (
          <>
            {passwordStrength === 0
              ? t('Very weak')
              : passwordStrength === 1
              ? t('Weak')
              : passwordStrength === 2
              ? t('Medium')
              : passwordStrength === 3
              ? t('Strong')
              : passwordStrength === 4
              ? t('Very strong')
              : null}
          </>
        ) : null}
      </p>
    </div>
  );
};
