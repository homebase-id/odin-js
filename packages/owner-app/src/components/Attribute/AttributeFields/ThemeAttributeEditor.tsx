import { Label, t, Input, Textarea, Select } from '@youfoundation/common-app';
import ImageSelector from '@youfoundation/common-app/src/form/image/ImageSelector';
import { HomePageThemeFields, HomePageConfig, HomePageTheme } from '@youfoundation/js-lib/public';
import { GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import ColorThemeSelector from '../../Form/ColorThemeSelector';
import FaviconSelector from '../../Form/FaviconSelector';
import Order from '../../Form/Order';
import ThemeSelector from '../../Form/ThemeSelector';
import { ThumbnailInstruction } from '@youfoundation/js-lib/core';

const headerInstructionThumbSizes: ThumbnailInstruction[] = [
  { quality: 85, width: 600, height: 600 },
  { quality: 75, width: 1600, height: 1600 },
  { quality: 75, width: 2600, height: 2600 },
];

const DEFAULT_TABS_ORDER = ['Posts', 'Links', 'About', 'Connections'];

export const ThemeAttributeEditor = (props: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const { attribute, onChange } = props;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label htmlFor={HomePageThemeFields.Favicon}>{t('Favicon')}</Label>
        <FaviconSelector
          name={HomePageThemeFields.Favicon}
          defaultValue={attribute.data?.[HomePageThemeFields.Favicon] ?? ''}
          acl={attribute.acl}
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
          id={attribute.fileId || attribute.id}
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
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const themeId = attribute.data?.[HomePageThemeFields.ThemeId];

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
              name={HomePageThemeFields.HeaderImageId}
              defaultValue={attribute.data?.[HomePageThemeFields.HeaderImageId] ?? ''}
              onChange={(e) =>
                onChange({ target: { name: e.target.name, value: e.target.value?.fileId } })
              }
              acl={attribute.acl}
              targetDrive={GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId)}
              sizeClass={`${
                !attribute.data?.[HomePageThemeFields.HeaderImageId]
                  ? 'aspect-[16/9] md:aspect-[5/1]'
                  : ''
              }  w-full object-cover`}
              thumbInstructions={headerInstructionThumbSizes}
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
            <Textarea
              id="leadText"
              name="leadText"
              defaultValue={attribute.data?.['leadText'] ?? ''}
              onChange={onChange}
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
            name={HomePageThemeFields.HeaderImageId}
            defaultValue={attribute.data?.[HomePageThemeFields.HeaderImageId] ?? ''}
            onChange={(e) =>
              onChange({ target: { name: e.target.name, value: e.target.value?.fileId } })
            }
            acl={attribute.acl}
            targetDrive={GetTargetDriveFromProfileId(HomePageConfig.DefaultDriveId)}
            sizeClass={`${
              !attribute.data?.[HomePageThemeFields.HeaderImageId]
                ? 'aspect-[16/9] md:aspect-[5/1]'
                : ''
            }  w-full object-cover`}
            thumbInstructions={headerInstructionThumbSizes}
          />
        </div>
      );
    default:
      return null;
  }
};
