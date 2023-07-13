import { useRef, useState, useEffect } from 'react';
import { Arrow, Input, Plus } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import InfoBox from '../../ui/InfoBox/InfoBox';
import { t } from '@youfoundation/common-app';
import { onChangeParams } from '../../../templates/Setup/Setup';
import { Times } from '@youfoundation/common-app';
import { PageData } from '../SetupWizard';

const Socials = ({
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
  // Request Social Presence (IG, Twitter, Linkedin, Facebook, TikTok, Other Links)
  const formRef = useRef<HTMLFormElement>(null);

  const [otherText, setOtherText] = useState('');
  const [otherTarget, setOtherTarget] = useState('');

  const changeHandler = (e: onChangeParams) => {
    const dirtyState = { ...pageData };
    dirtyState[e.target.name] = e.target.value;
    onChange(dirtyState);

    setValidity(true);
  };

  useEffect(() => {
    setOtherText('');
    setOtherTarget('');
  }, [pageData]);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setValidity(true);
          onNext();
        }}
        ref={formRef}
      >
        <p className="flex flex-col">
          How else can you be found on the internet?
          <small className="text-sm text-slate-500">
            By providing your different social media handles and &quot;links&quot;, people will be
            able to connect with you wherever you want.
          </small>
        </p>
        <div className="my-5">
          <div className="mb-5">
            <Label htmlFor="instagram" className="flex flex-row">
              {t('Instagram')}
              <InfoBox title={t('Instagram username')} className="ml-2 opacity-50">
                {t(
                  'When you open up the Instagram app, you will find your username at the top of your own profile page, starting with an @.'
                )}
                {/* TODO: Add screenshot of main social accounts/persona */}
              </InfoBox>
            </Label>
            <Input
              id="instagram"
              name="instagram"
              onChange={changeHandler}
              defaultValue={pageData['instagram']}
              placeholder="@frodobaggins"
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="twitter" className="flex flex-row">
              {t('Twitter')}
              <InfoBox title={t('Twitter handle')} className="ml-2 opacity-50">
                {t(
                  'When you open up the Twitter app, you will find your Twitter handle in the menu below your name, starting with an @.'
                )}
                {/* TODO: Add screenshot of main social accounts/persona */}
              </InfoBox>
            </Label>
            <Input
              id="twitter"
              name="twitter"
              onChange={changeHandler}
              defaultValue={pageData['twitter']}
              placeholder="@frodobaggins"
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="tiktok" className="flex flex-row">
              {t('TikTok')}
              <InfoBox title={t('TikTok username')} className="ml-2 opacity-50">
                {t(
                  'When you open up the TikTok app, you will find your TikTok handle in the menu above your name.'
                )}
                {/* TODO: Add screenshot of main social accounts/persona */}
              </InfoBox>
            </Label>
            <Input
              id="tiktok"
              name="tiktok"
              onChange={changeHandler}
              defaultValue={pageData['tiktok']}
              placeholder="frodobaggins"
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="linkedin" className="flex flex-row">
              {t('Linkedin')}
              <InfoBox title={t('Linkedin username')} className="ml-2 opacity-50">
                {t(
                  'When you open up your LinkedIn profile, your LinkedIn username is the last part of the url.'
                )}
                {/* TODO: Add screenshot of main social accounts/persona */}
              </InfoBox>
            </Label>
            <Input
              id="linkedin"
              name="linkedin"
              onChange={changeHandler}
              defaultValue={pageData['linkedin']}
              placeholder="frodo-baggins"
            />
          </div>
          <div className="mb-5">
            <Label htmlFor="facebook" className="flex flex-row">
              {t('Facebook')}
              <InfoBox title={t('Facebook username')} className="ml-2 opacity-50">
                {t(
                  'When you open up your Facebook profile, your Facebook username is the last part of the url.'
                )}
                {/* TODO: Add screenshot of main social accounts/persona */}
              </InfoBox>
            </Label>
            <Input
              id="facebook"
              name="facebook"
              onChange={changeHandler}
              defaultValue={pageData['facebook']}
              placeholder="frodo.baggins"
            />
          </div>
        </div>
        <ActionButton icon={Arrow} className="hidden">
          {t('Next')}
        </ActionButton>
      </form>

      <div className="my-10 border-b border-t border-slate-200 py-5 dark:border-slate-700">
        <h2 className="mb-5 text-xl">{t('Other Links')}</h2>
        <ul>
          {Array.isArray(pageData.other)
            ? pageData.other?.map((link, index) => {
                return (
                  <li
                    key={index}
                    className="mb-5 flex flex-row rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                  >
                    {t('Label')}: {link.text}
                    <span className="ml-3">
                      {t('Target')}: {link.target}
                    </span>
                    <button
                      className="my-auto ml-auto p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                      onClick={(e) => {
                        e.preventDefault();
                        const dirtyOther = [...pageData.other];
                        dirtyOther.splice(index, 1);

                        changeHandler({
                          target: {
                            name: 'other',
                            value: [...dirtyOther],
                          },
                        });
                        return false;
                      }}
                    >
                      <Times className="h-4 w-4" />
                    </button>
                  </li>
                );
              })
            : null}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            changeHandler({
              target: {
                name: 'other',
                value: [...pageData.other, { text: otherText, target: otherTarget }],
              },
            });
            return false;
          }}
        >
          <div className="-mx-2 mb-5 flex flex-row">
            <div className="w-2/5 px-2">
              <Label htmlFor="text">{t('Label')}</Label>
              <Input
                id="text"
                name="text"
                onChange={(e) => setOtherText(e.target.value)}
                value={otherText}
              />
            </div>
            <div className="w-3/5 px-2">
              <Label htmlFor="target">{t('Target')}</Label>
              <Input
                id="target"
                name="target"
                onChange={(e) => setOtherTarget(e.target.value)}
                value={otherTarget}
              />
            </div>
            <div className="flex px-2">
              <ActionButton type="secondary" icon={Plus} className="mt-auto h-[2.6rem]">
                {t('Add')}
              </ActionButton>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-10 flex flex-row-reverse">
        <ActionButton
          icon={Arrow}
          onClick={() => {
            setValidity(true);
            onNext();
          }}
        >
          {t('Next')}
        </ActionButton>
      </div>
    </>
  );
};

export default Socials;
