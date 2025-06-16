import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { Button, TextInput, Stack, Text, Progress } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';
import { IconTrashX, IconAlertTriangle } from '@tabler/icons-react';
import { useState, useEffect, useRef } from 'react';

interface PasswordModalProps {
  password: string;
  confirmText: string;
  onPasswordChange: (value: string) => void;
  onConfirmTextChange: (value: string) => void;
  onProceed: () => void;
}

function PasswordModal({ password, confirmText, onPasswordChange, onConfirmTextChange, onProceed }: PasswordModalProps) {
  const passwordRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Focus the password input after the modal is rendered
    const timer = setTimeout(() => {
      if (passwordRef.current) {
        passwordRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        This will permanently delete ALL uploaded files. Complete the following to confirm:
      </Text>
      <TextInput
        ref={passwordRef}
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        autoComplete="off"
        data-autofocus
      />
      <TextInput
        label="Confirmation"
        placeholder="Type 'confirm delete' to proceed"
        value={confirmText}
        onChange={(e) => onConfirmTextChange(e.target.value)}
        description="You must type exactly: confirm delete"
        autoComplete="off"
      />
      <Button 
        color="red" 
        disabled={!password.trim() || confirmText !== 'confirm delete'}
        onClick={onProceed}
        leftSection={<IconTrashX size="1rem" />}
      >
        Proceed to Countdown
      </Button>
    </Stack>  );
}

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
    <Stack gap="md" style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <IconAlertTriangle size={48} color="red" style={{ marginBottom: '10px' }} />
        <Text size="lg" fw={600} c="red">
          DANGER: This action is irreversible!
        </Text>
        <Text size="sm" c="dimmed" mt="xs">
          All files will be permanently deleted in:
        </Text>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <Text size="xl" fw={700} c="red">
          {countdown} seconds
        </Text>
        <Progress 
          value={(10 - countdown) * 10} 
          color="red" 
          size="lg" 
          mt="xs"
          animated
        />
      </div>

      <Button 
        color="gray" 
        variant="outline" 
        onClick={handleCancel}
        fullWidth
        size="md"
      >
        Cancel Deletion
      </Button>
    </Stack>
  );
}

export default function ResetAllFilesButton() {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');  const openPasswordModal = () => {
    setPassword('');
    setConfirmText('');
    
    modals.open({
      title: 'Reset All Files - Confirmation Required',
      children: (
        <PasswordModal
          password={password}
          confirmText={confirmText}
          onPasswordChange={setPassword}
          onConfirmTextChange={setConfirmText}
          onProceed={() => {
            if (password.trim() && confirmText === 'confirm delete') {
              modals.closeAll();
              openCountdownModal();
            }
          }}
        />
      ),
      closeOnClickOutside: false,
      closeOnEscape: false,
    });
  };

  const openCountdownModal = () => {
    modals.open({
      title: 'Final Warning - Deletion Starting',
      children: (
        <CountdownModal
          onConfirm={executeReset}
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

  const executeReset = async () => {
    modals.closeAll();
    
    showNotification({
      id: 'reset-files',
      title: 'Deleting Files',
      message: 'Please wait while all files are being deleted...',
      loading: true,
      autoClose: false,
    });

    try {
      // Verify password first
      const { error: passwordError } = await fetchApi('/api/user/verify-password', 'POST', {
        password: password,
      });

      if (passwordError) {
        showNotification({
          title: 'Authentication Failed',
          message: 'Invalid password. Operation cancelled.',
          color: 'red',
          icon: <IconAlertTriangle size="1rem" />,
        });
        return;
      }

      // TODO: Implement the actual reset endpoint
      // This would need to be created in the backend
      const { data, error } = await fetchApi('/api/server/reset_all_files', 'DELETE', {
        password: password,
      });

      if (!error && data) {
        showNotification({
          id: 'reset-files',
          title: 'Files Deleted',
          message: 'All files have been successfully deleted.',
          color: 'green',
          icon: <IconTrashX size="1rem" />,
        });
      } else {
        throw new Error(error?.error || 'Unknown error occurred');
      }
    } catch (err) {
      showNotification({
        id: 'reset-files',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to delete files',
        color: 'red',
        icon: <IconAlertTriangle size="1rem" />,
      });    }
    
    setPassword(''); // Clear password from memory
    setConfirmText(''); // Clear confirmation text from memory
  };

  return (
    <Button 
      size="sm" 
      color="red"
      variant="outline"
      leftSection={<IconTrashX size="1rem" />} 
      onClick={openPasswordModal}
    >
      Reset All Files
    </Button>
  );
}
