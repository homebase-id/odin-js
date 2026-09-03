import {
  t,
  ActionButton,
  DialogWrapper,
  LoadingBlock,
  HybridLink,
  SubtleMessage,
  useDotYouClientContext,
  usePortal,
} from '@homebase-id/common-app';
import {
  Arrow,
  Circles as CirclesIcon,
  HardDrive,
  Persons,
  Triangle,
} from '@homebase-id/common-app/icons';
import { DriveDefinition } from '@homebase-id/js-lib/core';
import {
  AUTO_CONNECTIONS_CIRCLE_ID,
  CircleDefinition,
  CircleDesignation,
  CircleGrantOn,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  DriveGrant,
  fetchMembersOfCircle,
  Membership,
} from '@homebase-id/js-lib/network';
import {
  drivesEqual,
  getDrivePermissionFromNumber,
  getPermissionKeyName,
  stringGuidsEqual,
} from '@homebase-id/js-lib/helpers';
import { useQueries } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { RedactedAppRegistration } from '../../provider/app/AppManagementProviderTypes';

/**
 * The read-only building blocks behind the third-party pages: circles with every field shown, the
 * identities a circle grant actually reaches, drive grants labelled by slug, and the collapsible
 * shell they all sit in.
 *
 * Extracted from the Overview page so the app detail page can show the same facts. Two renderings
 * of "what does this app reach" that drift apart is worse than none: the detail page is where you
 * change things, so it is the one that must not disagree.
 */
export const CircleGrid = ({
  circles,
  apps,
  drives,
}: {
  circles: CircleDefinition[];
  apps: RedactedAppRegistration[] | undefined;
  drives: DriveDefinition[] | undefined;
}) => (
  <div className="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-4">
    {circles.map((circle) => (
      <CircleOverview circle={circle} apps={apps} drives={drives} key={circle.id} />
    ))}
  </div>
);

/**
 * A titled block that starts closed. Everything on this page is collapsed by default, so the count
 * is part of the header rather than the body: a closed section still has to say whether there is
 * anything inside it, otherwise the page is a list of labels that all look alike.
 */
