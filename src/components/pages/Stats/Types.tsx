import { LoadingOverlay, Card } from "@mantine/core";
import { SmallTable } from "components/SmallTable";
import { useStats } from "lib/queries/stats"
import { Fragment } from "react";

export default function Types() {
  const stats = useStats();
  
  if(stats.isLoading) return (
    <LoadingOverlay visible />
  );

  const latest = stats.data[0];

  return (
    <Fragment>
      {latest.data.count_by_user.length ? (
        <Card>
          <SmallTable
            columns={[
              { id: 'username', name: 'Name' },
              { id: 'count', name: 'Files' },
            ]}
            rows={latest.data.count_by_user}
          />
        </Card>
      ) : null}
      <Card>
        <SmallTable
          columns={[
            { id: 'mimetype', name: 'Type' },
            { id: 'count', name: 'Count' },
          ]}
          rows={latest.data.types_count}
        />
      </Card>
    </Fragment>
  )
}