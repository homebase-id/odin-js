import { base64ToUint8Array, jsonStringify64 } from '@youfoundation/js-lib/helpers';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingPage from './Pages/LoadingPage';
import Profile from './Pages/Profile';
import Socials from './Pages/Socials';
import Welcome from './Pages/Welcome';
import { WelcomeData } from '../../templates/Setup/Setup';
import fallbackImage from '../../templates/Setup/fallbackImage';
import Pager from './SetupPager';
import Circles from './Pages/Circles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageData = Record<string, any>;

const storageKey = 'wizardInfo';
const defaultData: WelcomeData = {
  // Default values
  profile: {
    givenName: '',
    surname: '',
    city: '',
    country: '',
    imageData: undefined,
  },
  social: { other: [] },
  circles: [
    { name: 'Friends', description: 'Your friends' },
    { name: 'Family', description: 'Your family' },
    { name: 'Work', description: 'Your professional connections' },
    { name: 'Acquaintances', description: 'Your network' },
  ],
};

const SetupWizard = ({
  doInit,
  doInitWithData,
}: {
  doInit: () => void;
  doInitWithData: (data: WelcomeData) => void;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const sessionData = sessionStorage.getItem(storageKey);
  const parsedData = sessionData && JSON.parse(sessionData);

  const [page, setPage] = useState(parseInt(searchParams?.get('page') || '0'));
  const [data, setData] = useState(
    sessionData
      ? {
          ...parsedData,
          profile: {
            ...parsedData.profile,
            imageData: {
              ...parsedData.profile?.imageData,
              bytes:
                parsedData?.profile?.imageData?.bytes &&
                base64ToUint8Array(parsedData?.profile?.imageData?.bytes),
            },
          },
        }
      : {
          ...defaultData,
        }
  );

  const [pages, setPages] = useState([
    { title: 'Welcome', isValid: true },
    { title: 'Profile', isValid: false },
    { title: 'Socials', isValid: false },
    { title: 'Circles', isValid: false },
  ]);

  const validityHandler = (index: number, isValid: boolean) => {
    const dirtyPages = [...pages];
    dirtyPages[index].isValid = isValid;

    setPages(dirtyPages);
  };

  const doSkip = async () => {
    setPage(10);
  };

  useEffect(() => {
    // Update queryString
    if (searchParams.get('page') !== page + '') {
      searchParams.set('page', page + '');
      setSearchParams(searchParams);
    }

    // Check if we are done, and start init if so
    if (page === pages.length) {
      const dataToUse = { ...data };

      // Set default image:
      if (!data.profile.imageData || !data.profile.imageData.bytes) {
        const initials =
          (data.profile['givenName']?.[0] ?? '') + (data.profile['surname']?.[0] ?? '');
        const odinIdInitials = window.location.hostname.split('.')[0].substring(0, 2);

        dataToUse.profile.imageData = {
          bytes: base64ToUint8Array(
            fallbackImage(initials?.length >= 2 ? initials : odinIdInitials)
          ),
          type: 'image/svg+xml',
        };
      }

      doInitWithData(dataToUse);
    }

    if (page === 10) {
      doInit();
    }
  }, [page]);

  // Store data in session
  useEffect(() => sessionStorage.setItem(storageKey, jsonStringify64(data)), [data]);

  return (
    <>
      {page < pages.length && <Pager page={page} setPage={setPage} pages={pages} />}
      {page === 0 ? (
        <Welcome
          onNext={() => setPage(page + 1)}
          onReset={() =>
            setData({
              ...defaultData,
            })
          }
          onSkip={doSkip}
        />
      ) : page === 1 ? (
        <Profile
          pageData={data.profile}
          onChange={(pageData) => setData({ ...data, profile: { ...pageData } })}
          setValidity={(isValid) => validityHandler(1, isValid)}
          onNext={() => setPage(page + 1)}
        />
      ) : page === 2 ? (
        <Socials
          pageData={data.social}
          onChange={(pageData) => setData({ ...data, social: { ...pageData } })}
          setValidity={(isValid) => validityHandler(2, isValid)}
          onNext={() => setPage(page + 1)}
        />
      ) : page === 3 ? (
        <Circles
          pageData={data.circles}
          onChange={(pageData) => setData({ ...data, circles: [...pageData] })}
          setValidity={(isValid) => validityHandler(3, isValid)}
          onNext={() => setPage(page + 1)}
        />
      ) : (
        <LoadingPage />
      )}
    </>
  );
};

export default SetupWizard;
