import { base64ToUint8Array } from '@youfoundation/js-lib/helpers';
import { useState } from 'react';
import { WelcomeData } from '../../templates/Setup/Setup';
import { fallbackProfileImage } from '../../templates/Setup/fallbackImage';
import {
  ActionButton,
  Arrow,
  Input,
  Label,
  Person,
  getOdinIdColor,
  t,
} from '@youfoundation/common-app';
import { ImageUploadAndCrop } from '@youfoundation/common-app';

const defaultData: WelcomeData = {
  // Default values
  profile: {
    givenName: '',
    surname: '',
    city: '',
    country: '',
    imageData: undefined,
  },
  social: {
    odinId: window.location.hostname,
    other: [],
  },
  circles: [
    { name: 'Friends', description: 'Your friends' },
    { name: 'Family', description: 'Your family' },
    { name: 'Work', description: 'Your professional connections' },
    { name: 'Acquaintances', description: 'Your network' },
  ],
};

const SetupWizard = ({ doInitWithData }: { doInitWithData: (data: WelcomeData) => void }) => {
  const [data, setData] = useState(defaultData);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changeHandler = (e: { target: { name: string; value: any } }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dirtyState: any = { ...data };
    dirtyState.profile[e.target.name] = e.target.value;

    setData(dirtyState);
  };

  const initials =
    data.profile['givenName']?.[0] || data.profile['surname']?.[0]
      ? (data.profile['givenName']?.[0] ?? '') + (data.profile['surname']?.[0] ?? '')
      : window.location.hostname.split('.')[0].substring(0, 2);

  const doSetup = async () => {
    const dataToUse = { ...data };

    // Set fallback image:
    if (!data.profile.imageData) {
      const backgroundColor = getOdinIdColor(window.location.hostname).darkTheme;
      dataToUse.profile.imageData = new Blob(
        [base64ToUint8Array(fallbackProfileImage(initials, backgroundColor))],
        {
          type: 'image/svg+xml',
        }
      );
    }

    // Set fallback name:
    if (!data.profile.givenName && !data.profile.surname) {
      const fallbackName = window.location.hostname.split('.')[0];
      dataToUse.profile.givenName = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    }

    doInitWithData(dataToUse);
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSetup();
        }}
      >
        <p className="flex flex-col">
          Begin your journey by sharing a bit about yourself.
          <small className="text-sm text-slate-500">
            A little information can help friends recognize and connect with you on Homebase. This
            information will be publicly available so don&apos;t add anything you would consider
            private. And remember, here you&apos;re in control of your personal data.
          </small>
        </p>

        <div className="my-10">
          <h2 className="mb-2 text-xl">
            {t('Your Profile Photo')}
            <small className="block text-sm text-slate-400">{t('Help people recognize you')}</small>
          </h2>
          <div className="flex flex-row">
            <div className="mx-auto sm:max-w-[15rem]">
              <div className="relative">
                {!data.profile['imageData'] ? (
                  <div
                    className="flex aspect-square w-full bg-slate-100 dark:bg-slate-700"
                    style={{ backgroundColor: getOdinIdColor(window.location.hostname).darkTheme }}
                  >
                    {initials?.length ? (
                      <span className="m-auto text-[95px] font-light">
                        {initials.toUpperCase()}
                      </span>
                    ) : (
                      <Person className="m-auto h-16 w-16" />
                    )}
                  </div>
                ) : null}

                <div className="mt-5">
                  <ImageUploadAndCrop
                    onChange={(imageData) =>
                      changeHandler({
                        target: { name: 'imageData', value: imageData },
                      })
                    }
                    defaultValue={data.profile['imageData']}
                    expectedAspectRatio={1}
                    maxHeight={500}
                    maxWidth={500}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <h2 className="mb-2 text-xl">
          {t('Your info')}
          <small className="block text-sm text-slate-400">{t('Help people find you')}</small>
        </h2>

        <div className="-mx-2 flex-row sm:flex">
          <div className="mb-5 px-2 sm:w-2/5">
            <Label htmlFor="givenName">{t('Given name')}</Label>
            <Input
              id="givenName"
              name="givenName"
              onChange={changeHandler}
              defaultValue={data.profile['givenName']}
            />
          </div>
          <div className="mb-5 px-2 sm:w-3/5">
            <Label htmlFor="surname">{t('Surname')}</Label>
            <Input
              id="surname"
              name="surname"
              onChange={changeHandler}
              defaultValue={data.profile['surname']}
            />
          </div>
        </div>
        <div className="mt-auto flex flex-row-reverse gap-2">
          <ActionButton icon={Arrow}>{t('Setup')}</ActionButton>
        </div>
      </form>
    </>
  );
};

export default SetupWizard;
