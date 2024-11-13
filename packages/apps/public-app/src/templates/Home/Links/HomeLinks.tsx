import ProfileHero from '../Common/ProfileHero/ProfileHero';
import Links from '../../../components/ui/Layout/Links/Links';

const HomeContent = () => {
  return (
    <>
      <ProfileHero />
      <section className="py-5">
        <div className="container mx-auto px-5">
          <div className="max-w-3xl">
            <Links direction={'col'} includeSocials={true} />
          </div>
        </div>
      </section>
    </>
  );
};

export default HomeContent;
