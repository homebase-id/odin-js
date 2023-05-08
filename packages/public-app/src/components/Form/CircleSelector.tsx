import { stringGuidsEqual } from '@youfoundation/js-lib';
import { useEffect, useState } from 'react';
import { t } from '@youfoundation/common-app';
import useCircles from '../../hooks/circles/useCircles';
import CirclePermissionView from '../PermissionViews/CirclePermissionView/CirclePermissionView';
import CheckboxToggle from './CheckboxToggle';

const CircleSelector = ({
  defaultValue,
  onChange,
  name,
}: {
  defaultValue: string[];
  onChange: (e: { target: { name: string; value: string[] } }) => void;
  name?: string;
}) => {
  const { data: circles, isLoading: circlesLoading } = useCircles().fetch;

  const [selection, setSelection] = useState<string[]>([...(defaultValue ?? [])]);

  useEffect(() => {
    onChange({ target: { name: name ?? '', value: [...selection] } });
  }, [selection]);

  useEffect(() => {
    if (selection?.length && defaultValue?.length === 0) {
      setSelection([]);
    }
  }, [defaultValue]);

  return (
    <>
      {!circles?.length && !circlesLoading && <p>{t('No circles found')}</p>}
      <div className="-mb-4">
        {circles?.map((circle, index) => {
          const isChecked = selection.some((circleGrant) =>
            stringGuidsEqual(circleGrant, circle.id ?? '')
          );
          const clickHandler = () => {
            if (!selection.some((circleGrant) => stringGuidsEqual(circleGrant, circle.id ?? ''))) {
              setSelection([...selection, circle.id ?? '']);
            } else {
              setSelection(
                selection.filter((circleId) => !stringGuidsEqual(circleId, circle.id ?? ''))
              );
            }
          };

          return (
            <div
              className={`my-2 flex w-full cursor-pointer select-none flex-row rounded-lg border px-4 py-3 dark:border-slate-800 ${
                isChecked && 'bg-slate-50 dark:bg-slate-700'
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

export default CircleSelector;
