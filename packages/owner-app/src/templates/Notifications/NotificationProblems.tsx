import { Alert, Arrow, Question, t } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Section from '../../components/ui/Sections/Section';
import { getOperatingSystem } from '@youfoundation/js-lib/auth';
import { useState } from 'react';

const isOldIos = (version: string | undefined) => {
  const [major, minor] = (version || '').split('.');
  return Number(major) < 16 || (Number(major) === 16 && Number(minor) < 4);
};

const NotificationProblems = () => {
  const os = getOperatingSystem();
  const isiOs = os.name === 'iOS';
  const isUnsupportediOS = isiOs && isOldIos(os.version);

  const [isShowiOS, setShowiOS] = useState(false);

  return (
    <>
      <PageMeta
        title={t('Notifications')}
        icon={Question}
        breadCrumbs={[
          {
            title: t('Notifications'),
            href: '/owner/notifications',
          },
          { title: t('Common Problems') },
        ]}
      />

      <Section title={t(`I can't enable notifications?`)}>
        <div className="flex max-w-xl flex-col gap-4">
          <p>
            <Em className="block">Make sure you don&apos;t block notifications</Em>
            From your browser settings you might have blocked notifications. Make sure you allow
            notifications from this website.
          </p>
          {!isiOs ? (
            <button
              onClick={() => setShowiOS(!isShowiOS)}
              className={`flex flex-row items-center ${isShowiOS ? 'font-bold' : 'text-sm italic'}`}
            >
              {t('Info for iOS')}{' '}
              <Arrow
                className={`ml-2 h-4 w-4 transition-transform ${isShowiOS ? 'rotate-90' : ''}`}
              />
            </button>
          ) : null}
          {isiOs || isShowiOS ? (
            <>
              <p>
                <Em className="block">iOS 16.4</Em>
                {isUnsupportediOS ? (
                  <Alert type="warning" isCompact={true} className="mb-2">
                    Your iOS version is reported as {os.version}, which does not support
                    notifications, please upgrade your iOS version
                  </Alert>
                ) : null}
                iOS only allows notifications from web apps since iOS 16.4. Make sure you are
                running a version of iOS that is at mimimum 16.4
              </p>
              <p>
                <Em className="block">Needs to be installed</Em>
                iOS is pretty strict on how and if web applications can send you notifications. You
                will have to &quot;install&quot; the web application to your home screen.
              </p>
              <p>
                This is done by:
                <Ol>
                  <li>opening the web application in Safari</li>
                  <li>clicking the share button</li>
                  <li>selecting &quot;Add to Home Screen&quot;</li>
                </Ol>
                This will install the web application to your home screen, and allow you to enable
                push notifications.
              </p>
            </>
          ) : null}
        </div>
      </Section>

      <Section title={t(`I am not getting the test notification?`)}>
        <div className="flex max-w-xl flex-col gap-4">
          <p>
            <Em className="block">Can your browser send you notifications?</Em>
            Are you sure that your operating system allows your browser to send you notifications?
          </p>
        </div>
      </Section>
    </>
  );
};

export default NotificationProblems;

const Em = ({
  className,
  ...props
}: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>) => (
  <em className={`${className ?? ''} font-semibold`} {...props} />
);

const Ol = ({
  className,
  ...props
}: React.DetailedHTMLProps<React.HTMLAttributes<HTMLOListElement>, HTMLOListElement>) => (
  <ol className={`${className ?? ''} my-3 ml-4 grid list-decimal grid-flow-row gap-3`} {...props} />
);
