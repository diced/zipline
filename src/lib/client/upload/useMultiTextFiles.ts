import useObjectState from '@/lib/client/hooks/useObjectState';

export type MultiTextFileState = {
  files: {
    text: string;
    lang: string;
    name: string;
  }[];
  selected: number;
};

export const initialState: MultiTextFileState['files'] = [
  {
    text: '',
    lang: 'txt',
    name: 'snippet.txt',
  },
];

export default function useMultiTextFiles(): [
  MultiTextFileState['files'],
  number,
  {
    setFile: (index: number, key: string, value: any) => void;
    addFile: (index: number) => void;
    removeFile: (index: number | true) => void;
    setSelected: (index: number) => void;
  },
] {
  const [state, setState] = useObjectState<MultiTextFileState>({
    files: initialState,
    selected: 0,
  });

  const setFile = (index: number, key: string, value: any) => {
    setState(
      'files',
      state.files.map((file, i) => (i === index ? { ...file, [key]: value } : file)),
    );
  };

  const addFile = (index: number) => {
    const newFile: MultiTextFileState['files'][number] = {
      text: '',
      lang: 'txt',
      name: 'snippet.txt',
    };

    const newFiles = [...state.files];
    newFiles.splice(index + 1, 0, newFile);

    setState('files', newFiles);
    setState('selected', index + 1);
  };

  const removeFile = (index: number | true) => {
    if (index === true) {
      setState({
        files: initialState,
        selected: 0,
      });

      return;
    }

    if (state.files.length === 1) {
      setState('files', [
        {
          text: '',
          lang: 'txt',
          name: 'snippet.txt',
        },
      ]);
      setState('selected', 0);

      return;
    }

    const newFiles = state.files.filter((_, i) => i !== index);
    setState('files', newFiles);

    if (state.selected >= index) {
      setState('selected', Math.max(0, state.selected - 1));
    }
  };

  const setSelected = (index: number) => {
    setState('selected', index);
  };

  return [state.files, state.selected, { setFile, addFile, removeFile, setSelected }];
}
