import { useEffect, useState } from 'react';
import { Menu, Button, Text, Box } from '@mantine/core';

export function BackdropFilterDebug() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    // Check backdrop-filter support
    const testElement = document.createElement('div');
    testElement.style.backdropFilter = 'blur(1px)';
    const supported = testElement.style.backdropFilter !== '';
    setIsSupported(supported);
    setUserAgent(navigator.userAgent);

    // Additional checks
    const supportsWebkit = CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
    const supportsStandard = CSS.supports('backdrop-filter', 'blur(1px)');
    
    console.log('Backdrop-filter support check:');
    console.log('Standard backdrop-filter:', supportsStandard);
    console.log('Webkit backdrop-filter:', supportsWebkit);
    console.log('Style test:', supported);
    console.log('User Agent:', navigator.userAgent);
  }, []);

  return (
    <Box p="md" style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: isSupported ? 'green' : 'red', 
      color: 'white',
      padding: '10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 10000,
      maxWidth: '300px'
    }}>
      <Text size="xs">
        Backdrop-filter: {isSupported === null ? 'Testing...' : isSupported ? 'Supported' : 'NOT Supported'}
      </Text>
      <Text size="xs" style={{ opacity: 0.8 }}>
        Browser: {userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Unknown'}
      </Text>
      
      <Menu>
        <Menu.Target>
          <Button size="xs" mt="xs" style={{
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            background: 'rgba(255, 255, 255, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            willChange: 'backdrop-filter',
            isolation: 'isolate'
          }}>
            Test Menu
          </Button>
        </Menu.Target>        <Menu.Dropdown style={{
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          background: 'rgba(255, 255, 255, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          borderRadius: '8px'
        }}>
          <Menu.Item>Test Item 1</Menu.Item>
          <Menu.Item>Test Item 2</Menu.Item>
          <Menu.Item>Test Item 3</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
}
