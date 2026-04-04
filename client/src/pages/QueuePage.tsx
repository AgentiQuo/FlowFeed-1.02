import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Calendar, Clock, Trash2, Send, Home } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function QueuePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [, setLocation] = useLocation();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});

  // Fetch all brands for filter dropdown
  const { data: allBrands = [] } = trpc.brands.list.useQuery();

  // Fetch all scheduled posts for the current brand (from URL param)
  const { data: queuePosts = [], isLoading: isLoadingQueue, refetch: refetchQueue } = trpc.queue.getAllScheduledPosts.useQuery(
    { brandId: brandId }
  );

  // Fetch all drafts to get asset information
  const { data: allDrafts = [] } = trpc.content.getDrafts.useQuery(
    { brandId: brandId }
  );

  // Fetch all assets for the brand to get image URLs
  const { data: brandAssets = [] } = trpc.ingestion.listAssets.useQuery(
    { brandId: brandId }
  );

  // Build draft map and asset image map
  const draftMap: Record<string, any> = {};
  const assetImageMap: Record<string, string> = {};
  allDrafts.forEach((draft) => {
    draftMap[draft.id] = draft;
  });
  brandAssets.forEach((asset) => {
    if (asset.s3Url) {
      assetImageMap[asset.id] = asset.s3Url;
    }
  });
  
  // Debug: Log asset mapping info
  if (queuePosts.length > 0) {
    console.log('QueuePage Debug:');
    console.log('- brandId:', brandId);
    console.log('- queuePosts:', queuePosts.length);
    console.log('- allDrafts:', allDrafts.length);
    console.log('- brandAssets:', brandAssets.length);
    console.log('- assetImageMap keys:', Object.keys(assetImageMap).length);
    if (Object.keys(assetImageMap).length === 0) {
      console.warn('No assets in map. brandAssets:', brandAssets);
    }
  }



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

  const handlePublish = async (postId: string, closeDialog?: () => void) => {
    setIsPublishing(postId);
    try {
      await publishMutation.mutateAsync({ postId });
      // Close dialog after successful publish
      if (closeDialog) {
        closeDialog();
      }
    } finally {
      setIsPublishing(null);
    }
  };

  const handleRemove = (postId: string) => {
    removeMutation.mutate({ postId });
  };

  const handleBrandChange = (newBrandId: string) => {
    setLocation(`/dashboard/queue/${newBrandId}`);
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
      x: "bg-gray-100 text-gray-800",
    };
    return colors[platform] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Brand:</label>
            <Select value={brandId || ""} onValueChange={handleBrandChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                {allBrands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation(`/dashboard`)}
            title="Go to Home"
          >
            <Home className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
                    {(() => {
                      const assetId = (post as any).assetId || draftMap[post.draftId]?.assetId;
                      const imageUrl = assetId ? assetImageMap[assetId] : null;
                      return imageUrl ? (
                        <div className="flex-shrink-0">
                          <img
                            src={imageUrl}
                            alt="Asset"
                            className="w-16 h-16 object-cover rounded border border-border"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 bg-muted rounded border border-border flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPlatformColor(post.platform)}>
                          {post.platform}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2 text-foreground">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-2">
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
                                <DialogClose asChild>
                                  <Button
                                    onClick={() => handlePublish(post.id)}
                                    disabled={isPublishing === post.id}
                                  >
                                    {isPublishing === post.id ? "Publishing..." : "Publish Now"}
                                  </Button>
                                </DialogClose>
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
                      {post.scheduledFor && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatScheduledTime(post.scheduledFor)}
                        </div>
                      )}
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
