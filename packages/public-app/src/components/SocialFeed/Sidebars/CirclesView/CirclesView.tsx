import { t } from '@youfoundation/common-app';
import useCircles from '../../../../hooks/circles/useCircles';
import CirclePermissionView from '../../../PermissionViews/CirclePermissionView/CirclePermissionView';
import { LoadingParagraph } from '@youfoundation/common-app';

const CirclesView = ({ className }: { className?: string }) => {
  const {
    fetch: { data: circles, isLoading: isCirclesLoading },
  } = useCircles();

  if (!isCirclesLoading && !circles?.length) {
    return null;
  }

  return (
    <div className={`block overflow-hidden px-4 py-3 ${className ?? ''}`}>
      <h2 className="mb-1 text-foreground">{t('Circles')}</h2>
      <ul className="text-foreground">
        {isCirclesLoading ? (
          <>
            <LoadingParagraph className="my-1 h-12 w-full" />
            <LoadingParagraph className="my-1 h-12 w-full" />
            <LoadingParagraph className="my-1 h-12 w-full" />
          </>
        ) : null}
        {circles
          ?.filter((circle) => !circle.disabled)
          ?.map((circle) => {
            circle.name;
            return (
              <CirclePermissionView
                key={circle.id}
                hideMembers={true} // Excluding members makes for less queries needed to show the card
                circleDef={circle}
                className="-mx-1 rounded-lg p-1 py-[0.4rem] hover:bg-gray-100 hover:shadow-md dark:hover:bg-gray-800 hover:dark:shadow-slate-600"
              />
            );
          })}
      </ul>
    </div>
  );
};

export default CirclesView;
