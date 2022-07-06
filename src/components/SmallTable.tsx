import { Box, Table } from '@mantine/core';
import { randomId } from '@mantine/hooks';

export function SmallTable({ rows, columns }) {
  return (
    <Box sx={{ pt: 1 }}>
      <Table highlightOnHover>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={randomId()}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={randomId()}>
              {columns.map(col => (
                <td key={randomId()}>
                  {col.format ? col.format(row[col.id]) : row[col.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Box>
  );
}