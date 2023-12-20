import { Label, t, Input, Select, useImage } from '@youfoundation/common-app';
import { ImageSelector } from '@youfoundation/common-app';
import { HomePageThemeFields, HomePageConfig, HomePageTheme } from '@youfoundation/js-lib/public';
import { GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import ColorThemeSelector from '../../Form/ColorThemeSelector';
import FaviconSelector from '../../Form/FaviconSelector';
import Order from '../../Form/Order';
import ThemeSelector from '../../Form/ThemeSelector';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { lazy } from 'react';
const RichTextEditor = lazy(() =>
  import('@youfoundation/rich-text-editor').then((m) => ({ default: m.RichTextEditor }))
);

const DEFAULT_TABS_ORDER = ['Posts', 'Links', 'About', 'Connections'];

export const ThemeAttributeEditor = (props: {
  fileId?: string;
  lastModified: number | undefined;
  attribute: AttributeVm;
  onChange: (e: {
    target: { value: unknown; name: string; previewThumbnail?: EmbeddedThumb };
  }) => void;
}) => {
  const { fileId, attribute, onChange } = props;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label htmlFor={HomePageThemeFields.Favicon}>{t('Favicon')}</Label>
        <FaviconSelector
          fileId={fileId}
          name={HomePageThemeFields.Favicon}
          lastModified={props.lastModified}
          defaultValue={attribute.data?.[HomePageThemeFields.Favicon] ?? ''}
          onChange={(e) => onChange({ target: { name: e.target.name, value: e.target.value } })}
          targetDrive={GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId)}
        />
      </div>
      <div>
        <Label htmlFor={HomePageThemeFields.Colors}>{t('Color set')}</Label>
        <ColorThemeSelector
          id={HomePageThemeFields.Colors}
          name={HomePageThemeFields.Colors}
          defaultValue={attribute.data?.[HomePageThemeFields.Colors] ?? ''}
          onChange={onChange}
        />
      </div>
      <div>
        <Label htmlFor={HomePageThemeFields.ThemeId}>{t('Theme')}</Label>
        <ThemeSelector
          id={fileId || attribute.id}
          name={HomePageThemeFields.ThemeId}
          defaultValue={attribute.data?.[HomePageThemeFields.ThemeId] ?? ''}
          onChange={onChange}
        />
      </div>
      <ThemeSpecificFields {...props} />
    </div>
  );
};

const ThemeSpecificFields = ({
  fileId,
  lastModified,
  attribute,
  onChange,
}: {
  fileId?: string;
  lastModified: number | undefined;
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const targetDrive = GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId);
  const themeId = attribute.data?.[HomePageThemeFields.ThemeId];
  const { data: imageData } = useImage({
    imageFileId: fileId,
    imageFileKey: attribute.data?.[HomePageThemeFields.HeaderImageKey],
    imageDrive: targetDrive,
    lastModified,
  }).fetch;

  const dataVal = attribute.data?.[HomePageThemeFields.HeaderImageKey];
  const defaultValue =
    dataVal instanceof Blob ? dataVal : dataVal ? imageData?.url || undefined : undefined;

  const theme =
    themeId === HomePageTheme.VerticalPosts.toString()
      ? 'Vertical'
      : themeId === HomePageTheme.HorizontalPosts.toString()
      ? 'Horizontal'
      : themeId === HomePageTheme.Links.toString()
      ? 'Links'
      : 'Cover';

  switch (theme) {
    case 'Vertical':
    case 'Horizontal':
      return (
        <>
          <div>
            <Label htmlFor="headerImage">{t('Background photo')}</Label>
            <ImageSelector
              id="headerImage"
              name={HomePageThemeFields.HeaderImageKey}
              defaultValue={defaultValue}
              onChange={(e) =>
                onChange({
                  target: {
                    name: e.target.name,
                    value: e.target.value,
                  },
                })
              }
              sizeClass={`${
                !attribute.data?.[HomePageThemeFields.HeaderImageKey]
                  ? 'aspect-[16/9] md:aspect-[5/1]'
                  : ''
              }  w-full object-cover`}
            />
          </div>
          <div>
            <Label htmlFor="tabs">{t('Show tabs')}</Label>
            <Select
              id="tabs"
              name={HomePageThemeFields.Tabs}
              defaultValue={attribute.data?.[HomePageThemeFields.Tabs] ?? 'true'}
              onChange={onChange}
            >
              <option>{t('No')}</option>
              <option value={'true'}>{t('Yes')}</option>
            </Select>
          </div>
          {attribute.data?.[HomePageThemeFields.Tabs] === 'false' ? null : (
            <div>
              <Label htmlFor={HomePageThemeFields.TabsOrder}>{t('Tabs Order')}</Label>
              <Order
                elements={
                  (attribute.data?.[HomePageThemeFields.TabsOrder] &&
                    attribute.data?.[HomePageThemeFields.TabsOrder].length ===
                      DEFAULT_TABS_ORDER.length &&
                    attribute.data[HomePageThemeFields.TabsOrder]) ??
                  DEFAULT_TABS_ORDER
                }
                name={HomePageThemeFields.TabsOrder}
                onChange={onChange}
              />
            </div>
          )}
        </>
      );
    case 'Cover':
      return (
        <>
          <div>
            <Label htmlFor="tagLine">{t('Headline')}</Label>
            <Input
              id="tagLine"
              name="tagLine"
              defaultValue={attribute.data?.['tagLine'] ?? ''}
              onChange={onChange}
            />
          </div>
          <div>
            <Label htmlFor="leadText">{t('About')}</Label>
            <RichTextEditor
              defaultValue={attribute.data?.['leadText']}
              placeholder={t('Start writing...')}
              name="leadText"
              onChange={onChange}
              className="min-h-[20vh]"
            />
          </div>
        </>
      );
    case 'Links':
      return (
        <div>
          <Label htmlFor="headerImage">{t('Background photo')}</Label>
          <ImageSelector
            id="headerImage"
            name={HomePageThemeFields.HeaderImageKey}
            defaultValue={defaultValue}
            onChange={(e) =>
              onChange({
                target: {
                  name: e.target.name,
                  value: e.target.value,
                },
              })
            }
            sizeClass={`${
              !attribute.data?.[HomePageThemeFields.HeaderImageKey]
                ? 'aspect-[16/9] md:aspect-[5/1]'
                : ''
            }  w-full object-cover`}
          />
        </div>
      );
    default:
      return null;
  }
};
