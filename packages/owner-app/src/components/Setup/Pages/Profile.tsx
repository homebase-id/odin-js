import { useRef } from 'react';
import { Arrow, Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { Person } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { onChangeParams } from '../../../templates/Setup/Setup';
import ImageUploadAndCrop from '@youfoundation/common-app/src/form/image/ImageUploadAndCrop';
import { PageData } from '../SetupWizard';

const Profile = ({
  pageData,
  onChange,
  setValidity,
  onNext,
}: {
  pageData: PageData;
  onChange: (page: PageData) => void;
  setValidity: (isValid: boolean) => void;
  onNext: () => void;
}) => {
  // Get Name/City/Country/Photo/Bio/Status
  const formRef = useRef<HTMLFormElement>(null);

  const changeHandler = (e: onChangeParams) => {
    const dirtyState = { ...pageData };
    dirtyState[e.target.name] = e.target.value;

    onChange(dirtyState);
    setValidity(formRef.current?.checkValidity() || false);
  };

  const initials: string = (pageData['givenName']?.[0] ?? '') + (pageData['surname']?.[0] ?? '');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (formRef.current?.checkValidity()) {
          setValidity(true);
          onNext();
        }
        formRef.current?.reportValidity();
      }}
      ref={formRef}
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
        <h2 className="mb-2 text-xl">{t('Your Profile Photo')}</h2>
        <div className="flex flex-row">
          <div className="mx-auto max-w-xl">
            <div className="relative">
              {!pageData['imageData']?.bytes ? (
                <div className="flex aspect-square w-full bg-slate-100 dark:bg-slate-700">
                  {initials?.length ? (
                    <span className="m-auto text-[95px] font-light">{initials.toUpperCase()}</span>
                  ) : (
                    <Person className="m-auto h-16 w-16" />
                  )}
                </div>
              ) : null}

              <div className="mt-5">
                <ImageUploadAndCrop
                  onChange={(imageData) => {
                    changeHandler({
                      target: { name: 'imageData', value: imageData },
                    });
                  }}
                  defaultValue={pageData['imageData']}
                  expectedAspectRatio={1}
                  maxHeight={500}
                  maxWidth={500}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="my-5">
        <h2 className="mb-2 text-xl">{t('Your name')}</h2>
        <div className="-mx-2 flex-row sm:flex">
          <div className="mb-5 px-2 sm:w-2/5">
            <Label htmlFor="givenName">{t('Given name')}</Label>
            <Input
              id="givenName"
              name="givenName"
              required
              onChange={changeHandler}
              defaultValue={pageData['givenName']}
            />
          </div>
          <div className="mb-5 px-2 sm:w-3/5">
            <Label htmlFor="surname">{t('Surname')}</Label>
            <Input
              id="surname"
              name="surname"
              required
              onChange={changeHandler}
              defaultValue={pageData['surname']}
            />
          </div>
        </div>
      </div>
      <div className="my-5">
        <h2 className="mb-2 text-xl">{t('Help people find you')}</h2>
        <div className="-mx-2 flex-row sm:flex">
          <div className="mb-5 px-2 sm:w-1/2">
            <Label htmlFor="city">{t('City')}</Label>
            <Input id="city" name="city" onChange={changeHandler} defaultValue={pageData['city']} />
          </div>
          <div className="mb-5 px-2 sm:w-1/2">
            <Label htmlFor="country">{t('Country')}</Label>
            <Input
              id="country"
              name="country"
              onChange={changeHandler}
              defaultValue={pageData['country']}
            />
          </div>
        </div>
      </div>
      <div className="mt-auto flex flex-row-reverse">
        <ActionButton icon={Arrow}>{t('Next')}</ActionButton>
      </div>
    </form>
  );
};

export default Profile;
