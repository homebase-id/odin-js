import { NoLayout } from '../../components/ui/Layout/Layout';
import { t } from '../../helpers/i18n/dictionary';

// import image1 from '../../assets/anton-mishin-061zw2DC-ZI-unsplash.webp';
// import image2 from '../../assets/duy-pham-Cecb0_8Hx-o-unsplash.webp';
// import image3 from '../../assets/jaddy-liu-nk-xUZwSjR4-unsplash.webp';
// import image4 from '../../assets/scott-webb-IZmPdbnb-3I-unsplash.webp';
// import image5 from '../../assets/thought-catalog-23KdVfc395A-unsplash.webp';
// import image6 from '../../assets/vitolda-klein-oLolBcPEs2k-unsplash.webp';

import LoginNav from '../../components/Auth/LoginNav/LoginNav';

import { ActionLink, Logo } from '@youfoundation/common-app';

const About = () => {
  return (
    <NoLayout noShadedBg={true}>
      <section className="relative flex min-h-screen items-center justify-center">
        <div className="absolute inset-0 flex flex-col">
          <div className="flex flex-row items-center border-b px-5 py-3">
            <Logo className="my-auto mr-2 h-10 w-10" />{' '}
            <h1 className="mr-auto text-2xl">Odin Photos</h1>
            <LoginNav />
          </div>
          <div className="h-full grid-rows-2 p-5">
            {/* <div className="grid h-1/2 grid-cols-2 md:grid-cols-3">
              <div className="hidden pb-24 pr-5 md:flex">
                <img
                  src={image1}
                  className="m-auto max-w-[min(28rem,100%)] rounded-xl object-cover shadow-lg"
                />
              </div>
              <div className="flex px-5">
                <img
                  src={image2}
                  className="m-auto mt-0 max-w-[min(20rem,100%)] rounded-xl shadow-lg"
                />
              </div>
              <div className="flex">
                <img src={image5} className="m-auto rounded-xl shadow-lg" />
              </div>
            </div> */}
            {/* <div className="grid h-1/2 grid-cols-2 md:grid-cols-3">
              <div className="hidden md:flex">
                <img src={image4} className="m-auto rounded-xl shadow-lg" />
              </div>
              <div className="flex px-5">
                <img
                  src={image6}
                  className="m-auto mb-0 max-w-[min(30rem,100%)] rounded-xl shadow-lg"
                />
              </div>
              <div className="flex">
                <img src={image3} className="m-auto max-w-[min(28rem,100%)] rounded-xl shadow-lg" />
              </div>
            </div> */}
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="mb-5 text-center text-5xl">{t('Keep your socials yours')}</h2>
          <div className="flex justify-center">
            <ActionLink href="/auth" className="w-auto">
              {t('Go to Odin Feed')}
            </ActionLink>
          </div>
        </div>
      </section>
    </NoLayout>
  );
};

export default About;
