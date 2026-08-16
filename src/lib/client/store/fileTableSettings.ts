import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Field =
  | 'name'
  | 'originalName'
  | 'tags'
  | 'type'
  | 'size'
  | 'createdAt'
  | 'favorite'
  | 'views'
  | 'anonymous';

const FIELDS: {
  property: Field;
  visible: boolean;
  title: string;
}[] = [
  { property: 'name', visible: true, title: 'Name' },
  { property: 'originalName', visible: false, title: 'Original Name' },
  { property: 'tags', visible: true, title: 'Tags' },
  { property: 'type', visible: true, title: 'Type' },
  { property: 'size', visible: true, title: 'Size' },
  { property: 'createdAt', visible: true, title: 'Created At' },
  { property: 'favorite', visible: true, title: 'Favorite' },
  { property: 'views', visible: true, title: 'Views' },
  { property: 'anonymous', visible: false, title: 'Anonymous?' },
];

export const defaultFields: FieldSettings[] = FIELDS.map(({ property, visible }) => ({
  field: property,
  visible,
}));

export const NAMES: Record<Field, string> = Object.fromEntries(
  FIELDS.map(({ property, title }) => [property, title]),
) as Record<Field, string>;

export type FieldSettings = {
  field: Field;
  visible: boolean;
};

export type FileTableSettings = {
  fields: FieldSettings[];

  setVisible: (field: FieldSettings['field'], visible: boolean) => void;
  setIndex: (field: FieldSettings['field'], index: number) => void;
  reset: () => void;
};

export const useFileTableSettingsStore = create<FileTableSettings>()(
  persist(
    (set) => ({
      fields: defaultFields,

      setVisible: (field, visible) =>
        set((state) => ({
          fields: state.fields.map((f) => (f.field === field ? { ...f, visible } : f)),
        })),

      setIndex: (field, index) =>
        set((state) => {
          const currentIndex = state.fields.findIndex((f) => f.field === field);
          if (currentIndex === -1 || index < 0 || index >= state.fields.length) return state;

          const newFields = [...state.fields];
          const [movedField] = newFields.splice(currentIndex, 1);
          newFields.splice(index, 0, movedField);

          return { fields: newFields };
        }),

      reset: () => set({ fields: defaultFields }),
    }),
    {
      name: 'zipline-file-table-settings',
      merge: (persistedState: any, currentState) => {
        const fields = Object.keys(NAMES);
        const stored = persistedState.fields?.map((item: any) => item.field) || [];

        const needsUpdate =
          fields.length !== stored.length || !fields.every((field) => stored.includes(field));

        if (needsUpdate) {
          return {
            ...currentState,
            ...persistedState,
            fields: currentState.fields,
          };
        }

        return { ...currentState, ...persistedState };
      },
    },
  ),
);
