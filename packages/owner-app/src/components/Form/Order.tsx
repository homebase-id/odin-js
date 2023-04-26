import { useState } from 'react';
import ActionButton from '../ui/Buttons/ActionButton';
import { moveElementInArray } from '../../templates/DemoData/helpers';

const Order = ({
  elements,
  onChange,
  name,
}: {
  elements: string[];
  onChange: (e: { target: { value: string[]; name: string } }) => void;
  name: string;
}) => {
  const [newElements, setNewElements] = useState<string[]>([...elements]);

  const reorder = (index, dir: -1 | 1) => {
    const updated = moveElementInArray([...newElements], index, index + dir) as string[];

    setNewElements(updated);
    onChange({ target: { name: name, value: updated } });
  };

  return (
    <ol>
      {newElements.map((el, index) => (
        <li
          className="my-2 flex flex-row rounded-sm border border-slate-200 bg-white px-2 py-1 dark:border-slate-800 dark:bg-gray-900"
          key={el}
        >
          <ActionButton
            className="m-0 px-1"
            icon="up"
            type="mute"
            onClick={() => reorder(index, -1)}
          />
          <ActionButton
            className="mr-1 px-1"
            icon="down"
            type="mute"
            onClick={() => reorder(index, 1)}
          />{' '}
          <span className="my-auto">{el}</span>
        </li>
      ))}
    </ol>
  );
};

export default Order;
