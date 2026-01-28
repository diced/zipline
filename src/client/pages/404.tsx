import { useTitle } from '@/lib/hooks/useTitle';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import ASCIIText from '@/components/ASCIIText';
import styles from './404.module.css';

export default function FourOhFour() {
  useTitle('404');

  return (
    <div className={styles.container}>
      {/* Ambient Background */}
      <div className={`${styles.bgGlow} ${styles.bgGlow1}`} />
      <div className={`${styles.bgGlow} ${styles.bgGlow2}`} />

      {/* ASCII Text Animation */}
      <div className={styles.asciiContainer}>
        <ASCIIText text='404' enableWaves asciiFontSize={8} textFontSize={200} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <p className={styles.subtitle}>Page not found</p>
        <Link to='/' className={styles.button}>
          <IconArrowLeft size='1rem' />
          Go home
        </Link>
      </div>
    </div>
  );
}
