import ActionButton from '../../../components/ui/Buttons/ActionButton';
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
      <p className="mb-4">This is it, this is your new home on the internet.</p>
      <p className="mb-4">
        From here on out you will be known as{' '}
        <span className="font-semibold">{window.location.hostname}</span>. This is your identity,
        and it will be the start of your uniqueness.
      </p>
      <p className="mb-4">
        First, to find the right people it&apos;s important that the world has a way of finding you.
        In a couple of steps we will setup your identity, and get you going on this new era of the
        internet.
      </p>
      <div className="mt-5 flex flex-row-reverse">
        <ActionButton onClick={onNext} icon="send">
          {t('Next')}
        </ActionButton>
        <ActionButton onClick={onSkip} icon="shield" className="mr-auto">
          {t('Skip')}
        </ActionButton>
        <ActionButton
          onClick={onReset}
          icon="trash"
          type="secondary"
          className="mr-2"
          title="Restart"
        />
      </div>
    </>
  );
};

export default Welcome;
