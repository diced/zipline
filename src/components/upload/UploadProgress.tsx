import { Box, Stack, Group, Title, Badge, Button, Text, Progress } from '@mantine/core';
import { bytes } from '../../lib/bytes';

interface UploadProgressProps {
  uploading: boolean;
  files: File[];
  fileProgress: { [key: string]: number };
  fileUploadSpeed: { [key: string]: number };
  onClear: () => void;
}

export function UploadProgress({
  uploading,
  files,
  fileProgress,
  fileUploadSpeed,
  onClear,
}: UploadProgressProps) {
  const totalSpeed = Object.values(fileUploadSpeed)
    .filter((speed) => speed > 0)
    .reduce((sum, speed) => sum + speed, 0);

  return (
    <Box p='lg' style={{ cursor: 'default' }}>
      <Stack gap='lg'>
        <Group justify='space-between' align='center'>
          <Stack gap='xs'>
            <Group gap='md' align='center'>
              <Title order={4}>{uploading ? '� Uploading Files...' : '✅ Upload Complete!'}</Title>
              {uploading && totalSpeed > 0 && (
                <Badge size='lg' variant='light' color='gray'>
                  ⚡ {bytes(totalSpeed)}/s
                </Badge>
              )}
            </Group>
            {files.length > 0 && (
              <Text size='sm' c='dimmed'>
                {files.length} files • {Object.values(fileProgress).filter((p) => p === 100).length} completed
              </Text>
            )}
          </Stack>
          {!uploading && (
            <Button variant='light' color='gray' size='sm' onClick={onClear}>
              Clear
            </Button>
          )}
        </Group>

        {files.length > 0 ? (
          <Stack gap='md'>
            {files.map((file, index) => {
              const progress = fileProgress[file.name] || 0;
              const isCompleted = progress === 100;

              return (
                <Box
                  key={file.name}
                  p='md'
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Group justify='space-between' mb='xs'>
                    <Text
                      size='sm'
                      fw={500}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      title={file.name}
                    >
                      {isCompleted ? '✅ ' : '📁 '}
                      {file.name}
                    </Text>
                    <Text size='sm' fw={600}>
                      {isCompleted ? 'Done' : `${Math.round(progress)}%`}
                    </Text>
                  </Group>
                  <Progress
                    value={progress}
                    size='lg'
                    radius='xl'
                    color={isCompleted ? 'green' : 'gray'}
                    striped={!isCompleted}
                    animated={!isCompleted}
                  />
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Stack gap='md'>
            {Object.entries(fileProgress).map(([fileName, percent]) => (
              <Box
                key={fileName}
                p='md'
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <Group justify='space-between' mb='xs'>
                  <Text
                    size='sm'
                    fw={500}
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 'calc(100% - 120px)',
                    }}
                    title={fileName}
                  >
                    {percent === 100 ? '✓ ' : '⏳ '}
                    {fileName}
                  </Text>
                  <Text size='sm' fw={600} c={percent === 100 ? 'green' : 'gray'}>
                    {Math.round(percent)}%
                  </Text>
                </Group>
                <Progress
                  value={percent}
                  size='lg'
                  radius='xl'
                  color={percent === 100 ? 'green' : 'gray'}
                  striped={percent < 100}
                  animated={percent < 100}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
