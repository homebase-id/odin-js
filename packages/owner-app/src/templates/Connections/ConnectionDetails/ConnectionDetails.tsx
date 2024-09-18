import { FC, ReactNode, useEffect, useState } from 'react';
import { useMatch, useParams } from 'react-router-dom';
import {
  RichTextRenderer,
  t,
  useBiography,
  useDotYouClientContext,
  useLinks,
  useSocials,
} from '@homebase-id/common-app';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useContact } from '../../../hooks/contacts/useContact';
import ContactInfo from '../../../components/Connection/ContactInfo/ContactInfo';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { ConnectionInfo } from '@homebase-id/js-lib/network';
import { ConnectionPermissionViewer } from './ConnectionPermissionViewer';
import { IdentityPageMetaAndActions } from './IdentityPageMetaAndActions';
import { IdentityAlerts } from './IdentityAlerts';
import { useConnectionGrantStatus } from '../../../hooks/connections/useConnectionGrantStatus';
import { CircleMembershipDialog } from '../../../components/Circles/CircleMembershipDialog/CircleMembershipDialog';
import SubMenu from '../../../components/SubMenu/SubMenu';
import { OdinImage } from '@homebase-id/ui-lib';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { CompanyImage } from '../../../components/Connection/CompanyImage/CompanyImage';
import { Arrow, Globe, IconProps, Clipboard as ClipboardIcon } from '@homebase-id/common-app/icons';
import Section from '../../../components/ui/Sections/Section';

const ConnectionDetails = () => {
  const rootMatch = useMatch('/owner/connections/:odinId');
  const settingsMatch = useMatch('/owner/connections/:odinId/settings');
  const aboutMatch = useMatch('/owner/connections/:odinId/about');
  const linksMatch = useMatch('/owner/connections/:odinId/links');
  const { odinId } = useParams();

  const {
    fetch: { data: connectionInfo, isLoading: connectionInfoLoading },
  } = useConnection({ odinId: odinId });

  const { data: contactData, isLoading: contactDataLoading } = useContact({
    odinId: odinId,
    canSave: connectionInfo?.status === 'connected',
  }).fetch;

  if (connectionInfoLoading || contactDataLoading) return <LoadingDetailPage />;
  if (!odinId) return <>{t('No matching connection found')}</>;

  return (
    <>
      <IdentityPageMetaAndActions odinId={odinId} />
      <IdentityAlerts odinId={odinId} />

      <SubMenu
        items={[
          {
            path: `/owner/connections/${odinId}`,
            title: t('Info'),
            end: true,
          },
          {
            path: `/owner/connections/${odinId}/about`,
            title: t('About'),
          },
          {
            path: `/owner/connections/${odinId}/links`,
            title: t('Links'),
          },
          connectionInfo?.status === 'connected'
            ? {
                path: `/owner/connections/${odinId}/settings`,
                title: t('Settings'),
              }
            : undefined,
        ]}
        className="-mt-6 mb-4"
      />

      {rootMatch ? (
        <>{contactData && <ContactInfo odinId={odinId} />}</>
      ) : aboutMatch ? (
        <IdentityAbout odinId={odinId} />
      ) : linksMatch ? (
        <IdentityLinks odinId={odinId} />
      ) : settingsMatch ? (
        <>
          {connectionInfo?.status === 'connected' ? (
            <ConnectedSettings odinId={odinId} connectionInfo={connectionInfo} />
          ) : null}
        </>
      ) : null}
    </>
  );
};

const IdentityAbout = ({ odinId }: { odinId: string }) => {
  const { data: bioData } = useBiography({ odinId });

  return (
    <Section className="flex flex-col gap-10">
      {bioData?.shortBio && (
        <RichTextRenderer className="leading-relaxed" body={bioData.shortBio.body} />
      )}
      {bioData?.experience ? (
        <div className="flex flex-col gap-5">
          {bioData.experience.map((experienceItem) => (
            <ExperienceBlock
              odinId={odinId}
              title={experienceItem.title}
              body={experienceItem.body}
              link={experienceItem.link}
              imageFileId={experienceItem.imageFileId}
              imageFileKey={experienceItem.imageFileKey}
              lastModified={experienceItem.lastModified}
              key={experienceItem.id}
            />
          ))}
        </div>
      ) : null}
    </Section>
  );
};

