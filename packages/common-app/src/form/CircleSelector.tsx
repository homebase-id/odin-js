import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { useEffect, useState } from 'react';
import { CirclePermissionView } from '../permissions/CirclePermissionView/CirclePermissionView';
import { useCircles } from '../hooks/circles/useCircles';
import { t } from '../helpers/i18n/dictionary';
import { CheckboxToggle } from './CheckboxToggle';

export const CircleSelector = ({
  defaultValue,
  onChange,
  name,
  excludeSystemCircles = false,
}: {
  defaultValue: string[];
  onChange: (e: { target: { name: string; value: string[] } }) => void;
  name?: string;
  excludeSystemCircles?: boolean;
}) => {
  const {
    fetch: { data: circles, isLoading: isCirclesLoading },
  } = useCircles(excludeSystemCircles);
  const [selection, setSelection] = useState<string[]>([...(defaultValue ?? [])]);

  useEffect(() => {
    onChange({ target: { name: name || '', value: [...selection] } });
  }, [selection]);

  useEffect(() => {
    if (selection?.length && defaultValue?.length === 0) {
      setSelection([]);
    }
  }, [defaultValue]);

  return (
    <>
      {!circles?.length && !isCirclesLoading && (
        <p
          className="rounded-lg border bg-white px-4 py-4 dark:border-slate-800
        dark:bg-black"
        >
          {t('No circles found on your identity')}
        </p>
      )}
      <div className="-mb-2">
        {circles?.map((circle, index) => {
          const isChecked = selection.some((circleGrant) =>
            stringGuidsEqual(circleGrant, circle.id || '')
          );
          const clickHandler = () => {
            if (!circle.id) {
              return;
            }
            const clickedCircleId = circle.id;

            if (!selection.some((circleGrant) => stringGuidsEqual(circleGrant, clickedCircleId))) {
              setSelection([...selection, clickedCircleId]);
            } else {
              setSelection(
                selection.filter((circleId) => !stringGuidsEqual(circleId, clickedCircleId))
              );
            }
          };

          return (
            <div
              className={`my-2 flex w-full cursor-pointer select-none flex-row rounded-lg border px-4 py-3 dark:border-slate-800 ${
                isChecked ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-black'
              }`}
              key={circle.id}
              onClick={clickHandler}
            >
              <CirclePermissionView
                circleDef={circle}
                key={circle.id ?? index}
                isChecked={isChecked}
                onClick={clickHandler}
                hideMembers={true}
              />
              <label className="sr-only" htmlFor={circle.id}>
                {circle.name}
              </label>
              <CheckboxToggle
                id={circle.id}
                checked={isChecked}
                className="pointer-events-none my-auto ml-auto"
                readOnly={true}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};