export const Collapsible = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 border-opacity-80 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex flex-row items-center gap-2 rounded-lg p-3 text-left font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        title={isOpen ? t('Collapse') : t('Expand')}
      >
        <Triangle
          className={`h-3 w-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        <span>{title}</span>
        {count !== undefined ? <span className="text-slate-400">{count}</span> : null}
      </button>
      <div className={`flex flex-col gap-3 px-3 pb-3 ${isOpen ? '' : 'hidden'}`}>{children}</div>
    </div>
  );
};

export const PanelBlock = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <h4 className="mb-1 text-sm font-medium text-slate-400">{label}</h4>
    {children}
  </div>
);

/**
 * The members behind a set of circles, as one list. Membership is a request per circle, and the
 * hook only mounts with the panel, so nothing is asked for until someone opens it. The query key
 * is the one useCircle's fetchMembers uses, so an answer a circle page already fetched is reused
 * rather than asked for a second time.
 */
export const useMembersOfCircles = (circles: CircleDefinition[]) => {
  const dotYouClient = useDotYouClientContext();

  const results = useQueries({
    queries: circles.map((circle) => ({
      queryKey: ['circleMembers', circle.id],
      queryFn: () => fetchMembersOfCircle(dotYouClient, circle.id as string),
      refetchOnWindowFocus: false,
      enabled: !!circle.id,
    })),
  });

  // One identity can sit in several of an app's circles while still getting the access only once,
  // so the list is keyed by identity with the circles that put it there named beside it.
  const byDomain = new Map<string, { member: Membership; viaCircles: string[] }>();
  results.forEach((result, index) => {
    (result.data ?? []).forEach((member) => {
      const existing = byDomain.get(member.domain);
      if (existing) existing.viaCircles.push(circles[index].name);
      else byDomain.set(member.domain, { member, viaCircles: [circles[index].name] });
    });
  });

  return {
    members: Array.from(byDomain.values()),
    isLoading: results.some((result) => result.isLoading),
  };
};

/**
 * Who actually receives the circle-member grant: every member of the circles the app authorizes.
 * Behind a button rather than loaded with the page, because it costs a request per circle and a
 * built-in circle can hold every connection you have.
 */
export const CircleMemberIdentities = ({
  appName,
  circles,
  grants,
  drives,
}: {
  appName: string;
  circles: CircleDefinition[];
  grants: DriveGrant[];
  drives: DriveDefinition[] | undefined;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!circles.length)
    return <SubtleMessage>{t('No authorized circles, so nobody gets this access')}</SubtleMessage>;

  return (
    <>
      <ActionButton type="secondary" icon={Persons} onClick={() => setIsOpen(true)}>
        {t('Show the identities')}
      </ActionButton>
      {isOpen ? (
        <CircleMemberIdentitiesDialog
          appName={appName}
          circles={circles}
          grants={grants}
          drives={drives}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
};

/**
 * The identity list in a side panel. Opened from one app's panel but read on its own, so the
 * header carries the access with it: whose app it is, that this is what connections get rather
 * than what the app holds, which circles carry it, and the drives it opens.
 */
export const CircleMemberIdentitiesDialog = ({
  appName,
  circles,
  grants,
  drives,
  onClose,
}: {
  appName: string;
  circles: CircleDefinition[];
  grants: DriveGrant[];
  drives: DriveDefinition[] | undefined;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const { members, isLoading } = useMembersOfCircles(circles);

  const dialog = (
    <DialogWrapper
      size="2xlarge"
      onClose={onClose}
      title={
        <div className="flex flex-col gap-2">
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{appName}</span>
          <span>{t('Access your connections get')}</span>

          <div className="flex flex-row flex-wrap items-center gap-2 text-sm font-normal">
            {circles.map((circle) => (
              <HybridLink
                href={`/owner/circles/${encodeURIComponent(circle.id ?? '')}`}
                className="flex flex-row items-center gap-1 rounded bg-slate-200 px-2 py-0.5 hover:underline dark:bg-slate-800"
                key={circle.id}
              >
                <CirclesIcon className="h-4 w-4 flex-shrink-0" />
                {circle.emoji ? `${circle.emoji} ` : ''}
                {circle.name}
              </HybridLink>
            ))}
          </div>

          <div className="text-base font-normal">
            <DriveGrantList grants={grants} drives={drives} />
          </div>
        </div>
      }
    >
      {isLoading ? (
        <>
          <LoadingBlock className="m-1 h-6" />
          <LoadingBlock className="m-1 h-6" />
        </>
      ) : !members.length ? (
        <SubtleMessage>{t('Nobody is a member of these circles yet')}</SubtleMessage>
      ) : (
        <ul className="flex flex-col gap-1">
          {members.map(({ member, viaCircles }) => (
            <li key={member.domain} className="flex flex-row flex-wrap items-baseline gap-x-2">
              <HybridLink
                href={
                  member.domainType === 'youAuth'
                    ? `/owner/third-parties/services/${encodeURIComponent(member.domain)}`
                    : `/owner/connections/${encodeURIComponent(member.domain)}`
                }
                className="break-all hover:underline"
              >
                {member.domain}
              </HybridLink>
              {/* Only worth naming the route in when there is more than one it could have been. */}
              {circles.length > 1 ? (
                <span className="text-sm text-slate-400">{`${t('via')} ${viaCircles.join(', ')}`}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export const formatTimestamp = (value: number | undefined) =>
  value ? new Date(value).toLocaleString() : undefined;

/**
 * Every field on CircleDefinition, so this page is the one place the whole circle is visible.
 * grantOn / designation / emoji / appId are only served by hosts that have them, so each is
 * rendered only when present rather than shown as a default that the host never sent.
 */
export const CircleOverview = ({
  circle,
  apps,
  drives,
}: {
  circle: CircleDefinition;
  apps: RedactedAppRegistration[] | undefined;
  drives: DriveDefinition[] | undefined;
}) => {
  const isSystemCircle =
    stringGuidsEqual(circle.id, CONFIRMED_CONNECTIONS_CIRCLE_ID) ||
    stringGuidsEqual(circle.id, AUTO_CONNECTIONS_CIRCLE_ID);

  const owningApp = circle.appId
    ? (apps ?? []).find((app) => stringGuidsEqual(app.appId, circle.appId))
    : undefined;

  const permissionKeys = circle.permissions?.keys ?? [];
  const created = formatTimestamp(circle.created);
  const lastUpdated = formatTimestamp(circle.lastUpdated);

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-gray-200 border-opacity-80 p-4 dark:border-gray-700 ${
        circle.disabled ? 'opacity-50' : ''
      }`}
    >
      <HybridLink
        href={`/owner/circles/${encodeURIComponent(circle.id ?? '')}`}
        className="flex flex-row items-center hover:underline"
      >
        <CirclesIcon className="mr-3 h-6 w-6 flex-shrink-0" />
        <span className="flex flex-row flex-wrap items-baseline gap-2">
          <span>
            {circle.emoji ? `${circle.emoji} ` : ''}
            {circle.disabled ? `${t('Disabled')}: ` : ''}
            {circle.name}
          </span>
          {isSystemCircle ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {t('Built-in')}
            </span>
          ) : null}
        </span>
      </HybridLink>

      {circle.description ? <small className="text-slate-400">{circle.description}</small> : null}

      <Collapsible title={t('Details')}>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <Fact label={t('Owned by')} hint={OWNERSHIP_HINTS.ownedBy}>
            {/* "Chat" alone does not say what Chat is; the qualifier is what makes the row
                readable to someone who has not memorised the app list. */}
            {circle.appId ? (
              owningApp ? (
                <>
                  <HybridLink
                    href={`/owner/third-parties/apps/${encodeURIComponent(owningApp.appId)}`}
                    className="hover:underline"
                  >
                    {owningApp.name}
                  </HybridLink>
                  <span className="text-slate-400">{` ${t('(app)')}`}</span>
                </>
              ) : (
                <>
                  <span className="break-all font-mono">{circle.appId}</span>
                  <span className="text-slate-400">{` ${t('(app, no longer registered)')}`}</span>
                </>
              )
            ) : (
              t('You (not owned by an app)')
            )}
          </Fact>

          {circle.designation !== undefined ? (
            <Fact label={t('Designation')} hint={DESIGNATION_HINTS[circle.designation]}>
              {DESIGNATION_LABELS[circle.designation] ?? circle.designation}
            </Fact>
          ) : null}

          {circle.grantOn !== undefined ? (
            <Fact
              label={t('Granted on')}
              hint={`${GRANT_ON_HINTS[circle.grantOn] ?? ''} ${GRANT_ON_CAVEAT}`.trim()}
            >
              {GRANT_ON_LABELS[circle.grantOn] ?? circle.grantOn}
            </Fact>
          ) : null}

          <Fact label={t('Enabled')}>{circle.disabled ? t('No') : t('Yes')}</Fact>

          {created ? <Fact label={t('Created')}>{created}</Fact> : null}
          {lastUpdated ? <Fact label={t('Last updated')}>{lastUpdated}</Fact> : null}

          {circle.id ? (
            <Fact label={t('Id')}>
              <span className="break-all font-mono text-slate-400">{circle.id}</span>
            </Fact>
          ) : null}
        </dl>
      </Collapsible>

      <Collapsible title={t('Permissions')} count={permissionKeys.length}>
        <PermissionKeyList keys={permissionKeys} />
      </Collapsible>

      <Collapsible title={t('Drives')} count={(circle.driveGrants ?? []).length}>
        <DriveGrantList grants={circle.driveGrants ?? []} drives={drives} />
      </Collapsible>
    </div>
  );
};

