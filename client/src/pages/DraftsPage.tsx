import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Download, Copy, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function DraftsPage() {
  const { brandId } = useParams();
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram"]);

  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editFeedback, setEditFeedback] = useState("");
  const [exportFormat, setExportFormat] = useState<"html" | "json" | "xml">("html");
  const [exportingDraftId, setExportingDraftId] = useState<string | null>(null);
  const [movingToQueueDraftId, setMovingToQueueDraftId] = useState<string | null>(null);
  const [queuedDrafts, setQueuedDrafts] = useState<Record<string, any>>({});
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});
  const [loadingAssetImages, setLoadingAssetImages] = useState<Record<string, boolean>>({});
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (!brandId) return <div>Invalid brand</div>;

  // Get brand details
  const { data: brand } = trpc.brands.getById.useQuery({ brandId });


  // Get brand assets
  const { data: assets, isLoading: assetsLoading } = trpc.ingestion.listAssets.useQuery({
    brandId,
  });

  // Fetch asset image URLs when assets load
  useEffect(() => {
    if (!assets || assets.length === 0) return;

    const fetchAssetImages = async () => {
      const images: Record<string, string> = {};
      const loading: Record<string, boolean> = {};

      for (const asset of assets) {
        if (asset.s3Url) {
          images[asset.id] = asset.s3Url;
        }
      }

      setAssetImages(images);
    };

    fetchAssetImages();
  }, [assets]);

  // Handle keyboard navigation for carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!assets || assets.length === 0) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCarouselIndex((prev) => (prev - 1 + assets.length) % assets.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCarouselIndex((prev) => (prev + 1) % assets.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assets]);

  // Get drafts for selected asset
  const { data: drafts, isLoading: draftsLoading, refetch: refetchDrafts } = trpc.content.getDrafts.useQuery(
    {
      brandId,
      assetId: selectedAssetId || undefined,
    },
    { enabled: !!selectedAssetId }
  );

  // Generate drafts mutation
  const generateDraftsMutation = trpc.content.generateDrafts.useMutation({
    onSuccess: () => {
      toast.success("Drafts generated successfully!");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to generate drafts: ${error.message}`);
    },
  });

  // Update draft mutation
  const updateDraftMutation = trpc.content.updateDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft updated successfully!");
      setEditingDraftId(null);
      setEditContent("");
      setEditFeedback("");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to update draft: ${error.message}`);
    },
  });

  // Approve draft mutation
  const approveDraftMutation = trpc.content.approveDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft approved for scheduling!");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to approve draft: ${error.message}`);
    },
  });

  // Delete draft mutation
  const deleteDraftMutation = trpc.content.deleteDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft deleted");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to delete draft: ${error.message}`);
    },
  });

  // Export draft mutation
  const exportDraftMutation = trpc.export.exportDraft.useMutation({
    onSuccess: (data) => {
      // Create blob and download
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Draft exported as ${exportFormat.toUpperCase()}`);
      setExportingDraftId(null);
    },
    onError: (error) => {
      toast.error(`Failed to export draft: ${error.message}`);
      setExportingDraftId(null);
    },
  });

  // Move to queue mutation
  const moveToQueueMutation = trpc.queue.moveToQueue.useMutation({
    onSuccess: (data) => {
      toast.success(`Draft moved to queue! Scheduled for ${data.count} platform(s)`);
      setMovingToQueueDraftId(null);
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to move draft to queue: ${error.message}`);
      setMovingToQueueDraftId(null);
    },
  });

  const handleGenerateDrafts = () => {
    if (!selectedAssetId) {
      toast.error("Please select an asset first");
      return;
    }

    generateDraftsMutation.mutate({
      brandId,
      assetId: selectedAssetId,
      platforms: selectedPlatforms as any,
    });
  };

  const handleUpdateDraft = (draftId: string) => {
    updateDraftMutation.mutate({
      draftId,
      content: editContent,
      feedback: editFeedback,
    });
  };

  const handleApproveDraft = (draftId: string) => {
    approveDraftMutation.mutate({ draftId });
  };

  const handleDeleteDraft = (draftId: string) => {
    if (confirm("Are you sure you want to delete this draft?")) {
      deleteDraftMutation.mutate({ draftId });
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleExportDraft = (draftId: string) => {
    setExportingDraftId(draftId);
    exportDraftMutation.mutate({
      draftId,
      format: exportFormat,
    });
  };

  const handleCopyToClipboard = (draftId: string) => {
    const draft = drafts?.find((d) => d.id === draftId);
    if (draft) {
      navigator.clipboard.writeText(draft.content);
      toast.success("Content copied to clipboard!");
    }
  };

  const handleMoveToQueue = (draftId: string) => {
    setMovingToQueueDraftId(draftId);
    moveToQueueMutation.mutate({
      brandId,
      draftId,
    });
  };

  // Get asset image URL for a draft
  const getAssetImageUrl = (assetId: string): string | null => {
    return assetImages[assetId] || null;
  };

  // Check queue status for approved drafts when they load
  useEffect(() => {
    if (!drafts) return;

    const checkQueueStatus = async () => {
      const newQueuedDrafts: Record<string, any> = {};
      const approvedDrafts = drafts.filter((d: any) => d.status === "reviewed");

      for (const draft of approvedDrafts) {
        try {
          const result = await fetch(
            `/api/trpc/queue.checkDraftQueued?input=${encodeURIComponent(JSON.stringify({ draftId: draft.id }))}`
          )
            .then((r) => r.json())
            .catch(() => null);

          if (result?.result?.data?.isQueued) {
            newQueuedDrafts[draft.id] = result.result.data;
          }
        } catch (error) {
          console.error("Error checking queue status:", error);
        }
      }

      setQueuedDrafts(newQueuedDrafts);
    };

    checkQueueStatus();
  }, [drafts]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">CREATE</h1>
        <p className="text-muted-foreground">Generate and review platform-specific content</p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">Create</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Content Drafts</CardTitle>
              <CardDescription>
                Select an asset and choose platforms to generate AI-powered content variations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Carousel */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Browse Assets</label>
                {assetsLoading ? (
                  <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !assets || assets.length === 0 ? (
                  <div className="h-96 flex items-center justify-center bg-muted rounded-lg text-muted-foreground">
                    No assets found. Upload images in the Ingestion tab first.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Brand Name Above Carousel */}
                    {brand && (
                      <div className="text-sm font-semibold text-muted-foreground">
                        {brand.name}
                      </div>
                    )}

                    {/* Carousel */}
                    <div className="relative bg-muted rounded-lg overflow-hidden">
                      <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
                        {assetImages[assets[carouselIndex]?.id] ? (
                          <img
                            src={assetImages[assets[carouselIndex]?.id]}
                            alt={assets[carouselIndex]?.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <div className="text-sm">Image loading...</div>
                          </div>
                        )}
                      </div>

                      {/* Navigation Arrows */}
                      {assets.length > 1 && (
                        <>
                          <button
                            onClick={() => setCarouselIndex((prev) => (prev - 1 + assets.length) % assets.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setCarouselIndex((prev) => (prev + 1) % assets.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}

                      {/* Carousel Counter */}
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 rounded text-sm">
                        {carouselIndex + 1} / {assets.length}
                      </div>
                    </div>

                    {/* Asset Info and Platform Selection */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Selected: {assets[carouselIndex]?.fileName}</p>
                        <p className="text-xs text-muted-foreground mt-1">💡 Use arrow keys to navigate carousel</p>
                      </div>

                      {/* Platform Selection under image - Persistent across carousel */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Generate for these platforms:</label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={selectedPlatforms.length === 5 ? "default" : "outline"}
                            onClick={() => {
                              setSelectedAssetId(assets[carouselIndex]?.id);
                              setSelectedPlatforms(["instagram", "linkedin", "facebook", "x", "website"]);
                            }}
                            size="sm"
                            className="font-semibold"
                          >
                            ALL
                          </Button>
                          {["instagram", "linkedin", "facebook", "x", "website"].map((platform) => (
                            <Button
                              key={platform}
                              variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                              onClick={() => {
                                setSelectedAssetId(assets[carouselIndex]?.id);
                                togglePlatform(platform);
                              }}
                              size="sm"
                              className="capitalize"
                            >
                              {platform === "x" ? "X" : platform}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          ✓ Selected platforms will apply to all images you process. Use arrow keys or click thumbnails to browse.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Create Button */}
              <Button
                onClick={handleGenerateDrafts}
                disabled={!selectedAssetId || generateDraftsMutation.isPending}
                className="w-full"
                size="lg"
              >
                {generateDraftsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create for {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? "s" : ""}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          {/* Export Format Selector - only show when there are approved drafts */}
          {drafts && drafts.some((d) => d.status === "reviewed") && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Export Format</label>
                  <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="json">JSON (WordPress)</SelectItem>
                      <SelectItem value="xml">XML (WordPress WXR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {exportFormat === "html" && "Standalone HTML document"}
                  {exportFormat === "json" && "WordPress REST API format"}
                  {exportFormat === "xml" && "WordPress WXR import format"}
                </p>
              </CardContent>
            </Card>
          )}

          {!selectedAssetId ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Select an asset from the Generate tab to view drafts
                </p>
              </CardContent>
            </Card>
          ) : draftsLoading ? (
            <Card>
              <CardContent className="pt-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </CardContent>
            </Card>
          ) : !drafts || drafts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No drafts yet. Generate some from the Generate tab.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <Card key={draft.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="capitalize">{draft.platform}</CardTitle>
                          <Badge variant={draft.status === "draft" ? "secondary" : "default"}>
                            {draft.status}
                          </Badge>
                          {queuedDrafts[draft.id] && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Queued
                            </Badge>
                          )}
                        </div>
                        <CardDescription>Created {new Date(draft.createdAt).toLocaleDateString()}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {draft.status === "draft" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingDraftId(draft.id);
                                setEditContent(draft.content);
                                setEditFeedback("");
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const feedback = prompt("What would you like to improve? (e.g., 'Make it shorter', 'Add more emojis', 'More professional tone')");
                                if (feedback) {
                                  setEditingDraftId(draft.id);
                                  setEditContent(draft.content);
                                  setEditFeedback(feedback);
                                  toast.info(`Improving with feedback: ${feedback}`);
                                }
                              }}
                            >
                              Improve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveDraft(draft.id)}
                              disabled={approveDraftMutation.isPending}
                            >
                              {approveDraftMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              Approve
                            </Button>
                          </>
                        )}
                        {draft.status === "reviewed" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyToClipboard(draft.id)}
                            >
                              <Copy className="mr-2 h-3 w-3" />
                              Copy
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleMoveToQueue(draft.id)}
                              disabled={movingToQueueDraftId === draft.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {movingToQueueDraftId === draft.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              <Send className="mr-2 h-3 w-3" />
                              Move to Queue
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportDraft(draft.id)}
                              disabled={exportingDraftId === draft.id}
                            >
                              {exportingDraftId === draft.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              <Download className="mr-2 h-3 w-3" />
                              Export
                            </Button>
                          </>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDraft(draft.id)}
                          disabled={deleteDraftMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editingDraftId === draft.id ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Content</label>
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[150px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Feedback (for AI learning)</label>
                          <Textarea
                            value={editFeedback}
                            onChange={(e) => setEditFeedback(e.target.value)}
                            placeholder="What would you like the AI to improve?"
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateDraft(draft.id)}
                            disabled={updateDraftMutation.isPending}
                          >
                            {updateDraftMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                          </Button>
                          <Button variant="outline" onClick={() => setEditingDraftId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Realistic Preview */}
                        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border">
                          {/* Image Preview */}
                          {draft.assetId && (
                            <div className="relative aspect-square bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                              {getAssetImageUrl(draft.assetId) ? (
                                <img
                                  src={getAssetImageUrl(draft.assetId)!}
                                  alt="Property preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                    const errorDiv = img.parentElement?.querySelector('[data-error]') as HTMLElement;
                                    if (errorDiv) errorDiv.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              {!getAssetImageUrl(draft.assetId) && (
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                  <Loader2 className="h-6 w-6 mb-2 animate-spin" />
                                  <p className="text-sm">Loading image...</p>
                                </div>
                              )}
                              <div
                                data-error
                                className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-muted-foreground hidden"
                              >
                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">Image failed to load</p>
                              </div>
                            </div>
                          )}
                          {/* Text Content */}
                          <div className="p-4">
                            <p className="text-sm whitespace-pre-wrap font-medium">{draft.content}</p>
                            <div className="mt-3 text-xs text-muted-foreground">
                              <p>Platform: <span className="capitalize font-semibold">{draft.platform}</span></p>
                              <p>Characters: {draft.content.length}</p>
                            </div>
                          </div>
                        </div>
                        {/* Full Content */}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap text-sm">{draft.content}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
