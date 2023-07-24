import { ReactNode, useRef, useState } from 'react';
import { useMatch } from 'react-router-dom';
import IdentityIFollowEditDialog from '../../components/Dialog/IdentityIFollowEditDialog/IdentityIFollowEditDialog';
import {
  ActionGroup,
  Block,
  useIntersection,
  useFollowerInfinite,
  useFollowingInfinite,
  SubtleMessage,
} from '@youfoundation/common-app';
import { Pencil } from '@youfoundation/common-app';
import { Persons } from '@youfoundation/common-app';
import { Times } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import useConnection from '../../hooks/connections/useConnection';
import useContact from '../../hooks/contacts/useContact';
import useIdentityIFollow from '../../hooks/follow/useIdentityIFollow';
import { Eye } from '@youfoundation/common-app';
import IdentityThatFollowsDialog from '../../components/Dialog/IdentityIFollowEditDialog/IdentityThatFollowsDialog';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Submenu from '../../components/SubMenu/SubMenu';

const Follow = () => {
  const followersMatch = useMatch({ path: 'owner/follow/followers' });

  return (
    <>
      <PageMeta icon={Persons} title={'Following & Followers'} />
      <Submenu
        items={[
          {
            title: `People that I follow`,
            path: `/owner/follow/following`,
          },
          {
            title: `People that follow me`,
            path: `/owner/follow/followers`,
          },
        ]}
        className="-mt-6 mb-6"
      />

      {followersMatch ? <Followers /> : <Following />}
    </>
  );
};

const Following = () => {
  const {
    fetch: { data: followingPages, isLoading: isFollowingLoading, hasNextPage, fetchNextPage },
  } = useFollowingInfinite({ pageSize: 10 });
  const following = followingPages?.pages?.flatMap((page) => page?.results);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersection(
    hasNextPage ? loadMoreRef : undefined,
    () => {
      fetchNextPage();
    },
    true
  );

  return (
    <>
      {isFollowingLoading ? (
        <></>
      ) : following?.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {following.map((odinId) => {
            if (!odinId) return null;
            return <FollowingIdentity odinId={odinId} key={odinId} />;
          })}
          <div ref={loadMoreRef} key="load-more" className="h-1 w-full"></div>
        </div>
      ) : (
        <SubtleMessage>{t("You're not following anyone")}</SubtleMessage>
      )}
    </>
  );
};

const Followers = () => {
  const {
    data: followersPages,
    isLoading: isFollowersLoading,
    hasNextPage,
    fetchNextPage,
  } = useFollowerInfinite({ pageSize: 10 });
  const followers = followersPages?.pages?.flatMap((page) => page?.results);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersection(
    hasNextPage ? loadMoreRef : undefined,
    () => {
      fetchNextPage();
    },
    true
  );

  return (
    <>
      {isFollowersLoading ? (
        <></>
      ) : followers?.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {followers.map((odinId) => {
            if (!odinId) return null;
            return <FollowIdentity odinId={odinId} key={odinId} />;
          })}
          <div ref={loadMoreRef} key="load-more" className="h-1 w-full"></div>
        </div>
      ) : (
        <SubtleMessage>{t("You don't have any followers")}</SubtleMessage>
      )}
    </>
  );
};

const FollowIdentity = ({ odinId }: { odinId: string }) => {
  const { mutate: block } = useConnection({}).block;
  const [isShowDetails, setIsDetails] = useState(false);

  return (
    <>
      <IdentityTeaser key={odinId} odinId={odinId} size="sm">
        <ActionGroup
          type="mute"
          size="square"
          options={[
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDetails(true);
              },
              icon: Eye,
              label: t('Details'),
            },
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                block(odinId);
              },
              confirmOptions: {
                title: t('Block'),
                body: `${t('Are you sure you want to stop')} "${odinId}" ${t(
                  'from following you by blocking them'
                )}?`,
                buttonText: t('Block'),
              },
              icon: Block,
              label: t('Block'),
            },
          ]}
          className="text-sm"
        >
          ...
        </ActionGroup>
      </IdentityTeaser>
      {isShowDetails ? (
        <IdentityThatFollowsDialog
          odinId={odinId}
          isOpen={isShowDetails}
          onConfirm={() => setIsDetails(false)}
          onCancel={() => setIsDetails(false)}
        />
      ) : null}
    </>
  );
};

const FollowingIdentity = ({ odinId }: { odinId: string }) => {
  const { mutate: unfollow } = useIdentityIFollow({ odinId }).unfollow;
  const [isEdit, setIsEdit] = useState(false);

  return (
    <>
      <IdentityTeaser key={odinId} odinId={odinId} size="sm">
        <ActionGroup
          type="mute"
          size="square"
          options={[
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEdit(true);
              },
              icon: Pencil,
              label: t('Edit'),
            },
            {
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                unfollow({ odinId });
              },
              confirmOptions: {
                title: t('Unfollow'),
                body: `${t('Are you sure you want to unfollow')} "${odinId}"?`,
                buttonText: t('Unfollow'),
              },
              icon: Times,
              label: t('Unfollow'),
            },
          ]}
          className="text-sm"
        >
          ...
        </ActionGroup>
      </IdentityTeaser>
      {isEdit ? (
        <IdentityIFollowEditDialog
          odinId={odinId}
          isOpen={isEdit}
          onConfirm={() => setIsEdit(false)}
          onCancel={() => setIsEdit(false)}
        />
      ) : null}
    </>
  );
};

const IdentityTeaser = ({
  odinId,
  className,
  size,
  children,
}: {
  odinId: string;
  className?: string;
  size?: 'md' | 'sm';
  children?: ReactNode;
}) => {
  const imageSizeClass = size === 'sm' ? 'h-10 w-10 mr-2' : 'h-16 w-16 mr-4';
  const { data: contactData } = useContact({ odinId: odinId }).fetch;

  return (
    <div
      className={`bg-white dark:bg-black ${
        className ?? ''
      }  rounded-lg border border-gray-200 p-4 hover:shadow-md dark:border-gray-700 hover:dark:shadow-slate-600`}
    >
      <div className="flex h-full items-center">
        <a href={`https://${odinId}`}>
          <img
            src={`https://${odinId}/pub/image`}
            className={`${imageSizeClass} flex-shrink-0 rounded-full bg-gray-100 object-cover object-center`}
          />
        </a>
        <div className="flex-grow ">
          <h2
            className={`title-font font-medium ${
              size === 'sm' ? 'text-sm' : ''
            } text-foreground text-opacity-60`}
          >
            {contactData?.name?.displayName ?? odinId}
          </h2>
          <p className={`${size === 'sm' ? 'text-xs' : 'text-sm'} text-foreground text-opacity-40`}>
            {odinId}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Follow;