/** One label/value pair in a facts grid; used for both apps and circles. */
/**
 * A label/value pair, with an optional line saying what the label means. The hint sits under the
 * value rather than under the label: the label column is sized to its content, and a sentence in
 * there would stretch it and push every value on the page out of line.
 */
export const Fact = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <>
    <dt className="text-slate-400">{label}</dt>
    <dd>
      {children}
      {hint ? <small className="block max-w-prose text-slate-400">{hint}</small> : null}
    </dd>
  </>
);

/**
 * What the three fields of the new circle/app model mean, in the owner's terms rather than the
 * schema's. Stated once here so the circle page, the app page and the overview cannot describe
 * the same field differently.
 */
export const OWNERSHIP_HINTS = {
  ownedBy: t('The app that declared this circle at install time and re-creates it if it goes missing. Its name, grants and enrolment rule are that app\'s recipe -- editing them by hand may be undone the next time the app is registered or updated.'),
  icrKey: t('Whether this app can act as you toward the identities you are connected to -- sending and reading over peer. Without it the app only reaches data on this identity.'),
} as const;

/**
 * What each designation actually means, rather than one line covering all three. The value on
 * screen is one of these, so the explanation should be about that one.
 */
export const DESIGNATION_LABELS: Record<string, string> = {
  [CircleDesignation.Personal]: t('Personal'),
  [CircleDesignation.Audience]: t('Audience'),
  [CircleDesignation.Vendor]: t('Vendor'),
};

export const GRANT_ON_LABELS: Record<string, string> = {
  [CircleGrantOn.None]: t('Manual only'),
  [CircleGrantOn.Connect]: t('Any new connection'),
  [CircleGrantOn.OwnFlowConnect]: t("This app's own consent flow"),
  [CircleGrantOn.Review]: t('After your review'),
};

