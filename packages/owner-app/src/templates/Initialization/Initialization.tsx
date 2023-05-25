import { ReactNode, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
import { HOME_PATH, RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import useInit from '../../hooks/configure/useInit';
import useIsConfigured from '../../hooks/configure/useIsConfigured';
import { ErrorNotification } from '@youfoundation/common-app';
import { Loader } from '@youfoundation/common-app';
import fallbackImage from './fallbackImage';
import Circles from './Pages/Circles';
import Profile from './Pages/Profile';
import Socials from './Pages/Socials';
import Welcome from './Pages/Welcome';
import { base64ToUint8Array, jsonStringify64 } from '@youfoundation/js-lib';
import Section from '../../components/ui/Sections/Section';

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

export const INIT_PATH = '/owner/initialization';

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
  ],
};

const Initialization = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: isConfigured, refetch: refreshIsConfigured } = useIsConfigured().isConfigured;
  const defaultPage = parseInt(searchParams?.get('page') || '0');

  const sessionData = sessionStorage.getItem(storageKey);
  const parsedData = sessionData && JSON.parse(sessionData);

  const [page, setPage] = useState(defaultPage);
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
    init: { mutateAsync: doInit, error: initError },
    initWithData: { mutateAsync: doInitWithData, error: initWithDataError },
  } = useInit();

  let pageContents: ReactNode;

  const validityHandler = (index: number, isValid: boolean) => {
    const dirtyPages = [...pages];
    dirtyPages[index].isValid = isValid;

    setPages(dirtyPages);
  };

  const doSkip = async () => {
    navigateTo(10);
  };

  const navigateTo = async (newPage: number) => {
    setPage(newPage);

    if (newPage === pages.length) {
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

      await doInitWithData(dataToUse);
      refreshIsConfigured();
    }

    if (newPage === 10) {
      await doInit(false);
      refreshIsConfigured();
    }
  };

  useEffect(() => {
    if (isConfigured) {
      const redirectToReturn = () => {
        const returnUrl = searchParams.get(RETURN_URL_PARAM);
        if (returnUrl) {
          window.location.href = decodeURIComponent(returnUrl);
        } else {
          window.location.href = HOME_PATH;
        }
      };
      redirectToReturn();
    }
  }, [isConfigured]);

  switch (page) {
    case 0:
      pageContents = (
        <Welcome
          onNext={() => navigateTo(page + 1)}
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
          onNext={() => navigateTo(page + 1)}
        />
      );
      break;
    case 2:
      pageContents = (
        <Socials
          pageData={data.social}
          onChange={(pageData) => setData({ ...data, social: { ...pageData } })}
          setValidity={(isValid) => validityHandler(2, isValid)}
          onNext={() => navigateTo(page + 1)}
        />
      );
      break;
    case 3:
      pageContents = (
        <Circles
          pageData={data.circles}
          onChange={(pageData) => setData({ ...data, circles: [...pageData] })}
          setValidity={(isValid) => validityHandler(3, isValid)}
          onNext={() => navigateTo(page + 1)}
        />
      );
      break;
    default:
      pageContents = <FinalCreation />;
      break;
  }

  useEffect(() => {
    if (searchParams.get('page') !== page + '') {
      searchParams.set('page', page + '');
      setSearchParams(searchParams);
    }
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, jsonStringify64(data));
  }, [data]);

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
            {page < pages.length && <Pager page={page} setPage={navigateTo} pages={pages} />}
            {pageContents}
          </Section>
        </div>
      </div>
    </>
  );
};

export default Initialization;

const Pager = ({
  page,
  setPage,
  pages,
}: {
  page: number;
  setPage: (i: number) => void;
  pages: { title: string; isValid: boolean }[];
}) => {
  return (
    <>
      <div className="mb-10 flex w-full flex-wrap">
        {pages.map((currentPage, index) => (
          <a
            className={`inline-flex grow items-center justify-center border-b-2 ${
              page === index
                ? 'rounded-t border-indigo-500 bg-gray-100 text-indigo-500 dark:bg-gray-700'
                : currentPage.isValid
                ? 'border-gray-200 text-gray-900 dark:border-gray-600 dark:text-gray-600'
                : 'border-gray-200 text-gray-400 hover:text-gray-900 dark:border-gray-600 dark:hover:text-gray-600'
            } cursor-pointer py-3 font-medium leading-none  tracking-wider sm:w-auto sm:justify-start sm:px-6`}
            key={index}
            onClick={() => setPage(index)}
          >
            {index + 1}. {currentPage.title}
          </a>
        ))}
      </div>
      <h1 className="mb-5 text-2xl">{pages[page]?.title}</h1>
    </>
  );
};

const FinalCreation = () => {
  return (
    <div className="my-auto flex flex-col">
      <Loader className="mx-auto mb-10 h-20 w-20" />
      <div className="text-center">{t('Setting up your secure environment')}</div>
    </div>
  );
};
