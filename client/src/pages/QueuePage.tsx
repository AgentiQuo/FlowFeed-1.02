import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Calendar, Clock, Trash2, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export default function QueuePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});

  // Fetch queue data
  const { data: queuePosts = [], isLoading: isLoadingQueue, refetch: refetchQueue } = trpc.queue.getQueue.useQuery(
    { brandId: brandId || "" },
    { enabled: !!brandId }
  );

  // Fetch assets to get thumbnails for queued posts
  const { data: assets = [] } = trpc.ingestion.listAssets.useQuery(
    { brandId: brandId || "" },
    { enabled: !!brandId }
  );

  // Build asset image map
  useEffect(() => {
    const images: Record<string, string> = {};
    assets.forEach((asset) => {
      if (asset.s3Url) {
        images[asset.id] = asset.s3Url;
      }
    });
    setAssetImages(images);
  }, [assets]);

  const { data: analytics } = trpc.queue.getQueueAnalytics.useQuery(
    { brandId: brandId || "" },
    { enabled: !!brandId }
  );

  const { data: suggestedTimes = [] } = trpc.queue.getSuggestedTimes.useQuery(
    { brandId: brandId || "", count: 5 },
    { enabled: !!brandId }
  );

  // Mutations
  const reorderMutation = trpc.queue.reorderQueue.useMutation({
    onSuccess: () => {
      toast.success("Queue reordered successfully");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(`Failed to reorder: ${error.message}`);
    },
  });

  const publishMutation = trpc.queue.publishPost.useMutation({
    onSuccess: () => {
      toast.success("Post published successfully");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(`Failed to publish: ${error.message}`);
    },
  });

  const removeMutation = trpc.queue.removeFromQueue.useMutation({
    onSuccess: () => {
      toast.success("Post removed from queue");
      refetchQueue();
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = queuePosts.findIndex((p) => p.id === draggedId);
    const targetIndex = queuePosts.findIndex((p) => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newOrder = [...queuePosts];
    const [draggedPost] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPost);

    // Update queue with new order
    const newPostIds = newOrder.map((p) => p.id);
    reorderMutation.mutate({ brandId: brandId || "", postIds: newPostIds });

    setDraggedId(null);
  };

  const handlePublish = async (postId: string) => {
    setIsPublishing(postId);
    try {
      await publishMutation.mutateAsync({ postId });
    } finally {
      setIsPublishing(null);
    }
  };

  const handleRemove = (postId: string) => {
    removeMutation.mutate({ postId });
  };

  const formatScheduledTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "bg-pink-100 text-pink-800",
      linkedin: "bg-blue-100 text-blue-800",
      facebook: "bg-blue-50 text-blue-700",
      website: "bg-purple-100 text-purple-800",
    };
    return colors[platform] || "bg-gray-100 text-gray-800";
  };

  if (!brandId) {
    return (
      <div className="p-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              No Brand Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900">
              Please select a brand from the Brands page to manage the scheduling queue.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduling Queue</h1>
        <p className="text-muted-foreground mt-2">
          Manage and schedule your content posts across platforms
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.scheduled}</div>
              <p className="text-xs text-muted-foreground mt-1">Posts waiting to be published</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.published}</div>
              <p className="text-xs text-muted-foreground mt-1">Posts already published</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{analytics.failed}</div>
              <p className="text-xs text-muted-foreground mt-1">Posts that failed to publish</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suggested Times */}
      {suggestedTimes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested Posting Times</CardTitle>
            <CardDescription>Optimal times for your next posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {suggestedTimes.map((time, idx) => (
                <Badge key={idx} variant="outline" className="font-mono text-xs">
                  {formatScheduledTime(time)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Queue ({queuePosts.length})</CardTitle>
          <CardDescription>
            Drag to reorder posts. They will be published at their scheduled times.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingQueue ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : queuePosts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No posts in queue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate drafts and add them to the queue to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queuePosts.map((post, index) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={() => handleDragStart(post.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(post.id)}
                  className={`p-4 border rounded-lg transition-all cursor-move hover:bg-accent/50 ${
                    draggedId === post.id ? "opacity-50 bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {(post as any).assetId && assetImages[(post as any).assetId] && (
                      <div className="flex-shrink-0">
                        <img
                          src={assetImages[(post as any).assetId]}
                          alt="Asset"
                          className="w-16 h-16 object-cover rounded border border-border"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <Badge className={getPlatformColor(post.platform)}>
                          {post.platform}
                        </Badge>
                        <Badge variant="outline">{post.status}</Badge>
                      </div>
                      <p className="text-sm line-clamp-2 text-foreground">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.scheduledFor ? formatScheduledTime(post.scheduledFor) : "Not scheduled"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPublishing === post.id}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Publish Post Now?</DialogTitle>
                            <DialogDescription>
                              This will immediately publish the post to {post.platform}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm">{post.content}</p>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button
                                onClick={() => handlePublish(post.id)}
                                disabled={isPublishing === post.id}
                              >
                                {isPublishing === post.id ? "Publishing..." : "Publish Now"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemove(post.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
