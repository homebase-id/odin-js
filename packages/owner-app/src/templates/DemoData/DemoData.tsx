import useAuth from '../../hooks/auth/useAuth';
import {
  ApiType,
  BuiltInAttributes,
  AttributeFile,
  Article,
  BuiltInProfiles,
  ChannelDefinition,
  HomePageAttributes,
  HomePageConfig,
  HomePageFields,
  MinimalProfileFields,
  SecurityGroupType,
  SocialFields,
  TargetDrive,
  DrivePermissions,
  ProfileConfig,
  AccessControlList,
  PostContent,
  PostFile,
  DotYouClient,
  queryBatch,
  uploadImage,
  getAttribute,
  getChannelDefinition,
  getChannelDefinitions,
  GetTargetDriveFromChannelId,
  GetTargetDriveFromProfileId,
  getNewId,
} from '@youfoundation/js-lib';
import { demoImageArray } from './DemoImages';
import {
  attrHasData,
  base64ToArrayBuffer,
  getFunName,
  getRandomAbstract,
  getRandomNumber,
  rando,
} from './helpers';
import { lotrRealm } from './DemoLotr';
import useAttribute from '../../hooks/profiles/useAttribute';
import { useChannel } from '@youfoundation/common-app';
import usePost from '../../hooks/posts/usePost';
import { useCircles } from '@youfoundation/common-app';
import { useCircle } from '@youfoundation/common-app';
import { convertTextToSlug } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import useHomeAttributes from '../../hooks/profiles/useHomeAttributes';

let character = window.location.hostname;

// Replace demo hosts to locals for the lotrRealm
character = character === 'frodobaggins.me' ? 'frodo.dotyou.cloud' : character;
character = character === 'samwisegamgee.me' ? 'sam.dotyou.cloud' : character;

const realmData = lotrRealm[character as keyof typeof lotrRealm];

const DemoData = () => {
  const dotYouClient = useAuth().getDotYouClient();

  return (
    <section>
      <PageMeta title={<>Demo Data Generator: {character}</>} />

      <div className="my-5">
        <DemoDataProfile client={dotYouClient} />
        <CirclesAndConnections />
        <DemoDataHomeAndTheme client={dotYouClient} />
        <DemoDataBlog client={dotYouClient} />
      </div>
    </section>
  );
};

export default DemoData;

const uploadMedia = async (
  client: DotYouClient,
  imageData: { id: string; base64: string },
  targetDrive: TargetDrive,
  tag?: string,
  acl = {
    requiredSecurityGroup: SecurityGroupType.Anonymous,
  }
) => {
  const existingResults = await queryBatch(client, {
    targetDrive: targetDrive,
    clientUniqueIdAtLeastOne: [imageData.id],
  });

  if (existingResults?.searchResults?.length > 0) {
    return existingResults.searchResults[0].fileId;
  }

  const imageArrayBuffer = base64ToArrayBuffer(imageData.base64);

  // Image uploads
  const newFileId = (
    await uploadImage(client, targetDrive, acl, new Uint8Array(imageArrayBuffer), undefined, {
      tag: tag || imageData.id,
      uniqueId: imageData.id,
    })
  )?.fileId;

  return newFileId;
};

