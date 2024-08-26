import { useAuth } from '../../hooks/auth/useAuth';
import {
  SecurityGroupType,
  DrivePermissionType,
  AccessControlList,
  DotYouClient,
  queryBatch,
  DEFAULT_PAYLOAD_KEY,
  NewHomebaseFile,
} from '@homebase-id/js-lib/core';
import { demoImageArray } from './DemoImages';
import { attrHasData, base64ToArrayBuffer, getFunName, getRandomAbstract, rando } from './helpers';
import { lotrRealm } from './DemoLotr';
import { useAttribute } from '../../hooks/profiles/useAttribute';
import { Select, useChannel } from '@homebase-id/common-app';
import { useManagePost } from '@homebase-id/common-app';

import { useCircles } from '@homebase-id/common-app';
import { useCircle } from '@homebase-id/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { useHomeAttributes } from '../../hooks/profiles/useHomeAttributes';
import {
  Attribute,
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  ProfileConfig,
  SocialFields,
  getProfileAttribute,
} from '@homebase-id/js-lib/profile';
import {
  HomePageConfig,
  HomePageAttributes,
  getChannelDefinition,
  ChannelDefinition,
  getChannelDefinitions,
  GetTargetDriveFromChannelId,
  Article,
  PostContent,
  HomePageThemeFields,
} from '@homebase-id/js-lib/public';
import { slugify, getNewId } from '@homebase-id/js-lib/helpers';
import { useState } from 'react';
import { useManageChannel } from '@homebase-id/common-app';

type RealmName = keyof typeof lotrRealm | undefined;
type RealmData = (typeof lotrRealm)[keyof typeof lotrRealm];

let initalChar: RealmName;
const domain = window.location.hostname;

// Replace demo hosts to locals for the lotrRealm
initalChar = ['frodobaggins.me', 'frodo.digital', 'frodo.dotyou.cloud'].includes(domain)
  ? 'frodo.dotyou.cloud'
  : initalChar;

initalChar = ['samwise.digital', 'samwisegamgee.me', 'sam.dotyou.cloud'].includes(domain)
  ? 'sam.dotyou.cloud'
  : initalChar;

initalChar = ['merry.dotyou.cloud'].includes(domain) ? 'merry.dotyou.cloud' : initalChar;
initalChar = ['pippin.dotyou.cloud'].includes(domain) ? 'pippin.dotyou.cloud' : initalChar;

const DemoData = () => {
  const dotYouClient = useAuth().getDotYouClient();
  const [character, setCharacter] = useState<RealmName>(initalChar);

  const realmData: RealmData = lotrRealm[character as keyof typeof lotrRealm];

  return (
    <section>
      <PageMeta
        title={
          <span className="flex w-full flex-col gap-4">
            Demo Data Generator:{' '}
            <Select
              onChange={(e) => setCharacter(e.target.value as RealmName)}
              defaultValue={character}
            >
              <option>-- Select a character --</option>
              <option value={'frodo.dotyou.cloud'}>frodo.dotyou.cloud</option>
              <option value={'sam.dotyou.cloud'}>sam.dotyou.cloud</option>
              <option value={'merry.dotyou.cloud'}>merry.dotyou.cloud</option>
              <option value={'pippin.dotyou.cloud'}>pippin.dotyou.cloud</option>
            </Select>
          </span>
        }
      />

      {!character || !realmData ? null : (
        <div className="my-5">
          <DemoDataProfile client={dotYouClient} realmData={realmData} />
          <CirclesAndConnections realmData={realmData} />
          <DemoDataHomeAndTheme client={dotYouClient} realmData={realmData} />
          <DemoDataBlog client={dotYouClient} realmData={realmData} character={character} />
        </div>
      )}
    </section>
  );
};

export default DemoData;

