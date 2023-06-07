import { toGuidId } from '@youfoundation/js-lib/helpers';
import {
  headerImages,
  frodoProfilePictures,
  samProfilePictures,
  merryProfilePictures,
  pippinProfilePictures,
} from './DemoImages';
import { SecurityGroupType } from '@youfoundation/js-lib/core';

export const lotrRealm = {
  'frodo.dotyou.cloud': {
    name: {
      id: toGuidId('default_name_attribute'),
      first: 'Frodo',
      last: 'Underhill',
    },
    photo: [
      {
        id: toGuidId('default_photo_attribute'),
        image: frodoProfilePictures[0],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Anonymous,
          circleIdList: undefined,
          odinIdList: undefined,
        },
        priority: 4000,
      },
      {
        id: toGuidId('frodo-showing-face'),
        image: frodoProfilePictures[1],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Authenticated,
          circleIdList: undefined,
          odinIdList: undefined,
        },
        priority: 3000,
      },
      {
        id: toGuidId('frodo-smoking-photo'),
        image: frodoProfilePictures[2],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Connected,
          circleIdList: undefined,
          odinIdList: undefined,
        },
        priority: 2000,
      },
      {
        id: toGuidId('frodo-with-ring'),
        image: frodoProfilePictures[3],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Connected,
          circleIdList: [toGuidId('the-fellowship')],
          odinIdList: undefined,
        },
        priority: 1000,
      },
    ],
    socials: [
      {
        id: toGuidId('default_twitter_attribute'),
        network: 'Twitter',
        handle: '@frodobaggings',
      },
      {
        id: toGuidId('default_instagram_attribute'),
        network: 'Instagram',
        handle: '@frodobaggings',
      },
      {
        id: toGuidId('default_facebook_attribute'),
        network: 'Facebook',
        handle: 'frodo.baggings',
      },
      {
        id: toGuidId('default_linkedin_attribute'),
        network: 'LinkedIn',
        handle: 'frodobaggings',
      },
      {
        id: toGuidId('default_tiktok_attribute'),
        network: 'Tiktok',
        handle: 'frodobaggings',
      },
    ],
    bio: [
      {
        id: 'a5f15e5a-86b9-4479-88e9-ddf85879da16',
        title: 'Profile & Experience',
        body: 'Proven team player who has successfully delivered a significant project to save Middle-Earth. Collaborated across a multi-cultural team of Elves, Men, and Dwarves to destroy the One Ring, thus ending the threat posed by the dark lord Sauron. Open for wedding ring bearing',
      },
      {
        id: '9db04b15-a3b4-4554-9b11-62b16e84a3bc',
        title: 'Education',
        body: 'Homeschooled',
      },
      {
        id: '17a2b09b-2a94-4ac6-b60d-563aeeb1591e',
        title: 'Licenses & Certifications',
        body: 'Languages\nNative English\nIntermediate Elvish\n\nPhysical Skills\nAdept at walking, hiding, running, and occasionally climbing\nHas ridden a Great Eagle',
      },
    ],
    home: {
      id: '456f0e38-6eeb-4347-8cea-ff4854bc8135',
      tagLine: 'Adventurer',
      lead: `Frodo Baggins, son of Drogo Baggins, was a hobbit of the Shire in the late Third Age. He is commonly considered Tolkien's most renowned character for his leading role in the Quest of the Ring, in which he bore the One Ring to Mount Doom, where it was destroyed. He was a Ring-bearer, best friend to his gardener, Samwise Gamgee, and one of three hobbits who sailed from Middle-earth to the Uttermost West at the end of the Third Age.`,
      headerImage: headerImages[0],
    },
    theme: {
      id: '7e9393d4-48b0-4061-8954-a72215ec8357',
      themeData: { themeId: '222', tabs: 'true' },
    },
    blog: {
      channels: [
        {
          id: toGuidId('there_and_back_again'),
          name: 'There and back again',
          description: 'Chronicles my experience with the one ring',
        },
      ],
    },
    circles: [
      {
        id: toGuidId('the-fellowship'),
        name: 'The Fellowship',
        description:
          'The Fellowship of the Ring was formed as a brotherhood among members of the various Free Peoples of Middle-earth. Its purpose was to take the One Ring to Mordor so that it might be cast into the fires of Mount Doom, the mountain in which it was forged, so that it would be destroyed and ultimately eradicate the Dark Lord Sauron.',
      },
      {
        id: toGuidId('hobbits'),
        name: 'Hobbits',
        description: 'Hobbits of the Shire',
      },
      {
        id: toGuidId('Sackville-Baggins'),
        name: 'Sackville-Baggins',
        description: 'Where is my silver spoon?',
      },
      {
        id: toGuidId('the-four-hobbits'),
        name: 'The four hobbits',
        description: 'Frodo Baggins, Samwise Gamgee, Peregrin Took and Meriadoc Brandybuck',
      },
      {
        id: toGuidId('the-mordor-crew'),
        name: 'The Mordor Crew',
        description: 'Precious',
      },
    ],
  },
  'sam.dotyou.cloud': {
    name: {
      id: toGuidId('default_name_attribute'),
      first: 'Samwise',
      last: 'Gamgee',
    },
    photo: [
      {
        id: toGuidId('default_photo_attribute'),
        image: samProfilePictures[0],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Anonymous,
          circleIdList: undefined,
          odinIdList: undefined,
        },
        priority: 1000,
      },
    ],
    socials: [
      {
        id: toGuidId('default_twitter_attribute'),
        network: 'Twitter',
        handle: '@samgamgee',
      },
      {
        id: toGuidId('default_instagram_attribute'),
        network: 'Instagram',
        handle: '@samgamgee',
      },
      {
        id: toGuidId('default_facebook_attribute'),
        network: 'Facebook',
        handle: 'sam.gamgee',
      },
      {
        id: toGuidId('default_linkedin_attribute'),
        network: 'LinkedIn',
        handle: 'samgamgee',
      },
      {
        id: toGuidId('default_tiktok_attribute'),
        network: 'Tiktok',
        handle: 'samgamgee',
      },
    ],
    bio: [
      {
        id: 'a5f15e5a-86b9-4479-88e9-ddf85879da16',
        title: 'Profile & Experience',
        body: 'Proven team player who has successfully delivered a significant project to save Middle-Earth. Collaborated across a multi-cultural team of Elves, Men, and Dwarves to destroy the One Ring, thus ending the threat posed by the dark lord Sauron. Open for gardening opportunities',
      },
      {
        id: '9db04b15-a3b4-4554-9b11-62b16e84a3bc',
        title: 'Education',
        body: 'Gardenschooled',
      },
      {
        id: '17a2b09b-2a94-4ac6-b60d-563aeeb1591e',
        title: 'Licenses & Certifications',
        body: 'Languages\nNative English\nIntermediate Elvish\n\nPhysical Skills\nAdept at walking, hiding, running, and occasionally climbing\nHas ridden a Great Eagle',
      },
    ],
    home: {
      id: '456f0e38-6eeb-4347-8cea-ff4854bc8135',
      tagLine: 'Adventurer',
      lead: `Sam was the youngest son of Hamfast and Bell Gamgee, and had many brothers and sisters. A gardener by trade, Sam seemed to be a simple Hobbit of plain speech. However, his love for Elves, his gift for poetry, and his belief that the world contained greater wonders than most hobbits were aware of (all nurtured by his tutor Bilbo Baggins) set him apart from the beginning. It was Sam who first introduced (in J.R.R. Tolkien's novels) the theme of the Elves sailing from Middle-earth, a subtle foreshadowing of Bilbo and Frodo's final journey across the sea from the Grey Havens. He lived with his father, Hamfast Gamgee, known commonly as "The Gaffer", on Bagshot Row in the Shire, close to Bag End. He had five siblings: Hamson, Halfred, Daisy, May, and Marigold.`,
      headerImage: headerImages[0],
    },
    theme: {
      id: '7e9393d4-48b0-4061-8954-a72215ec8357',
      themeData: { themeId: '222', tabs: 'true' },
    },
    blog: {
      channels: [
        {
          id: toGuidId('there_and_back_again'),
          name: 'There and back again',
          description: 'Chronicles my experience with the one ring',
        },
      ],
    },
    circles: [
      {
        id: toGuidId('the-fellowship'),
        name: 'The Fellowship',
        description: '',
      },
      {
        id: toGuidId('hobbits'),
        name: 'Hobbits',
        description: '',
      },
      {
        id: toGuidId('the-four-hobbits'),
        name: 'The four hobbits',
        description: 'Frodo Baggins, Samwise Gamgee, Peregrin Took and Meriadoc Brandybuck',
      },
      {
        id: toGuidId('the-mordor-crew'),
        name: 'The Mordor Crew',
        description: '',
      },
    ],
  },
  'merry.dotyou.cloud': {
    name: {
      id: toGuidId('default_name_attribute'),
      first: 'Merry',
      last: 'Brandybuck',
    },
    photo: [
      {
        id: toGuidId('default_photo_attribute'),
        image: merryProfilePictures[0],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Anonymous,
        },
        priority: 1000,
      },
    ],
    circles: [
      {
        id: toGuidId('hobbits'),
        name: 'Hobbits',
        description: 'Hobbits of the Shire',
      },
      {
        id: toGuidId('the-four-hobbits'),
        name: 'The four hobbits',
        description: 'Frodo Baggins, Samwise Gamgee, Peregrin Took and Meriadoc Brandybuck',
      },
    ],
  },
  'pippin.dotyou.cloud': {
    name: {
      id: toGuidId('default_name_attribute'),
      first: 'Pippin',
      last: 'Took',
    },
    photo: [
      {
        id: toGuidId('default_photo_attribute'),
        image: pippinProfilePictures[0],
        acl: {
          requiredSecurityGroup: SecurityGroupType.Anonymous,
        },
        priority: 1000,
      },
    ],
  },
};
