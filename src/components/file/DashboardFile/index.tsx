import type { File } from '@/lib/db/models/file';
import { Card } from '@mantine/core';
import React, { forwardRef } from 'react';
import { IconStar } from '@tabler/icons-react';
import DashboardFileType from '../DashboardFileType';

import styles from './index.module.css';

const starStyle = {
  position: 'absolute' as const,
  top: '8px',
  right: '8px',
  color: '#FFD700',
};

type DashboardFileProps = React.ComponentPropsWithoutRef<'div'> & {
  file: File;
  reduce?: boolean;
  onOpenFile?: (file: File) => void;
};

const DashboardFile = forwardRef<HTMLDivElement, DashboardFileProps>(
  ({ file, reduce, style, className, onOpenFile, ...rest }, ref) => {
    return (
      <div ref={ref} style={style} className={className} {...rest}>
        <Card shadow='md' radius='md' p={0} onClick={() => onOpenFile?.(file)} className={styles.file}>
          {file.favorite && <IconStar style={starStyle} size={20} fill='currentColor' />}
          <DashboardFileType key={file.id} file={file} />
        </Card>
      </div>
    );
  },
);

export default DashboardFile;

DashboardFile.displayName = 'DashboardFile';