const DemoDataProfile = ({ client, realmData }: { client: DotYouClient; realmData: RealmData }) => {
  const profileId = BuiltInProfiles.StandardProfileId.toString();

  const {
    fetch: { data: nameDsr, isFetched: isNameFetched },
    save: { mutate: saveName },
  } = useAttribute({
    profileId: profileId,
    attributeId: realmData.name.id,
  });

  const nameAttr = nameDsr?.fileMetadata.appData.content;
  const isNameSet =
    attrHasData(nameAttr) &&
    nameAttr?.data?.[MinimalProfileFields.SurnameId] === realmData.name.last;

  const addName = async () => {
    if (isNameSet) {
      return;
    }

    //set an attribute for the standard profile
    const newNameAttr: NewHomebaseFile<Attribute> = {
      fileId: nameDsr?.fileId || undefined,
      fileMetadata: {
        ...nameDsr?.fileMetadata,
        appData: {
          content: {
            id: realmData.name.id,
            profileId: profileId,
            type: BuiltInAttributes.Name,
            priority: 1000,
            sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
            data: {},
          },
        },
      },
      serverMetadata: { accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous } },
    };

    if (!newNameAttr.fileMetadata.appData.content.data)
      newNameAttr.fileMetadata.appData.content.data = {};
    newNameAttr.fileMetadata.appData.content.data[MinimalProfileFields.GivenNameId] =
      realmData.name.first;
    newNameAttr.fileMetadata.appData.content.data[MinimalProfileFields.SurnameId] =
      realmData.name.last;
    newNameAttr.fileMetadata.appData.content.data[MinimalProfileFields.DisplayName] =
      `${realmData.name.first} ${realmData.name.last}`;

    saveName(newNameAttr);

    return true;
  };

  const {
    fetch: { data: photoDsr, isFetched: isPhotoFetched },
    save: { mutate: savePhoto },
  } = useAttribute({
    profileId: profileId,
    attributeId: realmData.photo?.[0].id,
  });
  const photoAttr = photoDsr?.fileMetadata.appData.content;

  const addPhoto = async () => {
    if (attrHasData(photoAttr)) {
      return;
    }

    const createProfilePhotoAttribute = async (
      id: string,
      media: { id: string; base64: string },
      acl: AccessControlList,
      priority = 2000
    ) => {
      // Look for existing attribute with this id:
      const foundAttribute = await getProfileAttribute(
        client,
        BuiltInProfiles.StandardProfileId.toString(),
        id
      );

      if (attrHasData(foundAttribute)) {
        console.warn('Already found a profile photo attribute with the demo id:', foundAttribute);
        return foundAttribute;
      }

      // Create attribute
      const anonymousPhotoAttribute: NewHomebaseFile<Attribute> = {
        fileId: foundAttribute?.fileId || undefined,
        fileMetadata: {
          ...foundAttribute?.fileMetadata,
          appData: {
            content: {
              id: id,
              profileId: profileId,
              type: BuiltInAttributes.Photo,
              priority: priority,
              sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
              data: {},
            },
          },
        },
        serverMetadata: { accessControlList: acl },
      };

      if (!anonymousPhotoAttribute.fileMetadata.appData.content.data)
        anonymousPhotoAttribute.fileMetadata.appData.content.data = {};
      anonymousPhotoAttribute.fileMetadata.appData.content.data[
        MinimalProfileFields.ProfileImageKey
      ] = new Blob([new Uint8Array(base64ToArrayBuffer(media.base64))], { type: 'image/webp' });

      savePhoto(anonymousPhotoAttribute);
      return true;
    };

    await Promise.all(
      realmData.photo.map(async (photo) => {
        await createProfilePhotoAttribute(photo.id, photo.image, photo.acl, photo.priority);
      })
    );

    return true;
  };

  const {
    fetch: { data: socialDsr, isFetched: isSocialFetched },
    save: { mutate: saveSocial },
  } = useAttribute({
    profileId: profileId,
    attributeId: 'socials' in realmData ? realmData.socials?.[0]?.id : undefined,
  });
  const socialAttr = socialDsr?.fileMetadata.appData.content;

  const addSocials = async () => {
    if (attrHasData(socialAttr)) {
      return;
    }

    const createSocialAttribute = async (
      id: string,
      type: string,
      dataField: string,
      value: string,
      priority: number
    ) => {
      // Search attribute:
      const foundAttribute = await getProfileAttribute(client, profileId, id);

      if (attrHasData(foundAttribute)) {
        console.warn(
          'Already found a profile social attribute (' + type + ') with the demo id:',
          foundAttribute
        );
        return;
      }

      // Create attribute:
      const socialAttribute: NewHomebaseFile<Attribute> = {
        ...foundAttribute,
        fileMetadata: {
          ...foundAttribute?.fileMetadata,
          appData: {
            content: {
              id: id,
              profileId: profileId,
              type: type,
              priority: priority,
              sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
              data: {},
            },
          },
        },
        serverMetadata: {
          accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        },
      };

      if (!socialAttribute.fileMetadata.appData.content.data)
        socialAttribute.fileMetadata.appData.content.data = {};
      socialAttribute.fileMetadata.appData.content.data[dataField] = value;

      saveSocial(socialAttribute);

      return true;
    };

    const networkData = {
      Twitter: {
        attrDef: BuiltInAttributes.TwitterUsername,
        profileField: SocialFields.Twitter,
        priority: 1000,
      },
      Instagram: {
        attrDef: BuiltInAttributes.InstagramUsername,
        profileField: SocialFields.Instagram,
        priority: 2000,
      },
      Facebook: {
        attrDef: BuiltInAttributes.FacebookUsername,
        profileField: SocialFields.Facebook,
        priority: 3000,
      },
      LinkedIn: {
        attrDef: BuiltInAttributes.LinkedinUsername,
        profileField: SocialFields.LinkedIn,
        priority: 4000,
      },
      Tiktok: {
        attrDef: BuiltInAttributes.TiktokUsername,
        profileField: SocialFields.Tiktok,
        priority: 5000,
      },
    };

    type networkDataKey = keyof typeof networkData;

    await Promise.all(
      'socials' in realmData
        ? realmData.socials.map(async (social) => {
            const networkInfo = networkData[social.network as networkDataKey];

            await createSocialAttribute(
              social.id,
              networkInfo.attrDef,
              networkInfo.profileField,
              social.handle,
              networkInfo.priority
            );
          })
        : []
    );

    return true;
  };

  const {
    fetch: { data: bioAttr, isFetched: isBioFetched },
    save: { mutate: saveBio },
  } = useAttribute({
    profileId: profileId,
    attributeId: 'bio' in realmData ? realmData.bio?.[0].id : undefined,
  });

  const addBiography = async () => {
    const createBioAttribute = async (
      id: string,
      title: string,
      body: string,
      priority: number
    ) => {
      const foundAttribute = await getProfileAttribute(client, profileId, id);

      if (foundAttribute) {
        console.warn('Already found a Bio Attribute with the demo id:', foundAttribute);
        return;
      }

      //set an attribute for the standard profile
      const bioAttr: Attribute = {
        id: id,
        profileId: profileId,
        type: BuiltInAttributes.Experience,
        priority: priority,
        sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
        data: {},
      };

      if (!bioAttr.data) bioAttr.data = {};
      bioAttr.data[MinimalProfileFields.ExperienceTitleId] = title;
      bioAttr.data[MinimalProfileFields.ExperienceDecriptionId] = body;

      saveBio({
        fileMetadata: {
          appData: {
            content: bioAttr,
          },
        },
        serverMetadata: {
          accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
        },
      });

      return true;
    };

    await Promise.all(
      'bio' in realmData
        ? realmData.bio.map(async (bio, index) => {
            await createBioAttribute(bio.id, bio.title, bio.body, 5000 + index * 1000);
          })
        : []
    );

    return true;
  };

  const createProfile = async () => {
    await addName();
    await addPhoto();
    await addSocials();
    await addBiography();
  };

  return (
    <div className="mb-5">
      <h1>Profile:</h1>
      <button
        onClick={addName}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          isNameSet ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={isNameSet}
      >
        Add Name
      </button>
      <button
        onClick={addPhoto}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          attrHasData(photoAttr) && isPhotoFetched
            ? 'pointer-events-none bg-gray-300'
            : 'bg-green-500'
        }`}
        disabled={attrHasData(photoAttr) && isPhotoFetched}
      >
        Add Photo
      </button>
      <button
        onClick={addSocials}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          attrHasData(socialAttr) && isSocialFetched
            ? 'pointer-events-none bg-gray-300'
            : 'bg-green-500'
        }`}
        disabled={attrHasData(socialAttr) && isSocialFetched}
      >
        Add Socials
      </button>
      <button
        onClick={addBiography}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          bioAttr && isBioFetched ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={(bioAttr && isBioFetched) || false}
      >
        Add Bio
      </button>

      <button
        onClick={createProfile}
        className={`my-2 block w-1/3 rounded border-0 px-4 py-2 text-white hover:bg-orange-600 focus:outline-none ${
          nameAttr?.data &&
          isNameFetched &&
          photoAttr?.data &&
          isPhotoFetched &&
          socialAttr?.data &&
          isSocialFetched &&
          bioAttr &&
          isBioFetched
            ? 'pointer-events-none bg-gray-300'
            : 'bg-orange-500'
        }`}
        disabled={
          (nameAttr?.data &&
            isNameFetched &&
            photoAttr?.data &&
            isPhotoFetched &&
            socialAttr?.data &&
            isSocialFetched &&
            bioAttr &&
            isBioFetched) ||
          false
        }
      >
        Create Profile All
      </button>
    </div>
  );
};

