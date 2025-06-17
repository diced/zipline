import { fetchApi } from '@/lib/fetchApi';
import { Button, TextInput, Stack, Text, Progress } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconTrashX, IconAlertTriangle } from '@tabler/icons-react';
import { useState, useEffect, useRef } from 'react';

interface CountdownModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function CountdownModal({ onConfirm, onCancel }: CountdownModalProps) {
  const [countdown, setCountdown] = useState(10);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || countdown === 0) {
      if (countdown === 0) {
        onConfirm();
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isActive, onConfirm]);

  const handleCancel = () => {
    setIsActive(false);
    onCancel();
  };

  return (
    <Stack gap='md' style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <IconAlertTriangle size={48} color='red' style={{ marginBottom: '10px' }} />
        <Text size='lg' fw={600} c='red'>
          DANGER: This action is irreversible!
        </Text>
        <Text size='sm' c='dimmed' mt='xs'>
          All files will be permanently deleted in:
        </Text>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Text size='xl' fw={700} c='red'>
          {countdown} seconds
        </Text>
        <Progress value={(10 - countdown) * 10} color='red' size='lg' mt='xs' animated />
      </div>

      <Button color='gray' variant='outline' onClick={handleCancel} fullWidth size='md'>
        Cancel Deletion
      </Button>
    </Stack>
  );
}

export default function ResetAllFilesButton() {
  const openPasswordModal = () => {
    // Create local state for the modal
    let modalPassword = '';
    let modalConfirmText = '';

    const ModalContent = () => {
      const [password, setPassword] = useState('');
      const [confirmText, setConfirmText] = useState('');
      const [isVerifying, setIsVerifying] = useState(false);
      const [error, setError] = useState('');
      const [isReadOnly, setIsReadOnly] = useState(true);
      const passwordRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        // Focus the password input after the modal is rendered
        const timer = setTimeout(() => {
          if (passwordRef.current) {
            passwordRef.current.focus();
            // Remove readonly after focus to prevent autofill
            setIsReadOnly(false);
          }
        }, 100);

        return () => clearTimeout(timer);
      }, []);

      const handleProceed = async () => {
        setError(''); // Clear any previous errors

        if (password.trim() && confirmText === 'confirm delete') {
          setIsVerifying(true);

          try {
            // Check if user is logged in first
            const { data: userData, error: userError } = await fetchApi('/api/user');

            if (userError || !userData) {
              setError('You must be logged in to perform this action.');
              setIsVerifying(false);
              return;
            }

            // Verify password
            const { data: passwordData, error: passwordError } = await fetchApi(
              '/api/user/verify-password',
              'POST',
              {
                password: password,
              },
            );

            if (passwordError || !passwordData?.valid) {
              setError('Invalid password. Please try again.');
              setIsVerifying(false);
              return;
            }

            // Store password and close modal
            modalPassword = password;
            modalConfirmText = confirmText;

            // Close modal and show countdown
            modals.closeAll();

            showNotification({
              title: 'Password Verified',
              message: 'Password verified successfully. Starting countdown...',
              color: 'green',
              autoClose: 2000,
            });

            // Wait a moment then show countdown
            setTimeout(() => {
              openCountdownModal(modalPassword);
            }, 500);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to verify password');
            setIsVerifying(false);
          }
        } else {
          setError('Please fill in all fields correctly.');
        }
      };

      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isVerifying) {
              handleProceed().catch((err) => console.error('Form submission error:', err));
            }
          }}
        >
          <Stack gap='md'>
            <Text size='sm' c='dimmed'>
              This will permanently delete ALL uploaded files. Complete the following to confirm:
            </Text>

            {/* Hidden fake inputs to confuse autofill */}
            <div style={{ display: 'none' }}>
              <input type='text' name='fake-username' autoComplete='username' />
              <input type='password' name='fake-password' autoComplete='current-password' />
            </div>

            {error && (
              <Text
                size='sm'
                c='red'
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--mantine-color-red-light)',
                  borderRadius: '4px',
                  border: '1px solid var(--mantine-color-red-4)',
                }}
              >
                {error}
              </Text>
            )}

            <TextInput
              ref={passwordRef}
              label='Password'
              type='password'
              placeholder='Enter your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsReadOnly(false)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              spellCheck={false}
              data-form-type='other'
              data-lpignore='true'
              data-1p-ignore='true'
              data-bwignore='true'
              data-dashlane-rid=''
              data-name='not-password'
              name='not-password'
              id={`password-${Math.random().toString(36).substring(7)}`}
              data-autofocus
              required
              disabled={isVerifying}
              readOnly={isReadOnly}
            />
            <TextInput
              label='Confirmation'
              placeholder="Type 'confirm delete' to proceed"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              description='You must type exactly: confirm delete'
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              spellCheck={false}
              data-form-type='other'
              data-lpignore='true'
              data-1p-ignore='true'
              required
              disabled={isVerifying}
            />
            <Button
              type='submit'
              color='red'
              disabled={!password.trim() || confirmText !== 'confirm delete' || isVerifying}
              leftSection={isVerifying ? null : <IconTrashX size='1rem' />}
              loading={isVerifying}
            >
              {isVerifying ? 'Verifying Password...' : 'Verify Password & Continue'}
            </Button>
          </Stack>
        </form>
      );
    };

    modals.open({
      title: 'Reset All Files - Confirmation Required',
      children: <ModalContent />,
      closeOnClickOutside: false,
      closeOnEscape: false,
    });
  };

  const openCountdownModal = (userPassword: string) => {
    modals.open({
      title: 'Final Warning - Deletion Starting',
      children: (
        <CountdownModal
          onConfirm={() => {
            executeReset(userPassword);
          }}
          onCancel={() => {
            modals.closeAll();
            showNotification({
              title: 'Cancelled',
              message: 'File deletion has been cancelled.',
              color: 'blue',
            });
          }}
        />
      ),
      closeOnClickOutside: false,
      closeOnEscape: false,
      withCloseButton: false,
    });
  };

  const executeReset = async (userPassword: string) => {
    modals.closeAll();

    showNotification({
      id: 'reset-files',
      title: 'Deleting Files',
      message: 'Please wait while all files are being deleted...',
      loading: true,
      autoClose: false,
    });

    try {
      // Password was already verified, so we can proceed directly to deletion
      const { data, error } = await fetchApi('/api/server/reset_all_files', 'DELETE', {
        password: userPassword,
      });

      if (error) {
        throw new Error(error?.error || error?.message || 'Failed to delete files');
      }

      if (data) {
        updateNotification({
          id: 'reset-files',
          title: 'Files Deleted',
          message: `All files have been successfully deleted. ${data.deletedCount ? `Deleted ${data.deletedCount} files.` : ''}`,
          color: 'green',
          icon: <IconTrashX size='1rem' />,
          loading: false,
          autoClose: 5000,
        });
      } else {
        throw new Error('No response data received');
      }
    } catch (err) {
      updateNotification({
        id: 'reset-files',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete files',
        color: 'red',
        icon: <IconAlertTriangle size='1rem' />,
        loading: false,
        autoClose: 5000,
      });
    }
  };

  return (
    <Button
      size='sm'
      color='red'
      variant='outline'
      leftSection={<IconTrashX size='1rem' />}
      onClick={openPasswordModal}
    >
      Reset All Files
    </Button>
  );
}
