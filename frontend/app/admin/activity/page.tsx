"use client";

import { ActivityFeed } from "@/components/activity";
import { Card, ErrorNote, Reveal } from "@/components/ui";
import { ActivityEvent } from "@/lib/api";
import { useApi } from "@/lib/hooks";

export default function ActivityPage() {
  const { data, error } = useApi<ActivityEvent[]>("/admin/activity/", 10_000);

  return (
    <Reveal>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card title="Journal d'activité" bodyClassName="p-5">
        <ActivityFeed events={data ?? []} />
      </Card>
    </Reveal>
  );
}