const DemoDataHomeAndTheme = ({ realmData }: { client: DotYouClient; realmData: RealmData }) => {
  if (!('home' in realmData)) return null;

  const { data: themeDsr } = useHomeAttributes().fetchTheme;
  const themeAttr = themeDsr?.[0]?.fileMetadata.appData.content;
  const hasThemeData =
    themeAttr && themeAttr.data?.[HomePageThemeFields.TagLineId] === realmData.home.tagLine;

  const {
    save: { mutate: saveRoot },
  } = useAttribute({
    attributeId: realmData.home?.id,
    profileId: HomePageConfig.DefaultDriveId,
  });

  const addTheme = async () => {
    if (hasThemeData) return;

    // Create attribute
    const newThemeAttr: Attribute = themeAttr || {
      id: getNewId(),
      profileId: HomePageConfig.DefaultDriveId.toString(),
      type: HomePageAttributes.Theme.toString(),
      priority: 1000,
      sectionId: HomePageConfig.AttributeSectionNotApplicable.toString(),
      data: {},
    };

    if (!newThemeAttr.data) newThemeAttr.data = {};
    newThemeAttr.data[HomePageThemeFields.HeaderImageKey] = new Blob(
      [new Uint8Array(base64ToArrayBuffer(realmData.home.headerImage.base64))],
      { type: 'image/webp' }
    );

    // TODO: Save tag and leadText into status and shortBio attributes
    // StatusAttr.data[HomePageThemeFields.TagLineId] = realmData.home.tagLine;
    // ShortBioAttr.data[HomePageThemeFields.LeadTextId] = realmData.home.lead;

    saveRoot({
      fileMetadata: {
        appData: {
          content: newThemeAttr,
        },
      },
      serverMetadata: {
        accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
      },
    });

    return true;
  };

  return (
    <div className="mb-5">
      <h1>Theme:</h1>
      <button
        onClick={addTheme}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          hasThemeData ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={!!hasThemeData}
      >
        Add Theme
      </button>
    </div>
  );
};