const DemoDataProfile = ({ client }: { client: DotYouClient }) => {
  const profileId = BuiltInProfiles.StandardProfileId.toString();

  const {
    fetch: { data: nameAttr, isFetched: isNameFetched },
    save: { mutate: saveName },
  } = useAttribute({
    profileId: profileId,
    attributeId: realmData.name.id,
  });

  const addName = async () => {
    if (attrHasData(nameAttr)) {
      return;
    }

    //set an attribute for the standard profile
    const newNameAttr: AttributeFile = {
      fileId: nameAttr?.fileId || undefined,
      versionTag: nameAttr?.versionTag || undefined,
      id: realmData.name.id,
      profileId: profileId,
      type: BuiltInAttributes.Name,
      priority: 1000,
      sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
      data: {},
      acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
    };

    newNameAttr.data[MinimalProfileFields.GivenNameId] = realmData.name.first;
    newNameAttr.data[MinimalProfileFields.SurnameId] = realmData.name.last;
    newNameAttr.data[
      MinimalProfileFields.DisplayName
    ] = `${realmData.name.first} ${realmData.name.last}`;

    saveName(newNameAttr);

    return true;
  };

  const {
    fetch: { data: photoAttr, isFetched: isPhotoFetched },
    save: { mutate: savePhoto },
  } = useAttribute({
    profileId: profileId,
    attributeId: realmData.photo?.[0].id,
  });

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
      const mediaFileId = await uploadMedia(
        client,
        media,
        GetTargetDriveFromProfileId(profileId),
        undefined,
        acl
      );

      // Look for existing attribute with this id:
      const foundAttribute = await getAttribute(
        client,
        BuiltInProfiles.StandardProfileId.toString(),
        id
      );

      if (attrHasData(foundAttribute)) {
        console.warn('Already found a profile photo attribute with the demo id:', foundAttribute);
        return foundAttribute;
      }

      // Create attribute
      const anonymousPhotoAttribute: AttributeFile = {
        fileId: foundAttribute?.fileId || undefined,
        versionTag: foundAttribute?.versionTag || undefined,
        id: id,
        profileId: profileId,
        type: BuiltInAttributes.Photo,
        priority: priority,
        sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
        data: {},
        acl: acl,
      };

      anonymousPhotoAttribute.data[MinimalProfileFields.ProfileImageId] = mediaFileId?.toString();

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
    fetch: { data: socialAttr, isFetched: isSocialFetched },
    save: { mutate: saveSocial },
  } = useAttribute({
    profileId: profileId,
    attributeId: 'socials' in realmData ? realmData.socials?.[0]?.id : undefined,
  });

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
      const foundAttribute = await getAttribute(client, profileId, id);

      if (attrHasData(foundAttribute)) {
        console.warn(
          'Already found a profile social attribute (' + type + ') with the demo id:',
          foundAttribute
        );
        return;
      }

      // Create attribute:
      const socialAttribute: AttributeFile = {
        fileId: foundAttribute?.fileId || undefined,
        versionTag: foundAttribute?.versionTag || undefined,
        id: id,
        profileId: profileId,
        type: type,
        priority: priority,
        sectionId: BuiltInProfiles.ExternalLinksSectionId.toString(),
        data: {},
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
      };

      socialAttribute.data[dataField] = value;

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
      const foundAttribute = await getAttribute(client, profileId, id);

      if (foundAttribute) {
        console.warn('Already found a Bio Attribute with the demo id:', foundAttribute);
        return;
      }

      //set an attribute for the standard profile
      const bioAttr: AttributeFile = {
        fileId: undefined,
        versionTag: undefined,
        id: id,
        profileId: profileId,
        type: BuiltInAttributes.FullBio,
        priority: priority,
        sectionId: BuiltInProfiles.PersonalInfoSectionId.toString(),
        data: {},
        acl: { requiredSecurityGroup: SecurityGroupType.Anonymous },
      };

      bioAttr.data[MinimalProfileFields.ShortBioId] = title;
      bioAttr.data[MinimalProfileFields.FullBioId] = body;

      saveBio(bioAttr);

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
          attrHasData(nameAttr) && isNameFetched
            ? 'pointer-events-none bg-gray-300'
            : 'bg-green-500'
        }`}
        disabled={attrHasData(nameAttr) && isNameFetched}
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

const DemoDataHomeAndTheme = ({ client }: { client: DotYouClient }) => {
  if (!('home' in realmData)) {
    return null;
  }

  const { data: homeData } = useHomeAttributes().fetchHome;
  const {
    save: { mutate: saveRoot },
  } = useAttribute({
    attributeId: realmData.home?.id,
    profileId: HomePageConfig.DefaultDriveId,
  });

  const addHome = async () => {
    if (homeData?.length) {
      return;
    }

    const securityGroup = SecurityGroupType.Anonymous;

    // Create media
    const mediaFileId = await uploadMedia(
      client,
      realmData.home.headerImage,
      GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId.toString())
    );

    // Create attribute
    const newRootAttr: AttributeFile = {
      fileId: undefined,
      versionTag: undefined,
      id: getNewId(),
      profileId: HomePageConfig.DefaultDriveId.toString(),
      type: HomePageAttributes.HomePage.toString(),
      priority: 1000,
      sectionId: HomePageConfig.AttributeSectionNotApplicable.toString(),
      data: {},
      acl: { requiredSecurityGroup: securityGroup },
    };

    newRootAttr.data[HomePageFields.HeaderImageId] = mediaFileId?.toString();
    newRootAttr.data[HomePageFields.TagLineId] = realmData.home.tagLine;
    newRootAttr.data[HomePageFields.LeadTextId] = realmData.home.lead;

    saveRoot(newRootAttr);

    return true;
  };

  const { data: themeData } = useHomeAttributes().fetchTheme;
  const {
    save: { mutate: saveTheme },
  } = useAttribute({
    attributeId: realmData.theme?.id,
    profileId: HomePageConfig.DefaultDriveId,
  });

  const addTheme = async () => {
    if (themeData?.length) {
      return;
    }

    const securityGroup = SecurityGroupType.Anonymous;

    // Create attribute
    const anonymousHomeAttribute: AttributeFile = {
      fileId: undefined,
      versionTag: undefined,
      id: getNewId(),
      profileId: HomePageConfig.DefaultDriveId.toString(),
      type: HomePageAttributes.Theme.toString(),
      priority: 2000,
      sectionId: HomePageConfig.AttributeSectionNotApplicable.toString(),
      data: realmData.theme.themeData ?? {},
      acl: { requiredSecurityGroup: securityGroup },
    };

    saveTheme(anonymousHomeAttribute);
  };

  const createHomeAndTheme = async () => {
    await addHome();
    await addTheme();
  };

  return (
    <div className="mb-5">
      <h1>Home and theme:</h1>
      <button
        onClick={addHome}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          homeData?.length ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={!!homeData?.length || false}
      >
        Add Home
      </button>
      <button
        onClick={addTheme}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-green-600 focus:outline-none ${
          themeData?.length ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={!!themeData?.length || false}
      >
        Add Theme
      </button>

      <button
        onClick={createHomeAndTheme}
        className={`my-2 block w-1/3 rounded border-0  px-4 py-2 text-white hover:bg-orange-600 focus:outline-none ${
          !!themeData?.length || !!homeData?.length
            ? 'pointer-events-none bg-gray-300'
            : 'bg-orange-500'
        }`}
        disabled={!!themeData?.length || !!homeData?.length || false}
      >
        Create Homepage And Theme
      </button>
    </div>
  );
};

const DemoDataBlog = ({ client }: { client: DotYouClient }) => {
  if (!('blog' in realmData)) return null;

  const {
    fetch: { data: channelAttr, isFetched: isChannelFetched },
    save: { mutate: saveChannel },
  } = useChannel({
    channelId: realmData.blog?.channels?.[0].id,
  });

  const {
    save: { mutateAsync: saveBlog },
  } = usePost();

  const addChannels = async () => {
    if (channelAttr) {
      return;
    }

    const addChannel = async (channelId: string, name: string, description: string) => {
      const foundDef = await getChannelDefinition(client, channelId);
      if (foundDef) {
        console.warn('Already found a blog channel definition id:', foundDef);
        return;
      }

      const newChannel: ChannelDefinition = {
        channelId: channelId,
        name: name,
        slug: convertTextToSlug(name),
        description: description,
        templateId: undefined,
        acl: { requiredSecurityGroup: SecurityGroupType.Connected },
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

  const createBlogMedia = async () => {
    const channelsWhereToCreate = await getChannelDefinitions(client);

    await Promise.all(
      channelsWhereToCreate.map(async (channel) => {
        const channelDrive = GetTargetDriveFromChannelId(channel.channelId);

        for (let i = 0; i < demoImageArray.length; i++) {
          await uploadMedia(client, demoImageArray[i], channelDrive, undefined, {
            requiredSecurityGroup: SecurityGroupType.Anonymous,
          });
        }
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
          const randomDate = new Date();
          // Make random date of somewhere in the last 30 days
          randomDate.setDate(-getRandomNumber(30));

          // Look for an image file with the image id
          const potentialImages = (
            await queryBatch(client, {
              targetDrive: GetTargetDriveFromChannelId(channel.channelId),
              tagsMatchAtLeastOne: [randomImageId],
            })
          ).searchResults;
          const imageFileId = potentialImages?.length ? potentialImages[0].fileId : undefined;
          const previewThumbnail =
            potentialImages?.length && potentialImages[0].fileMetadata.appData.previewThumbnail;

          const blogContent: Article = {
            id: getNewId(),
            channelId: channel.channelId,
            caption: randomTitle,
            slug: convertTextToSlug(randomTitle),
            dateUnixTime: randomDate.getTime(),
            primaryMediaFile: imageFileId ? { fileId: imageFileId, type: 'image' } : undefined,
            type: 'Article',
            readingTimeStats: {
              words: 382,
              minutes: 2,
            },
            abstract: randomAbstract,
            body: randomAbstract + ' and then some', //Note: this can be html
          };

          const blogFile: PostFile<PostContent> = {
            fileId: undefined,
            versionTag: undefined,
            acl: channel.acl
              ? {
                  ...channel.acl,
                }
              : { requiredSecurityGroup: SecurityGroupType.Anonymous },
            content: blogContent,
            previewThumbnail: previewThumbnail || undefined,
          };

          await saveBlog({ blogFile: blogFile, channelId: channel.channelId });
          console.log(blogContent.id);
        }
      })
    );
  };

  const createBlogData = async () => {
    await createBlogMedia();
    await createBlogDetailData();
  };

  return (
    <div className="mb-5">
      <h1>Home and theme:</h1>
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

const CirclesAndConnections = () => {
  if (!('circles' in realmData)) return null;

  const { data: circles, isFetched: isCirclesFetched } = useCircles().fetch;
  const { mutateAsync: createCircle } = useCircle({}).createOrUpdate;

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
                permission: DrivePermissions.Read,
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
          circles?.length && isCirclesFetched ? 'pointer-events-none bg-gray-300' : 'bg-green-500'
        }`}
        disabled={(circles?.length && isCirclesFetched) || false}
      >
        Add Circles
      </button>
    </div>
  );
};
