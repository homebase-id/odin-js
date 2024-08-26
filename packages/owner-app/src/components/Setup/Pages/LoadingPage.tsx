import { t } from '@youfoundation/common-app';
import { Loader } from '@youfoundation/common-app/icons';

const LoadingPage = () => {
  return (
    <div className="my-auto flex flex-col">
      <Loader className="mx-auto mb-10 h-20 w-20" />
      <div className="text-center">{t('Setting up your secure environment')}</div>
    </div>
  );
};

export default LoadingPage;
