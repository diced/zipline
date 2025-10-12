import { Box } from '@mantine/core';

interface UploadBackgroundProps {
  backgroundStyle: React.CSSProperties;
  isAuthenticated: boolean;
  backgroundType: string;
  backgroundImageUrl?: string;
}

export function UploadBackground({
  backgroundStyle,
  isAuthenticated,
  backgroundType,
  backgroundImageUrl,
}: UploadBackgroundProps) {
  return (
    <>
      {/* Background */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          ...backgroundStyle,
        }}
      />

      {/* Background overlay for blur effect - only for logged in users */}
      {isAuthenticated &&
        backgroundType === 'image' &&
        backgroundImageUrl &&
        backgroundImageUrl.trim() !== '' && (
          <Box
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              zIndex: -1,
            }}
          />
        )}
    </>
  );
}
