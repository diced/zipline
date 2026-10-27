import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type { Config } from '@/lib/config/validate';
import { defaultDiscordComponentEmbed, type DiscordComponentEmbed } from '@/lib/discordComponentEmbed';

const defaultUploadDiscordComponentEmbed = (): DiscordComponentEmbed => {
  const base = defaultDiscordComponentEmbed();
  return {
    ...base,
    enabled: true,
    components: [
      ...base.components,
      { type: 12, items: [{ url: '{link.raw}', description: '{file.name}' }] },
    ],
  };
};

export const defaultUploadOptions: UploadOptionsStore['options'] = {
  deletesAt: 'default',
  format: 'default',
  imageCompressionPercent: null,
  imageCompressionFormat: 'default',
  maxViews: null,
  addOriginalName: false,
  extensionless: false,
  overrides_returnDomain: null,
  discordPreviewMode: 'default',
  discordComponentEmbed: defaultUploadDiscordComponentEmbed(),
};

export const defaultEphemeralOptions: UploadOptionsStore['ephemeral'] = {
  password: null,
  filename: null,
  folderId: null,
};

export type UploadOptionsStore = {
  options: {
    deletesAt: string | 'never';
    format: Config['files']['defaultFormat'] | 'default';
    imageCompressionPercent: number | null;
    imageCompressionFormat: Config['files']['defaultCompressionFormat'] | 'default';
    maxViews: number | null;
    addOriginalName: boolean | null;
    extensionless: boolean | null;
    overrides_returnDomain: string | null;
    discordPreviewMode: 'default' | 'components' | 'none';
    discordComponentEmbed: DiscordComponentEmbed;
  };

  ephemeral: {
    password: string | null;
    filename: string | null;
    folderId: string | null;
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
  subscribeWithSelector(
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
            Object.keys(options).filter(
              (v) =>
                v !== 'discordComponentEmbed' &&
                options[v as keyof typeof options] !== defaultUploadOptions[v as keyof typeof options],
            ).length + Object.values(ephemeral).filter((v) => v !== null).length
          );
        },
      }),
      {
        name: 'zipline-upload-options',
        merge: (persistedState: any, currentState) => {
          return {
            ...currentState,
            ...persistedState,
            options: {
              ...currentState.options,
              ...persistedState?.options,
            },
            ephemeral: {
              ...currentState.ephemeral,
              ...persistedState?.ephemeral,
            },
          };
        },
      },
    ),
  ),
);
