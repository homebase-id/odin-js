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
          { key: '0', text: 'Aayla Secura' },
          { key: '1', text: 'Adi Gallia' },
          { key: '2', text: 'Frodo Baggins' },
        ]}
      />
    </>
  );
}

export default App;
