import { Anchor, Loader, Text } from '@mantine/core';
import { Navbar } from '@/components/Navbar';
import useSWR from 'swr';
import {
  IconLock,
  IconRocket,
  IconEyeOff,
  IconInfinity,
  IconWorld,
  IconBolt,
  IconArrowUpRight,
  IconBrandGithub,
  // IconBrandDiscord,
  IconBrandX,
} from '@tabler/icons-react';
import styles from './home.module.css';

interface LatestFile {
  name: string;
  type: string;
  url: string;
}

const features = [
  { icon: IconLock, label: 'Secure' },
  { icon: IconRocket, label: 'Fast' },
  { icon: IconEyeOff, label: 'Anonymous' },
  { icon: IconInfinity, label: 'Unlimited' },
  { icon: IconWorld, label: 'Global' },
  { icon: IconBolt, label: 'Instant' },
];

export function Component() {
  // Check if user is logged in
  const { data: userData } = useSWR('/api/user', {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  // Fetch latest public file
  const { data: latestFile, error: latestFileError } = useSWR<LatestFile | null>('/api/files/latest', {
    revalidateOnFocus: false,
  });

  const isLoggedIn = !!userData?.user;
  const isLoadingLatest = !latestFile && !latestFileError;

  const isImage = latestFile?.type?.startsWith('image/');
  const isVideo = latestFile?.type?.startsWith('video/');

  return (
    <div className={styles.container}>
      {/* Ambient Background */}
      <div className={`${styles.bgGlow} ${styles.bgGlow1}`} />
      <div className={`${styles.bgGlow} ${styles.bgGlow2}`} />

      {/* Navigation */}
      <Navbar isLoggedIn={isLoggedIn} />

      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroText}>
          <h1>Share Limitless Media.</h1>
          <p>Secure, fast, and anonymous file hosting for cool people.</p>
        </div>

        {/* Features Grid */}
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureItem}>
              <feature.icon />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest File Card */}
      <div className={styles.latestCard}>
        <div className={styles.cardHeader}>
          <span className={styles.cardLabel}>Fresh Drop</span>
          <span className={styles.cardTag}>Latest Upload</span>
        </div>

        <div className={styles.cardContent}>
          {isLoadingLatest ? (
            <div className={styles.loadingState}>
              <Loader size='md' type='dots' />
            </div>
          ) : latestFileError || !latestFile ? (
            <div className={styles.errorState}>
              <Text c='dimmed'>No public uploads yet.</Text>
            </div>
          ) : (
            <>
              <div className={styles.previewBox}>
                {isImage ? (
                  <img src={`/raw/${latestFile.name}`} alt={latestFile.name} className={styles.previewImg} />
                ) : isVideo ? (
                  <video src={`/raw/${latestFile.name}`} controls className={styles.previewVideo}>
                    <track kind='captions' />
                  </video>
                ) : (
                  <div className={styles.fileFallback}>📄</div>
                )}
              </div>
              <div className={styles.fileInfo}>
                <h3>{latestFile.name}</h3>
                <Anchor href={`/view/${latestFile.name}`} target='_blank' className={styles.viewBtn}>
                  View File
                  <IconArrowUpRight />
                </Anchor>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <Anchor
              href='https://github.com/devmirkoo/Flux'
              target='_blank'
              className={styles.footerLink}
              aria-label='GitHub'
            >
              <IconBrandGithub />
            </Anchor>
            {/* <Anchor
              href='https://discord.gg/zipline'
              target='_blank'
              className={styles.footerLink}
              aria-label='Discord'
            >
              <IconBrandDiscord />
            </Anchor> */}
            <Anchor
              href='https://x.com/devmirkoo'
              target='_blank'
              className={styles.footerLink}
              aria-label='X (Twitter)'
            >
              <IconBrandX />
            </Anchor>
          </div>
          <Text size='sm' c='dimmed' className={styles.footerCredit}>
            Made with ❤️ with{' '}
            <Anchor href='https://zipline.diced.sh' target='_blank' inherit>
              Zipline
            </Anchor>
          </Text>
        </div>
      </footer>
    </div>
  );
}

Component.displayName = 'Home';
