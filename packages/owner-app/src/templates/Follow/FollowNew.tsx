import { BlogConfig } from '@youfoundation/js-lib';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CheckboxToggle from '../../components/Form/CheckboxToggle';
import Alert from '../../components/ui/Alerts/Alert/Alert';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import { DomainHighlighter } from '@youfoundation/common-app';
import { Quote } from '@youfoundation/common-app';
import { t } from '../../helpers/i18n/dictionary';
import useFollowingInfinite from '../../hooks/follow/useFollowing';
import useIdentityIFollow from '../../hooks/follow/useIdentityIFollow';
import useSocialChannels from '../../hooks/socialFeed/socialChannels/useSocialChannels';

const Following = () => {
  const { toFollowKey } = useParams();
  const [searchParams] = useSearchParams();
  const channels = searchParams.get('chnl')?.split(',') || [];

  const { data: identityIFollow, isFetchedAfterMount: identityIFollowLoaded } = useIdentityIFollow({
    odinId: toFollowKey,
  }).fetch;

  const { data: socialChannels, isFetchedAfterMount: socialChannelsLoaded } = useSocialChannels({
    odinId: toFollowKey,
  }).fetch;

  const [channelSelection, setChannelSelection] = useState(channels);
  useEffect(() => {
    // if no specific list is set, add all existing ones as selected; Eg: if no channel is explicitly passed then it's a follow all
    if (!channelSelection && socialChannels?.length) {
      setChannelSelection(socialChannels?.map((chnl) => chnl.channelId));
    }
  }, [socialChannelsLoaded]);

  useEffect(() => {
    if (identityIFollow) {
      //Already following
      if (identityIFollow.channels) {
        // Selected set of channels
        setChannelSelection(
          Array.from(new Set([...identityIFollow.channels.map((chnl) => chnl.alias), ...channels]))
        );
      } else {
        // All channels
        if (socialChannels?.length)
          setChannelSelection(socialChannels.map((chnl) => chnl?.channelId));
      }
    }
  }, [identityIFollowLoaded]);

  const navigate = useNavigate();
  const cancel = () => {
    navigate(-1);
  };

  const { mutateAsync: follow, status: followStatus } = useFollowingInfinite({}).follow;
  const doFollow = async () => {
    if (!toFollowKey) return null;

    const selectChannels = channelSelection?.length !== socialChannels?.length;

    await follow({
      odinId: toFollowKey,
      notificationType: selectChannels ? 'selectedChannels' : 'allNotifications',
      channels: selectChannels
        ? channelSelection?.map((chnl) => {
            return { alias: chnl, type: BlogConfig.DriveType };
          })
        : undefined,
      // Pass undefined if all socialChannels are selected so it remains a follow all
    });
    navigate(-1);
  };

  if (!toFollowKey) return null;

  const alreadyFollowing = !!identityIFollow;

  return (
    <>
      <Helmet>
        <title>
          {t('Follow')} &quot;{toFollowKey}&quot; | Odin
        </title>
      </Helmet>

      <section className="py-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            <h1 className="mb-5 text-4xl dark:text-white">
              {alreadyFollowing ? t('Edit what you follow of') : t('Follow')} &quot;
              <DomainHighlighter>{toFollowKey}</DomainHighlighter>&quot;
            </h1>

            <p className="mt-2">
              {alreadyFollowing ? (
                <>
                  {t('You are already following')} &quot;
                  <DomainHighlighter>{toFollowKey}</DomainHighlighter>&quot;.
                  <br />
                  {t('Edit the channels you wish to follow')}
                </>
              ) : (
                <>
                  {t('By following')} &quot;<DomainHighlighter>{toFollowKey}</DomainHighlighter>
                  &quot; {t('you will see post from their channels in your feed')}
                </>
              )}
            </p>
            {!socialChannels && socialChannelsLoaded ? (
              <Alert
                type="info"
                title={t("You don't have access to any channels")}
                className="my-5"
              >
                {t('By following you might not get any posts')}
              </Alert>
            ) : (
              <ul className="my-5 grid grid-flow-row gap-4">
                {socialChannels?.map((chnl) => {
                  const isChecked =
                    channelSelection?.some((selection) => chnl.channelId === selection) || false;

                  return (
                    <li
                      key={chnl.channelId}
                      className="flex cursor-pointer flex-row items-center rounded-lg border bg-white p-4 dark:border-slate-800"
                      onClick={() => {
                        if (isChecked) {
                          setChannelSelection(
                            channelSelection.filter((select) => select !== chnl.channelId)
                          );
                        } else {
                          setChannelSelection([...channelSelection, chnl.channelId]);
                        }
                      }}
                    >
                      <Quote className="mr-3 mt-1 h-6 w-6" />
                      <div>
                        <h2>{chnl.name}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-600">
                          {chnl.description}
                        </p>
                      </div>
                      <CheckboxToggle
                        checked={isChecked}
                        readOnly={true}
                        className="pointer-events-none my-auto ml-auto"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="-sm:mx-2 mt-10 sm:flex sm:flex-row-reverse">
              <ActionButton onClick={doFollow} state={followStatus} type="primary">
                {t('Confirm')}
              </ActionButton>
              <ActionButton className="my-3 sm:mx-2 sm:my-auto" type="secondary" onClick={cancel}>
                {t('Cancel')}
              </ActionButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Following;
