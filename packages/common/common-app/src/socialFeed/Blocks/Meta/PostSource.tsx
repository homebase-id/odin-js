import { HomebaseFile } from '@homebase-id/js-lib/core';
import { BlogConfig, PostContent } from '@homebase-id/js-lib/public';
import { Facebook, Instagram, Twitter, Youtube, Wordpress } from '../../../ui/Icons';

export const PostSource = ({
  postFile,
  className,
}: {
  postFile: HomebaseFile<PostContent> | undefined;
  className?: string;
}) => {
  //   if (!postFile?.fileMetadata?.appData?.dataType) return null;
  if (!postFile) return null;

  const sourceData = (() => {
    switch (postFile.fileMetadata.appData?.dataType) {
      case BlogConfig.XDataType:
        return {
          icon: Twitter,
          iconColors: 'text-black dark:text-white',
          text: 'Tweet from X',
          rootUrl: 'https://x.com',
        };
      case BlogConfig.FacebookDataType:
        return {
          icon: Facebook,
          iconColors: 'text-[#1877f2]',
          text: 'Post from Facebook',
          rootUrl: 'https://facebook.com',
        };
      case BlogConfig.InstagramDataType:
        return {
          icon: Instagram,
          iconColors: 'text-[#E4405F]',
          text: 'Post from Instagram',
          rootUrl: 'https://instagram.com',
        };
      case BlogConfig.YoutubeDataType:
        return {
          icon: Youtube,
          iconColors: 'text-[#FF0000]',
          text: 'Video from YouTube',
          rootUrl: 'https://youtube.com',
        };
      case BlogConfig.WordpressDataType:
        return {
          icon: Wordpress,
          iconColors: 'text-[#21759B]',
          text: 'Post from WordPress',
          rootUrl: 'https://wordpress.com',
        };
    }

    return null;
  })();

  if (!sourceData) return null;

  const { icon, iconColors, text, rootUrl } = sourceData;

  return (
    <a
      href={postFile.fileMetadata.appData.content.sourceUrl || rootUrl}
      target="_blank"
      rel="noreferrer noopener"
    >
      <div
        className={`px-2 py-2 bg-slate-300 dark:bg-gray-700 flex flex-row items-center gap-1 opacity-80 hover:opacity-100 ${className ?? ''}`}
      >
        {icon({ className: `w-4 h-4 ${iconColors}` })}
        <span className="font-medium text-sm">{text}</span>
      </div>
    </a>
  );
};
