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
          colors: 'text-[#1e9bf1]',
          text: 'Tweet from x.com',
          rootUrl: 'https://x.com',
        };
      case BlogConfig.FacebookDataType:
        return {
          icon: Facebook,
          colors: 'text-[#0966ff]',
          text: 'Post from Facebook',
          rootUrl: 'https://facebook.com',
        };
      case BlogConfig.InstagramDataType:
        return {
          icon: Instagram,
          colors: 'text-[#0095f6]',
          text: 'Post from Instagram',
          rootUrl: 'https://instagram.com',
        };
      case BlogConfig.YoutubeDataType:
        return {
          icon: Youtube,
          colors: 'text-[#ff0033]',
          text: 'Video from Youtube',
          rootUrl: 'https://youtube.com',
        };
      case BlogConfig.WordpressDataType:
        return {
          icon: Wordpress,
          colors: 'text-[#21759b]',
          text: 'Post from Wordpress',
          rootUrl: 'https://wordpress.com',
        };
    }

    return null;
  })();

  if (!sourceData) return null;

  const { icon, colors, text, rootUrl } = sourceData;

  return (
    <a
      href={postFile.fileMetadata.appData.content.sourceUrl || rootUrl}
      target="_blank"
      rel="noreferrer noopener"
    >
      <div
        className={`px-2 py-2 bg-slate-300 dark:bg-gray-700 flex flex-row items-center gap-1 opacity-80 hover:opacity-100 ${className ?? ''}`}
      >
        {icon({ className: 'w-4 h-4' })}
        <p className={`${colors} font-semibold text-sm`}>{text}</p>
      </div>
    </a>
  );
};