const ExperienceBlock = ({
  odinId,
  title,
  body,
  link,
  imageFileId,
  imageFileKey,
  lastModified,
  className,
}: {
  odinId: string;
  title: string;
  body: string | Record<string, unknown>[];
  link?: string;
  imageFileId?: string;
  imageFileKey?: string;
  lastModified: number | undefined;
  className?: string;
}) => {
  const dotYouClient = useDotYouClientContext();
  const domain = link ? new URL(link).hostname : undefined;

  return (
    <div
      className={`relative flex flex-row gap-2 overflow-hidden rounded-lg bg-background px-5 py-8 sm:gap-4 sm:px-8 sm:py-12 ${className}`}
    >
      {imageFileId ? (
        <OdinImage
          dotYouClient={dotYouClient}
          odinId={odinId}
          targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
          fileId={imageFileId}
          fileKey={imageFileKey}
          lastModified={lastModified}
          fit="contain"
          className="relative aspect-square w-1/6 flex-shrink-0 flex-grow-0"
        />
      ) : domain ? (
        <div className="w-1/6 flex-shrink-0 flex-grow-0">
          <CompanyImage domain={domain} fallbackSize="md" />
        </div>
      ) : null}
      <div className="flex-grow">
        <h1 className="title-font mb-3 text-xl font-medium sm:text-2xl">{title}</h1>
        <RichTextRenderer className="leading-relaxed" body={body} />
        {link ? (
          <div className="flex flex-row-reverse">
            <a
              href={link.startsWith('http') ? link : `https://${link}`}
              target="_blank"
              className="flex flex-row items-center gap-1 text-primary"
              rel="noreferrer"
            >
              {t('Link')}
              <Arrow className="h-5 w-5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const IdentityLinks = ({ odinId }: { odinId: string }) => {
  const { data: links } = useLinks({ odinId });
  const { data: socials } = useSocials({ odinId });

  const allLinks =
    links?.map((link) => ({
      icon: Globe,
      link: link.target,
      copyText: undefined,
      priority: link.priority,
      children: link.text,
    })) || [];

  const allSocials = socials
    ? socials.map((social) => ({
        ...social,
      }))
    : [];

  const both = [...allLinks, ...allSocials].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  return (
    <Section>
      {both?.map((link, index) => <BetterLink key={index} {...link} className={'px-4 py-3'} />)}
    </Section>
  );
};

const BetterLink = ({
  icon,
  link,
  copyText,
  children,
  style,
  className,
}: {
  icon: FC<IconProps>;
  link: string;
  copyText?: string;
  children: ReactNode;
  style?: 'secondary';
  className?: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [isCopied]);

  return (
    <>
      <a
        href={link}
        className={`relative m-2 flex flex-row hover:shadow-lg focus:outline-none ${
          style === 'secondary'
            ? `border-gray rounded border hover:bg-background`
            : `bg-button hover:bg-button text-button-text rounded border-0 transition-colors hover:bg-opacity-80`
        } ${className ?? ''}`}
        target="_blank"
        rel={'noopener noreferrer'}
        onClick={(e) => {
          if (copyText) {
            e.preventDefault();
            setIsCopied(true);
            navigator.clipboard.writeText(copyText);
          }
        }}
      >
        {icon({ className: `my-auto ${style === 'secondary' ? 'mr-2' : 'mr-5'} h-5 w-5` })}
        {copyText ? (
          <div className="flex w-full flex-row">
            {children}
            <ClipboardIcon className="ml-auto h-5 w-5" />
          </div>
        ) : (
          children
        )}
        {isCopied && (
          <div className="absolute inset-0 z-10 flex w-full flex-row items-center justify-center">
            <span className="rounded-lg bg-background/75 px-2 py-1 text-foreground shadow-lg">
              {t('Copied')}
            </span>
          </div>
        )}
      </a>
    </>
  );
};

const ConnectedSettings = ({
  odinId,
  connectionInfo,
}: {
  odinId: string;
  connectionInfo: ConnectionInfo;
}) => {
  const [isEditPermissionActive, setIsEditPermissionActive] = useState(false);
  const { data: grantStatus } = useConnectionGrantStatus({
    odinId: connectionInfo?.status === 'connected' ? odinId : undefined,
  }).fetchStatus;

  const activeConnection = connectionInfo as ConnectionInfo;

  return (
    <>
      <ConnectionPermissionViewer
        accessGrant={activeConnection.accessGrant}
        grantStatus={grantStatus}
        openEditCircleMembership={() => setIsEditPermissionActive(true)}
      />
      <CircleMembershipDialog
        title={`${t('Edit Circle Membership for')} ${odinId}`}
        isOpen={isEditPermissionActive}
        odinId={odinId}
        currentCircleGrants={activeConnection.accessGrant.circleGrants}
        onCancel={() => {
          setIsEditPermissionActive(false);
        }}
        onConfirm={() => {
          setIsEditPermissionActive(false);
        }}
      />
      <section>
        <p className="text-sm">
          {t('Connected since')}: {new Date(activeConnection.created).toLocaleDateString()}
        </p>
      </section>
    </>
  );
};

export default ConnectionDetails;
