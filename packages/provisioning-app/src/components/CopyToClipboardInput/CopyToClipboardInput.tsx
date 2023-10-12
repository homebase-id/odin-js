import Input from '../Form/Input';
import { Clipboard } from '@youfoundation/common-app';

const CopyToClipboardInput = ({ textToCopy }: { textToCopy: string }) => {
  return (
    <div
      className="relative cursor-pointer"
      onClick={() => navigator.clipboard.writeText(textToCopy)}
    >
      <Input readOnly className="pointer-events-none pl-12" value={textToCopy} />
      <div className="absolute bottom-0 left-0 top-0 border-r p-2">
        <Clipboard className="h-6 w-6" />
      </div>
    </div>
  );
};

export default CopyToClipboardInput;
