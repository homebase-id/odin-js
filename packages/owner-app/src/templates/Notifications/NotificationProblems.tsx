import { Question, t } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Section from '../../components/ui/Sections/Section';
import { getOperatingSystem } from '@youfoundation/js-lib/auth';

const NotificationProblems = () => {
  const os = getOperatingSystem();
  const isiOs = os === 'iOS';
  const isAndroid = os === 'Android';

  return (
    <>
      <PageMeta title={t('Notifications')} icon={Question} />

      <Section title={t(`I can't enable notifications?`)}>
        <div className="flex max-w-xl flex-col gap-4">
          {!isiOs ? (
            <>
              <p>
                <Em className="block">iOS 16.4</Em>
                iOS only allows notifications from web apps since iOS 16.4. Make sure you are
                running a version of iOS that is at mimimum 16.4
              </p>
              <p>
                <Em className="block">Needs to be installed</Em>
                Next to that, iOS is pretty strict on how and if web applications can send you
                notifications. You will have to &quot;install&quot; the web application to your home
                screen.
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
          <p>
            <Em className="block">Make sure you don&apos;t block notifications</Em>
            From your browser settings you might have blocked notifications. Make sure you allow
            notifications from this website.
          </p>
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
