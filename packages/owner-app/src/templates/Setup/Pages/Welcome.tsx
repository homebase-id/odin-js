import { ActionButton, Arrow, Shield, Trash } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';

const Welcome = ({
  onNext,
  onReset,
  onSkip,
}: {
  onNext: () => void;
  onReset: () => void;
  onSkip: () => void;
}) => {
  // Welcome and info about what will be doing
  return (
    <>
      <p className="mb-4">Welcome to your new ODIN identity.</p>
      <p className="mb-4">
        You will be recognized as <span className="font-semibold">{window.location.hostname}</span>.
        This will both be your personal homepage and your unique identity.
      </p>
      <p className="mb-4">Let&apos;s walk through a few steps to get you set up.</p>
      <div className="mt-5 flex flex-row-reverse">
        <ActionButton onClick={onNext} icon={Arrow}>
          {t('Next')}
        </ActionButton>
        <ActionButton onClick={onSkip} icon={Shield} className="mr-auto">
          {t('Skip')}
        </ActionButton>
        <ActionButton
          onClick={onReset}
          icon={Trash}
          type="secondary"
          className="mr-2"
          title="Restart"
        />
      </div>
    </>
  );
};

export default Welcome;
