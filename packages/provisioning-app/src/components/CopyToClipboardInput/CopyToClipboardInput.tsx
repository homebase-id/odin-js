import Input from '../Form/Input';
import Clipboard from '../../components/ui/Icons/Clipboard/Clipboard';

const CopyToClipboardInput = ({ textToCopy }: { textToCopy: string }) => {
  return (
    <div
      className="relative cursor-pointer"
      onClick={() => navigator.clipboard.writeText(textToCopy)}
    >
      <Input
        readOnly
        className="pointer-events-none pl-12"
        value={textToCopy}
      />
      <div className="absolute left-0 top-0 bottom-0 border-r p-2">
        <Clipboard className="h-6 w-6" />
      </div>
    </div>
  );
};

export default CopyToClipboardInput;