const DemoDataBlog = ({
  client,
  realmData,
}: {
  client: DotYouClient;
  realmData: RealmData;
  character: keyof typeof lotrRealm;
}) => {
  if (!('blog' in realmData)) return null;

  const {
    fetch: { data: channelAttr, isFetched: isChannelFetched },
  } = useChannel({
    channelKey: realmData.blog?.channels?.[0].id,
  });

  const {
    save: { mutate: saveChannel },
  } = useManageChannel();

  const {
    save: { mutateAsync: saveBlog },
  } = useManagePost();

  const addChannels = async () => {
    if (channelAttr) return;

    const addChannel = async (channelId: string, name: string, description: string) => {
      const foundDef = await getChannelDefinition(client, channelId);
      if (foundDef) {
        console.warn('Already found a blog channel definition id:', foundDef);
        return;
      }

      const newChannel: NewHomebaseFile<ChannelDefinition> = {
        fileMetadata: {
          appData: {
            uniqueId: channelId,
            content: {
              name: name,
              slug: slugify(name),
              description: description,
              showOnHomePage: false,
              templateId: undefined,
            },
          },
        },
        serverMetadata: {
          accessControlList: { requiredSecurityGroup: SecurityGroupType.Connected },
        },
      };

      saveChannel(newChannel);

      return true;
    };

    await Promise.all(
      realmData.blog.channels.map(async (channelData) => {
        addChannel(channelData.id, channelData.name, channelData.description);
      })
    );
  };

  const createBlogDetailData = async () => {
    const imageIds = demoImageArray.map((data) => data.id);
    const channelsWhereToCreate = await getChannelDefinitions(client);

    // Random blog post generation:
    await Promise.all(
      channelsWhereToCreate.map(async (channel) => {
        for (let i = 0; i < 10; i++) {
          const randomTitle = `${getFunName()} tales`;
          const randomAbstract = getRandomAbstract();
          const randomImageId = rando(imageIds);

          // Look for an image file with the image id
          const potentialImages = (
            await queryBatch(client, {
              targetDrive: GetTargetDriveFromChannelId(
                channel.fileMetadata.appData.uniqueId as string
              ),
              tagsMatchAtLeastOne: [randomImageId],
            })
          ).searchResults;
          const imageFileId = potentialImages?.length ? potentialImages[0].fileId : undefined;
          const previewThumbnail =
            potentialImages?.length && potentialImages[0].fileMetadata.appData.previewThumbnail;

          const blogContent: Article = {
            id: getNewId(),
            authorOdinId: domain,
            channelId: channel.fileMetadata.appData.uniqueId as string,
            caption: randomTitle,
            slug: slugify(randomTitle),
            primaryMediaFile: imageFileId
              ? { fileId: imageFileId, fileKey: DEFAULT_PAYLOAD_KEY, type: 'image' }
              : undefined,
            type: 'Article',
            readingTimeStats: {
              words: 382,
              minutes: 2,
            },
            abstract: randomAbstract,
            body: randomAbstract + ' and then some', //Note: this can be html
          };

          const blogFile: NewHomebaseFile<PostContent> = {
            fileMetadata: {
              appData: {
                userDate: new Date().getTime(),
                content: blogContent,
                previewThumbnail: previewThumbnail || undefined,
              },
            },
            serverMetadata: channel.serverMetadata || {
              accessControlList: { requiredSecurityGroup: SecurityGroupType.Anonymous },
            },
          };

          await saveBlog({
            postFile: blogFile,
            channelId: channel.fileMetadata.appData.uniqueId as string,
          });
        }
      })
    );
  };

  const createBlogData = async () => {
    // await createBlogMedia();
    await createBlogDetailData();
  };

  return (
    <div className="mb-5">
      <h1>Blog:</h1>
      <button
        onClick={addChannels}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          channelAttr && isChannelFetched ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={(channelAttr && isChannelFetched) || false}
      >
        Create Channels
      </button>
      <button
        onClick={createBlogData}
        className="my-2 block w-1/3 rounded border-0 bg-green-300 px-4 py-2 text-white hover:bg-green-400 focus:outline-none"
      >
        Add blog posts
      </button>
    </div>
  );
};

