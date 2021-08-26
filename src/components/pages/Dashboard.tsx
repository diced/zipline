import React, { useEffect, useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Button,
  ButtonGroup,
  Typography,
  Grid
} from '@material-ui/core';

import Link from 'components/Link';
import Card from 'components/Card';
import Backdrop from 'components/Backdrop';
import useFetch from 'lib/hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';

type Aligns = 'inherit' | 'right' | 'left' | 'center' | 'justify';

export function bytesToRead(bytes: number) {
  if (isNaN(bytes)) return '0.0 B';
  if (bytes === Infinity) return '0.0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let num = 0;

  while (bytes > 1024) {
    bytes /= 1024;
    ++num;
  }

  return `${bytes.toFixed(1)} ${units[num]}`;
}

const columns = [
  { id: 'file', label: 'Name', minWidth: 170, align: 'inherit' as Aligns },
  { id: 'mimetype', label: 'Type', minWidth: 100, align: 'inherit' as Aligns },
  {
    id: 'created_at',
    label: 'Date',
    minWidth: 170,
    align: 'right' as Aligns,
    format: (value) => new Date(value).toLocaleString(),
  }
];

function StatText({ children }) {
  return <Typography variant='h5' color='GrayText'>{children}</Typography>;
}

function StatTable({ rows, columns }) {
  return (
    <TableContainer sx={{ pt: 1 }}>
      <Table sx={{ minWidth: 100 }} size='small'>
        <TableHead>
          <TableRow>
            {columns.map(col => (
              <TableCell key={col.name}>{col.name}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={row.username}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              {columns.map(col => (
                <TableCell key={col.id}>
                  {col.format ? col.format(row[col.id]) : row[col.id]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function Dashboard() {
  const user = useStoreSelector(state => state.user);

  const [images, setImages] = useState([]);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const updateImages = async () => {
    setApiLoading(true);

    const imgs = await useFetch('/api/user/images');
    const stts = await useFetch('/api/stats');
    setImages(imgs);
    setStats(stts);console.log(stts);

    setApiLoading(false);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleDelete = async image => {
    const res = await useFetch('/api/user/images', 'DELETE', { id: image.id });
    if (!res.error) updateImages();
  };

  useEffect(() => {
    updateImages();
  }, []);
  
  return (
    <>
      <Backdrop open={apiLoading} />
      <Typography variant='h4'>Welcome back {user?.username}</Typography>
      <Typography color='GrayText' pb={2}>You have <b>{images.length}</b> images</Typography>

      <Typography variant='h4'>Stats</Typography>
      {stats && (
        <Grid container spacing={4} py={2}>
          <Grid item xs={12} sm={4}>
            <Card name='Size' sx={{ height: '100%' }}>
              <StatText>{stats.size}</StatText>
              <Typography variant='h3'>Average Size</Typography>
              <StatText>{bytesToRead(stats.size_num / stats.count)}</StatText>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card name='Images' sx={{ height: '100%' }}>
              <StatText>{stats.count}</StatText>
              <Typography variant='h3'>Views</Typography>
              <StatText>{stats.views_count} ({isNaN(stats.views_count / stats.count) ? '0' : stats.views_count / stats.count})</StatText>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card name='Users' sx={{ height: '100%' }}>
              <StatText>{stats.count_users}</StatText>
            </Card>
          </Grid>
        </Grid>
      )}

      <Card name='Images' sx={{ my: 2 }} elevation={0} variant='outlined'>
        <Link href='/dashboard/images' pb={2}>View Gallery</Link>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                <TableCell sx={{ minWidth: 200 }} align='right'>
                Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {images
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => {
                  return (
                    <TableRow hover role='checkbox' tabIndex={-1} key={row.id}>
                      {columns.map((column) => {
                        const value = row[column.id];
                        return (
                          <TableCell key={column.id} align={column.align}>
                            {column.format ? column.format(value) : value}
                          </TableCell>
                        );
                      })}
                      <TableCell align='right'>
                        <ButtonGroup variant='outlined'>
                          <Button onClick={() => handleDelete(row)} color='error' size='small'>Delete</Button>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component='div'
          count={images.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
      {stats && (
        <>
          <Card name='Images per User' sx={{ height: '100%', my: 2 }} elevation={0} variant='outlined'>
            <StatTable
              columns={[
                { id: 'username', name: 'Name' },
                { id: 'count', name: 'Images' }
              ]}
              rows={stats.count_by_user}
            />
          </Card>

          <Card name='Types' sx={{ height: '100%', my: 2 }} elevation={0} variant='outlined'>
            <StatTable
              columns={[
                { id: 'mimetype', name: 'Type' },
                { id: 'count', name: 'Count' }
              ]}
              rows={stats.types_count}
            />
          </Card>
        </>
      )}
    </>
  );
}