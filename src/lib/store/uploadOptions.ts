import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Config } from '../config/validate';

export const defaultUploadOptions: UploadOptionsStore['options'] = {
  deletesAt: 'never',
  format: 'default',
  imageCompressionPercent: null,
  maxViews: null,
  addOriginalName: false,
  overrides_returnDomain: null,
};

export const defaultEphemeralOptions: UploadOptionsStore['ephemeral'] = {
  password: null,
  filename: null,
};

export type UploadOptionsStore = {
  options: {
    deletesAt: string | 'never';
    format: Config['files']['defaultFormat'] | 'default';
    imageCompressionPercent: number | null;
    maxViews: number | null;
    addOriginalName: boolean | null;
    overrides_returnDomain: string | null;
  };

  ephemeral: {
    password: string | null;
    filename: string | null;
  };

  setOption: <K extends keyof UploadOptionsStore['options']>(
    key: K,
    value: UploadOptionsStore['options'][K],
  ) => void;

  setEphemeral: <K extends keyof UploadOptionsStore['ephemeral']>(
    key: K,
    value: UploadOptionsStore['ephemeral'][K],
  ) => void;

  clearEphemeral: () => void;
  clearOptions: () => void;

  changes: () => number;
};

export const useUploadOptionsStore = create<UploadOptionsStore>()(
  persist(
    (set, get) => ({
      options: defaultUploadOptions,
      ephemeral: defaultEphemeralOptions,

      setOption: (key, value) =>
        set((state) => ({
          ...state,
          options: {
            ...state.options,
            [key]: value,
          },
        })),

      setEphemeral: (key, value) =>
        set((state) => ({
          ...state,
          ephemeral: {
            ...state.ephemeral,
            [key]: value,
          },
        })),

      clearEphemeral: () =>
        set((state) => ({
          ...state,
          ephemeral: defaultEphemeralOptions,
        })),

      clearOptions: () =>
        set((state) => ({
          ...state,
          options: defaultUploadOptions,
        })),

      changes: () => {
        const { options, ephemeral } = get();
        return (
          // @ts-ignore
          Object.keys(options).filter((v) => options[v] !== defaultUploadOptions[v]).length +
          Object.values(ephemeral).filter((v) => v !== null).length
        );
      },
    }),
    {
      name: 'zipline-upload-options',
    },
  ),
);
