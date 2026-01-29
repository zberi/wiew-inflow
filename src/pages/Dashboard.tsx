import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { WebhookActivityCard } from "@/components/dashboard/WebhookActivityCard";
import { useMediaStats } from "@/hooks/useMediaItems";
import { useQueueStats } from "@/hooks/useUploadQueue";
import { useDestinationStats } from "@/hooks/useDestinations";
import { useGroupStats } from "@/hooks/useGroups";
import { useWebhookLogStats } from "@/hooks/useWebhookLogs";
import { Link } from "react-router-dom";
import {
  Image,
  Upload,
  CheckCircle,
  AlertCircle,
  Send,
  Users,
  Webhook,
} from "lucide-react";

export default function Dashboard() {
  const { data: mediaStats } = useMediaStats();
  const { data: queueStats } = useQueueStats();
  const { data: destStats } = useDestinationStats();
  const { data: groupStats } = useGroupStats();
  const { data: webhookStats } = useWebhookLogStats();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your WhatsApp media ingestion and publishing system.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="Total Media"
            value={mediaStats?.total || 0}
            description={`${mediaStats?.photos || 0} photos, ${mediaStats?.videos || 0} videos`}
            icon={Image}
            variant="default"
          />
          <StatsCard
            title="Pending Approval"
            value={queueStats?.pending || 0}
            description="Awaiting review"
            icon={Upload}
            variant="warning"
          />
          <StatsCard
            title="Completed Uploads"
            value={queueStats?.completed || 0}
            description="Successfully published"
            icon={CheckCircle}
            variant="success"
          />
          <StatsCard
            title="Failed Uploads"
            value={queueStats?.failed || 0}
            description="Require attention"
            icon={AlertCircle}
            variant="destructive"
          />
          <StatsCard
            title="Active Destinations"
            value={destStats?.active || 0}
            description={`${destStats?.total || 0} total configured`}
            icon={Send}
            variant="info"
          />
          <StatsCard
            title="Active Groups"
            value={groupStats?.active || 0}
            description={`${groupStats?.total || 0} total monitored`}
            icon={Users}
            variant="default"
          />
          <StatsCard
            title="Webhook Events"
            value={webhookStats?.total || 0}
            description={`${webhookStats?.pending || 0} pending, ${webhookStats?.errors || 0} errors`}
            icon={Webhook}
            variant={webhookStats?.errors ? "destructive" : "info"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <RecentActivity />
          </div>
          <div className="space-y-6">
            <WebhookActivityCard />
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Common tasks to manage your media workflow
              </p>
              <div className="grid gap-2">
                <Link
                  to="/queue"
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Review Upload Queue</p>
                    <p className="text-xs text-muted-foreground">
                      Approve or reject pending uploads
                    </p>
                  </div>
                </Link>
                <Link
                  to="/destinations"
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent transition-colors"
                >
                  <Send className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Configure Destinations</p>
                    <p className="text-xs text-muted-foreground">
                      Add or manage publishing targets
                    </p>
                  </div>
                </Link>
                <Link
                  to="/groups"
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent transition-colors"
                >
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Manage Groups</p>
                    <p className="text-xs text-muted-foreground">
                      Configure WhatsApp group monitoring
                    </p>
                  </div>
                </Link>
                <Link
                  to="/logs"
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-accent transition-colors"
                >
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">View Webhook Logs</p>
                    <p className="text-xs text-muted-foreground">
                      Monitor incoming WhatsApp events
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">System Status</h3>
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Webhook Endpoint</span>
                  <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded">
                    Ready
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Bucket</span>
                  <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}