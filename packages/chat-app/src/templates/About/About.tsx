import { NoLayout } from '../../components/ui/Layout/Layout';

import LoginNav from '../../components/Auth/LoginNav/LoginNav';

import { ActionLink, Logo, t } from '@youfoundation/common-app';
import { ROOT_PATH } from '../../app/App';

const About = () => {
  return (
    <NoLayout noShadedBg={true}>
      <section className="relative flex min-h-screen items-center justify-center">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex flex-row items-center border-b px-5 py-3">
            <Logo className="my-auto mr-2 h-10 w-10" />{' '}
            <h1 className="mr-auto text-2xl">Homebase Chat</h1>
            <LoginNav />
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="mb-5 text-center text-5xl">{t('Keep your socials yours')}</h2>
          <div className="flex justify-center">
            <ActionLink href={`${ROOT_PATH}/auth`} className="w-auto">
              {t('Go to Homebase Chat')}
            </ActionLink>
          </div>
        </div>
      </section>
    </NoLayout>
  );
};

export default About;