export const DESIGNATION_HINTS: Record<string, string> = {
  [CircleDesignation.Personal]: t('People you know individually. Membership counts as having reviewed them, so these are the circles sensitive things can be shared with.'),
  [CircleDesignation.Audience]: t('A group you broadcast to rather than people you know individually -- the subscribers to one of your channels, for instance.'),
  [CircleDesignation.Vendor]: t('A business or service you deal with. It can send things to you -- receipts, bookings -- without being able to read anything else of yours.'),
};

/**
 * What each enrolment rule means. The trailing caveat is the same for all of them: the app asks,
 * your per-app setting decides.
 */
export const GRANT_ON_HINTS: Record<string, string> = {
  [CircleGrantOn.None]: t('Manual membership only. Nobody joins unless you add them.'),
  [CircleGrantOn.Connect]: t('Anyone who connects to you joins automatically, introductions included. Such a circle may only grant write access, never read -- so a stranger can send you things but see nothing.'),
  [CircleGrantOn.OwnFlowConnect]: t('Only people who connect through this app\'s own consent screen join. An introduction never enrols them.'),
  [CircleGrantOn.Review]: t('People join when you complete the connection review.'),
};

export const GRANT_ON_CAVEAT = t('The owning app asks for this; whether it takes effect is your per-app setting.');

/**
 * Named through getPermissionKeyName rather than AppPermissionType: that enum only covers the
 * keys an app may request, and anything it misses would otherwise read as 'none'.
 */
export const PermissionKeyList = ({ keys }: { keys: number[] }) => {
  if (!keys.length) return <SubtleMessage>{t('No permissions')}</SubtleMessage>;

  return (
    <ul className="flex flex-row flex-wrap gap-2 text-sm text-slate-400">
      {keys.map((key) => (
        <li key={key} className="rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
          {t(getPermissionKeyName(key))}
        </li>
      ))}
    </ul>
  );
};

export const DriveGrantList = ({
  grants,
  drives,
}: {
  grants: DriveGrant[];
  drives: DriveDefinition[] | undefined;
}) => {
  if (!grants.length) return <SubtleMessage>{t('No drives')}</SubtleMessage>;

  return (
    <div className="flex flex-col gap-1">
      {grants.map((grant) => (
        <DriveGrantRow
          grant={grant}
          drives={drives}
          key={`${grant.permissionedDrive?.drive?.alias}-${grant.permissionedDrive?.drive?.type}`}
        />
      ))}
    </div>
  );
};

export const DriveGrantRow = ({
  grant,
  drives,
}: {
  grant: DriveGrant;
  drives: DriveDefinition[] | undefined;
}) => {
  const targetDrive = grant.permissionedDrive?.drive;

  // Resolved against the already-fetched drive list rather than a query per row. A grant can
  // point at a drive that is gone (or that this page never fetched), so fall back to the alias.
  const drive = targetDrive
    ? (drives ?? []).find((d) => drivesEqual(d.targetDriveInfo, targetDrive))
    : undefined;

  const permission = t(getDrivePermissionFromNumber(grant.permissionedDrive?.permission));

  // Only app grants carry the flag; circle grants have no storage key concept, so undefined is
  // "not applicable" rather than "no key" and stays unlabelled.
  const storageKeyLabel = grant.hasStorageKey ? t('has storage key') : undefined;

  return (
    <div className="flex flex-row items-center">
      <HardDrive className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400" />
      {drive ? (
        <HybridLink
          href={`/owner/drives/${drive.targetDriveInfo.alias}_${drive.targetDriveInfo.type}`}
          className="hover:underline"
        >
          <DriveLabel drive={drive} permission={permission} extra={storageKeyLabel} />
        </HybridLink>
      ) : (
        <span className="text-slate-400">
          {targetDrive?.alias ? (
            <span className="break-all font-mono">{targetDrive.alias}</span>
          ) : (
            t('Unknown drive')
          )}
          {`: ${permission}`}
        </span>
      )}
    </div>
  );
};

export const DriveLabel = ({
  drive,
  permission,
  extra,
}: {
  drive: DriveDefinition;
  permission: string;
  extra?: string;
}) => (
  <span>
    {drive.name}
    {drive.driveSlug ? (
      <span className="ml-2 break-all font-mono text-sm text-slate-400">{drive.driveSlug}</span>
    ) : null}
    <span className="text-slate-400">{`: ${permission}${extra ? `, ${extra}` : ''}`}</span>
  </span>
);
