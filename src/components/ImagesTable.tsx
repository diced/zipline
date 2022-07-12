/* eslint-disable react/jsx-key */
// Code taken from https://codesandbox.io/s/eojw8 and is modified a bit (the entire src/components/table directory)
import {
  ActionIcon,
  createStyles,
  Divider,
  Group, Image, Pagination,
  Select,
  Table,
  Text,
  useMantineTheme,
} from '@mantine/core';
import {
  usePagination,
  useTable,
} from 'react-table';
import { CopyIcon, DeleteIcon, EnterIcon } from './icons';

const pageSizeOptions = ['10', '25', '50'];

const useStyles = createStyles((t) => ({
  root: { height: '100%', display: 'block', marginTop: 10 },
  tableContainer: {
    display: 'block',
    overflow: 'auto',
    '& > table': {
      '& > thead': { backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[6] : t.colors.gray[0], zIndex: 1 },
      '& > thead > tr > th': { padding: t.spacing.md },
      '& > tbody > tr > td': { padding: t.spacing.md },
    },
    borderRadius: 6,
  },
  stickHeader: { top: 0, position: 'sticky' },
  disableSortIcon: { color: t.colors.gray[5] },
  sortDirectionIcon: { transition: 'transform 200ms ease' },
}));

export function FilePreview({ url, type }) {
  const Type = props => {
    return {
      'video': <video autoPlay controls {...props} />,
      'image': <Image {...props} />,
      'audio': <audio autoPlay controls {...props} />,
    }[type.split('/')[0]];
  };

  return (
    <Type
      sx={{ maxWidth: '10vw', maxHeight: '100vh' }}
      style={{ maxWidth: '10vw', maxHeight: '100vh' }}
      mr='sm'
      src={url}
      alt={'Unable to preview file'}
    />
  );
}

export default function ImagesTable({
  columns,
  data = [],
  serverSideDataSource = false,
  initialPageSize = 10,
  initialPageIndex = 0,
  pageCount = 0,
  total = 0,
  deleteImage, copyImage, viewImage,
}) {
  const { classes } = useStyles();
  const theme = useMantineTheme();

  const tableOptions = useTable(
    {
      data,
      columns,
      pageCount,
      initialState: { pageSize: initialPageSize, pageIndex: initialPageIndex },
    },
    usePagination
  );

  const {
    getTableProps, getTableBodyProps, headerGroups, rows, prepareRow, page, gotoPage, setPageSize, state: { pageIndex, pageSize },
  } = tableOptions;

  const getPageRecordInfo = () => {
    const firstRowNum = pageIndex * pageSize + 1;
    const totalRows = rows.length;

    const currLastRowNum = (pageIndex + 1) * pageSize;
    let lastRowNum = currLastRowNum < totalRows ? currLastRowNum : totalRows;
    return `${firstRowNum} - ${lastRowNum} of ${totalRows}`;
  };

  const getPageCount = () => Math.ceil(rows.length / pageSize);

  const handlePageChange = (pageNum) => gotoPage(pageNum - 1);

  const renderHeader = () => headerGroups.map(hg => (
    <tr {...hg.getHeaderGroupProps()}>
      {hg.headers.map(column => (
        <th {...column.getHeaderProps()}>
          <Group noWrap position={column.align || 'apart'}>
            <div>{column.render('Header')}</div>
          </Group>
        </th>
      ))}
      <th>Actions</th>
    </tr>
  ));

  const renderRow = rows => rows.map(row => {
    prepareRow(row);
    return (
      <tr {...row.getRowProps()}>
        {row.cells.map(cell => (
          <td align={cell.column.align || 'left'} {...cell.getCellProps()}>
            {cell.render('Cell')}
          </td>
        ))}
        <td align='right'>
          <Group noWrap>
            <ActionIcon color='red' variant='outline' onClick={() => deleteImage(row)}><DeleteIcon /></ActionIcon>
            <ActionIcon color='primary' variant='outline' onClick={() => copyImage(row)}><CopyIcon /></ActionIcon>
            <ActionIcon color='green' variant='outline' onClick={() => viewImage(row)}><EnterIcon /></ActionIcon>
          </Group>
        </td>
      </tr>
    );
  });

  return (
    <div className={classes.root}>
      <div
        className={classes.tableContainer}
        style={{ height: 'calc(100% - 44px)' }}
      >
        <Table {...getTableProps()}>
          <thead style={{ backgroundColor: theme.other.hover }}>
            {renderHeader()}
          </thead>

          <tbody {...getTableBodyProps()}>
            {renderRow(page)}
          </tbody>
        </Table>
      </div>
      <Divider mb='md' variant='dotted' />
      <Group position='left'>
        <Text size='sm'>Rows per page: </Text>
        <Select
          style={{ width: '72px' }}
          variant='filled'
          data={pageSizeOptions}
          value={pageSize + ''}
          onChange={pageSize => setPageSize(Number(pageSize))} />
        <Divider orientation='vertical' />

        <Text size='sm'>{getPageRecordInfo()}</Text>
        <Divider orientation='vertical' />

        <Pagination
          page={pageIndex + 1}
          total={getPageCount()}
          onChange={handlePageChange} />
      </Group>
    </div>
  );
}
