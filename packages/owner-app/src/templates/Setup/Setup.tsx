import { ReactNode, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { HOME_PATH, RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import useInit from '../../hooks/configure/useInit';
import useIsConfigured from '../../hooks/configure/useIsConfigured';
import { ErrorNotification } from '@youfoundation/common-app';
import fallbackImage from './fallbackImage';
import Circles from './Pages/Circles';
import Profile from './Pages/Profile';
import Socials from './Pages/Socials';
import Welcome from './Pages/Welcome';
import { base64ToUint8Array, jsonStringify64 } from '@youfoundation/js-lib';
import Section from '../../components/ui/Sections/Section';
import Pager from './SetupPager';
import FinalPage from './Pages/FinalPage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type pageData = Record<string, any>;

export interface onChangeParams {
  target: {
    name: string;
    value: unknown;
  };
}

export interface WelcomeData {
  profile: {
    givenName: string;
    surname: string;
    city?: string;
    country?: string;
    imageData?: {
      bytes: Uint8Array;
      type: 'image/png' | 'image/jpeg' | 'image/tiff' | 'image/webp' | 'image/svg+xml';
    };
  };
  social: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    linkedin?: string;
    other: { text: string; target: string }[];
  };
  circles: { name: string; description: string }[];
}

export const SETUP_PATH = '/owner/setup';

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

const Setup = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: isConfigured, refetch: refreshIsConfigured } = useIsConfigured().isConfigured;

  const [page, setPage] = useState(parseInt(searchParams?.get('page') || '0'));

  const sessionData = sessionStorage.getItem(storageKey);
  const parsedData = sessionData && JSON.parse(sessionData);

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

  const {
    init: { mutateAsync: doInit, status: initStatus, error: initError },
    initWithData: {
      mutateAsync: doInitWithData,
      status: initWithDataStatus,
      error: initWithDataError,
    },
  } = useInit();

  let pageContents: ReactNode;

  const validityHandler = (index: number, isValid: boolean) => {
    const dirtyPages = [...pages];
    dirtyPages[index].isValid = isValid;

    setPages(dirtyPages);
  };

  const doSkip = async () => {
    setPage(10);
  };

  console.log({ initStatus, initWithDataStatus });
  // Refresh when init is done
  useEffect(() => {
    if (initStatus === 'success' || initWithDataStatus === 'success') refreshIsConfigured();
  }, [initStatus, initWithDataStatus]);

  const redirectToReturn = () => {
    const returnUrl = searchParams.get(RETURN_URL_PARAM);
    if (returnUrl) {
      window.location.href = decodeURIComponent(returnUrl);
    } else {
      window.location.href = HOME_PATH;
    }
  };

  useEffect(() => {
    if (isConfigured) redirectToReturn();
  }, [isConfigured]);

  switch (page) {
    case 0:
      pageContents = (
        <Welcome
          onNext={() => setPage(page + 1)}
          onReset={() =>
            setData({
              ...defaultData,
            })
          }
          onSkip={doSkip}
        />
      );
      break;
    case 1:
      pageContents = (
        <Profile
          pageData={data.profile}
          onChange={(pageData) => setData({ ...data, profile: { ...pageData } })}
          setValidity={(isValid) => validityHandler(1, isValid)}
          onNext={() => setPage(page + 1)}
        />
      );
      break;
    case 2:
      pageContents = (
        <Socials
          pageData={data.social}
          onChange={(pageData) => setData({ ...data, social: { ...pageData } })}
          setValidity={(isValid) => validityHandler(2, isValid)}
          onNext={() => setPage(page + 1)}
        />
      );
      break;
    case 3:
      pageContents = (
        <Circles
          pageData={data.circles}
          onChange={(pageData) => setData({ ...data, circles: [...pageData] })}
          setValidity={(isValid) => validityHandler(3, isValid)}
          onNext={() => setPage(page + 1)}
        />
      );
      break;
    default:
      pageContents = <FinalPage />;
      break;
  }

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
        dataToUse.profile.imageData = {
          bytes: base64ToUint8Array(
            fallbackImage(
              (data.profile['givenName']?.[0] ?? '') + (data.profile['surname']?.[0] ?? '')
            )
          ),
          type: 'image/svg+xml',
        };
      }

      doInitWithData(dataToUse);
    }

    if (page === 10) {
      doInit(false);
    }
  }, [page]);

  // Store in session
  useEffect(() => sessionStorage.setItem(storageKey, jsonStringify64(data)), [data]);

  return (
    <>
      <Helmet>
        <title>Setup | Odin</title>
      </Helmet>

      <div className="min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-5">
          <Section>
            <ErrorNotification error={initError} />
            <ErrorNotification error={initWithDataError} />
            {page < pages.length && <Pager page={page} setPage={setPage} pages={pages} />}
            {pageContents}
          </Section>
        </div>
      </div>
    </>
  );
};

export default Setup;
