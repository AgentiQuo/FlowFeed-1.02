import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getPlatformAbbr } from "@/lib/platformNames";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Archive, Clock, Copy, Home, Loader } from "lucide-react";
import { toast } from "sonner";

export default function ArchivePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [, setLocation] = useLocation();
  const [isReusing, setIsReusing] = useState<string | null>(null);

  // Auto-select last used brand on first load
  useEffect(() => {
    if (!brandId) {
      const lastBrandId = localStorage.getItem("lastSelectedArchiveBrandId");
      if (lastBrandId) {
        setLocation(`/dashboard/archive/${lastBrandId}`);
      }
    }
  }, [brandId, setLocation]);

  // Save brand selection to localStorage
  useEffect(() => {
    if (brandId) {
      localStorage.setItem("lastSelectedArchiveBrandId", brandId);
    }
  }, [brandId]);

  // Fetch all brands for filter tabs
  const { data: allBrands = [] } = trpc.brands.list.useQuery();

  // Fetch all published posts for the current brand
  const { data: archivedPosts = [], isLoading: isLoadingArchive, refetch: refetchArchive } = trpc.queue.getPublishedPostsByBrand.useQuery(
    { brandId: brandId || "" },
    { enabled: !!brandId }
  );

  // Mutation to reuse a post (create a new draft from archived post)
  const reuseMutation = trpc.content.createFromArchivedPost.useMutation({
    onSuccess: (data: any) => {
      toast.success("Post loaded into editor. You can now edit and save as a new post.");
      // Navigate to the dashboard with the new draft pre-loaded
      setLocation(`/dashboard?draftId=${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to reuse post: ${error.message}`);
    },
  });

  const handleReuse = async (postId: string) => {
    setIsReusing(postId);
    try {
      await reuseMutation.mutateAsync({ postId: postId });
    } finally {
      setIsReusing(null);
    }
  };

  const formatPublishedTime = (date: Date | string | null) => {
    if (!date) return "Unknown";
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
      website: "bg-purple-100 text-purple-800",
    };
    return colors[platform] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Archive (Published Posts)</h1>
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
          window.location.href = `/dashboard/archive/${value}`;
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

      {/* Archive List */}
      <Card>
        <CardHeader>
          <CardTitle>Published Posts ({archivedPosts.length})</CardTitle>
          <CardDescription>
            Click "Reuse" to load a post into the editor and create a new version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingArchive ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : archivedPosts.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No published posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Posts will appear here once they are published from the queue
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 border rounded-lg transition-all hover:bg-accent/50"
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReuse(post.id)}
                        disabled={isReusing === post.id}
                      >
                        {isReusing === post.id ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Reuse
                          </>
                        )}
                      </Button>
                      {post.publishedAt && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatPublishedTime(post.publishedAt)}
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
