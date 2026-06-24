import { ContextModalProps, ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { Outlet } from 'react-router-dom';
import { SWRConfig } from 'swr';
import ThemeProvider from '@/components/ThemeProvider';
import { type ZiplineTheme } from '@/lib/theme';
import { type Config } from '@/lib/config/validate';
import { Button, Text } from '@mantine/core';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';

const AlertModal = ({ context, id, innerProps }: ContextModalProps<{ modalBody: string }>) => (
  <>
    <Text size='sm'>{innerProps.modalBody}</Text>

    <Button fullWidth mt='md' onClick={() => context.closeModal(id)}>
      OK
    </Button>
  </>
);

const contextModals = {
  alert: AlertModal,
};

declare module '@mantine/modals' {
  export interface MantineModalsOverride {
    modals: typeof contextModals;
  }
}

export default function Root({
  themes,
  defaultTheme,
}: {
  themes?: ZiplineTheme[];
  defaultTheme?: Config['website']['theme'];
}) {
  return (
    <SWRConfig
      value={{
        fetcher: async (url: RequestInfo | URL) => {
          const res = await fetch(url);

          if (!res.ok) {
            const json = await res.json();

            throw new Error(json.message);
          }

          return res.json();
        },
      }}
    >
      <ThemeProvider ssrThemes={themes} ssrDefaultTheme={defaultTheme}>
        <ModalsProvider
          modalProps={{
            overlayProps: {
              blur: 6,
            },
            centered: true,
          }}
          modals={contextModals}
        >
          <Notifications position='top-center' zIndex={10000000} />

          <NuqsAdapter>
            <Outlet />
          </NuqsAdapter>
        </ModalsProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
