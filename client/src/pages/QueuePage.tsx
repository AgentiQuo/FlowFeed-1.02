import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getPlatformAbbr } from "@/lib/platformNames";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Calendar, Clock, Trash2, Send, Home, Loader } from "lucide-react";
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
  const [, setLocation] = useLocation();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});

  // Auto-select last used brand on first load
  useEffect(() => {
    if (!brandId) {
      const lastBrandId = localStorage.getItem("lastSelectedQueueBrandId");
      if (lastBrandId) {
        setLocation(`/dashboard/queue/${lastBrandId}`);
      }
    }
  }, [brandId, setLocation]);

  // Save brand selection to localStorage
  useEffect(() => {
    if (brandId) {
      localStorage.setItem("lastSelectedQueueBrandId", brandId);
    }
  }, [brandId]);

  // Fetch all brands for filter dropdown
  const { data: allBrands = [] } = trpc.brands.list.useQuery();

  // Fetch all scheduled posts for the current brand (from URL param)
  const { data: queuePosts = [], isLoading: isLoadingQueue, refetch: refetchQueue } = trpc.queue.getAllScheduledPosts.useQuery(
    { brandId: brandId }
  );

  // Thumbnails are now stored directly on posts, no need to fetch assets



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
    onSuccess: (data) => {
      if (data.postUrl) {
        toast.success(
          <div className="flex flex-col gap-2">
            <div>Post published successfully!</div>
            <a
              href={data.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm break-all"
            >
              View post →
            </a>
          </div>
        );
      } else {
        toast.success("Post published successfully");
      }
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
      await publishMutation.mutateAsync({ postId, brandId: brandId || "" });
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Queue</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation(`/dashboard`)}
          title="Go to Home"
        >
          <Home className="w-4 h-4" />
        </Button>
      </div>

      {/* Brand Filter Tabs */}
      <Tabs
        value={brandId || ""}
        onValueChange={(value) => {
          window.location.href = `/dashboard/queue/${value}`;
        }}
        className="w-full"
      >
        <TabsList className="bg-muted p-1 gap-1 w-auto">
          {allBrands?.map((brand: any) => (
            <TabsTrigger
              key={brand.id}
              value={brand.id}
              className="rounded-md px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              {brand.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
                      const imageUrl = (post as any).thumbnailUrl;
                      return imageUrl ? (
                        <div className="flex-shrink-0">
                          <img
                            src={imageUrl}
                            alt="Post thumbnail"
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
                          {getPlatformAbbr(post.platform)}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2 text-foreground">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublish(post.id)}
                          disabled={isPublishing === post.id}
                        >
                          {isPublishing === post.id ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin mr-2" />
                              Publishing...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                            </>
                          )}
                        </Button>
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