const CirclesAndConnections = ({ realmData }: { realmData: RealmData }) => {
  if (!('circles' in realmData)) return null;

  const { data: circles, isFetched: isCirclesFetched } = useCircles().fetch;
  const { mutateAsync: createCircle } = useCircle({}).createOrUpdate;
  const hasDemoCircles =
    isCirclesFetched &&
    circles?.some((existingCircle) =>
      realmData.circles.some((newCircle) => newCircle.name === existingCircle.name)
    );

  const createCircles = async () => {
    await Promise.all(
      realmData.circles.map(async (newCircle) => {
        if (circles?.some((existingCircle) => existingCircle.name === newCircle.name)) {
          return;
        }

        return createCircle({
          id: newCircle.id,
          name: newCircle.name,
          description: newCircle.description,
          permissions: {
            keys: [10],
          },
          driveGrants: [
            {
              permissionedDrive: {
                drive: {
                  alias: BuiltInProfiles.StandardProfileId,
                  type: ProfileConfig.ProfileDriveType,
                },
                permission: [DrivePermissionType.Read],
              },
            },
          ],
        });
      })
    );
  };

  return (
    <div className="mb-5">
      <h1>Circles and Connections:</h1>
      <button
        onClick={createCircles}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          hasDemoCircles ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={hasDemoCircles || false}
      >
        Add Circles
      </button>
    </div>
  );
};
