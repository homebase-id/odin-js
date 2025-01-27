import './App.css';
import { RichTextEditor } from '../editor/RichTextEditor';

function App() {
  return (
    <>
      <RichTextEditor
        name="demo"
        onChange={(e) => console.log('new val', e.target.value)}
        placeholder="Write your text here"
        mentionables={[
          { value: 'aayla', label: 'Aayla Secura' },
          { value: 'adi', label: 'Adi Gallia' },
          { value: 'frodo', label: 'Frodo Baggins' },
        ]}
      />
    </>
  );
}

export default App;
