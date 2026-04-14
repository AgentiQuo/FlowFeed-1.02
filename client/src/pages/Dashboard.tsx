import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight, Calendar, Settings, Trash2 } from "lucide-react";
import { DraftPreview } from "@/components/DraftPreview";
import AssetUpload from "@/components/AssetUpload";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRef } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const params = useParams();
  const [, setLocation] = useLocation();
  const selectedBrandId = params.brandId;

  // Auto-select last used brand on first load
  useEffect(() => {
    if (!selectedBrandId) {
      const lastBrandId = localStorage.getItem("lastSelectedBrandId");
      if (lastBrandId) {
        setLocation(`/dashboard/brand/${lastBrandId}`);
      }
    }
  }, [selectedBrandId, setLocation]);

  // Save brand selection to localStorage
  useEffect(() => {
    if (selectedBrandId) {
      localStorage.setItem("lastSelectedBrandId", selectedBrandId);
    }
  }, [selectedBrandId]);

  // State
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [isLayoutVertical, setIsLayoutVertical] = useState(window.innerWidth < 1024);
  const [showUpload, setShowUpload] = useState(false);
  const [feedbackDraftId, setFeedbackDraftId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [showApprovedOnly, setShowApprovedOnly] = useState(false);

  // Utils (must be called at top level)
  const utils = trpc.useUtils();

  // Queries
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: assets } = trpc.ingestion.listAssets.useQuery(
    { brandId: selectedBrandId || "" },
    { enabled: !!selectedBrandId }
  );

  // Derived state (before queries that depend on it)
  const currentAsset = assets?.[currentAssetIndex];

  const { data: drafts } = trpc.content.getDrafts.useQuery(
    { brandId: selectedBrandId || "", assetId: currentAsset?.id || "" },
    { enabled: !!selectedBrandId && !!currentAsset?.id }
  );

  // Mutations
  const generateDrafts = trpc.content.generateDrafts.useMutation({
    onSuccess: () => {
      // Refetch drafts after generation
      utils.content.getDrafts.invalidate();
    },
  });
  const approveDraft = trpc.content.approveDraft.useMutation({
    onSuccess: () => {
      utils.content.getDrafts.invalidate();
    },
  });
  const rewriteDraft = trpc.content.rewriteDraft.useMutation({
    onSuccess: () => {
      setFeedbackDraftId(null);
      setFeedbackText("");
      utils.content.getDrafts.invalidate();
    },
  });
  const updateDraft = trpc.content.updateDraft.useMutation({
    onSuccess: () => {
      setEditingDraftId(null);
      setEditContent("");
      utils.content.getDrafts.invalidate();
    },
  });
  const deleteAsset = trpc.ingestion.deleteAsset.useMutation({
    onSuccess: () => {
      utils.ingestion.listAssets.invalidate();
    },
  });
  const deleteDraftMutation = trpc.content.deleteDraft.useMutation({
    onSuccess: () => {
      utils.content.getDrafts.invalidate();
    },
  });

  // Derived state
  const activeBrand = brands?.find((b: any) => b.id === selectedBrandId);
  const filteredDrafts = useMemo(() => {
    if (!drafts || !currentAsset) return [];
    return drafts.filter((d: any) => d.assetId === currentAsset.id);
  }, [drafts, currentAsset]);

  const ALL_PLATFORMS: Array<"instagram" | "x" | "linkedin" | "facebook" | "website"> = ["instagram", "x", "linkedin", "facebook", "website"];

  const PLATFORM_LABELS: Record<string, string> = {
    instagram: "Instagram",
    x: "X",
    linkedin: "LinkedIn",
    facebook: "Facebook",
    website: "Website",
  };

  // Persistent platform selection via localStorage
  const [selectedPlatforms, setSelectedPlatforms] = useState<Array<"instagram" | "x" | "linkedin" | "facebook" | "website">>(() => {
    try {
      const saved = localStorage.getItem("flowfeed_selected_platforms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [...ALL_PLATFORMS];
  });

  const togglePlatform = (platform: "instagram" | "x" | "linkedin" | "facebook" | "website") => {
    setSelectedPlatforms(prev => {
      const next = prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform];
      // Always keep at least one selected
      const result = next.length > 0 ? next : prev;
      localStorage.setItem("flowfeed_selected_platforms", JSON.stringify(result));
      return result;
    });
  };

  const handleCreatePosts = async () => {
    if (!currentAsset || !selectedBrandId) return;
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    await generateDrafts.mutateAsync({
      brandId: selectedBrandId,
      assetId: currentAsset.id,
      platforms: selectedPlatforms as any,
    });
  };

  const handleApproveDraft = async (draftId: string) => {
    await approveDraft.mutateAsync({ draftId });
  };

  const handleFeedback = (draftId: string) => {
    setFeedbackDraftId(draftId);
    setFeedbackText("");
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackDraftId || !feedbackText.trim()) return;
    await rewriteDraft.mutateAsync({
      draftId: feedbackDraftId,
      feedback: feedbackText,
    });
  };

  const handleEditDraft = (draft: any) => {
    setEditingDraftId(draft.id);
    setEditContent(draft.content);
  };

  const handleSaveEdit = async () => {
    if (!editingDraftId || !editContent.trim()) return;
    await updateDraft.mutateAsync({
      draftId: editingDraftId,
      content: editContent,
    });
  };

  const handleNextAsset = () => {
    if (assets && currentAssetIndex < assets.length - 1) {
      setCurrentAssetIndex(currentAssetIndex + 1);
    }
  };

  const handlePrevAsset = () => {
    if (currentAssetIndex > 0) {
      setCurrentAssetIndex(currentAssetIndex - 1);
    }
  };

  const handleDeleteAssetMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressing(true);
    }, 500);
  };

  const handleDeleteAssetMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const confirmDeleteAsset = async () => {
    if (!currentAsset) return;
    try {
      await deleteAsset.mutateAsync({ assetId: currentAsset.id });
      toast.success("Asset deleted successfully");
      setIsLongPressing(false);
      if (currentAssetIndex > 0) {
        setCurrentAssetIndex(currentAssetIndex - 1);
      } else {
        setCurrentAssetIndex(0);
      }
    } catch (error: any) {
      toast.error(`Failed to delete asset: ${error.message}`);
      setIsLongPressing(false);
    }
  };

  // Responsive layout
  const inputSectionClass = isLayoutVertical ? "w-full mb-6" : "w-1/2 pr-3";
  const createSectionClass = isLayoutVertical ? "w-full" : "w-1/2 pl-3";

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-background min-h-screen">
      {/* INPUT SECTION */}
      <div className={inputSectionClass}>
        <Card className="h-full">
          <CardContent className="space-y-6">
            {/* Header with Assets title and Queue button */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
              {selectedBrandId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.location.href = `/dashboard/queue/${selectedBrandId}`}
                  title="Go to Queue"
                >
                  <Calendar className="w-4 h-4" />
                </Button>
              )}
            </div>
            {/* Brand Tabs */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Brand</h3>
              </div>
              <Tabs value={selectedBrandId || ""} onValueChange={(value) => {
                if (value === "settings") {
                  setLocation("/dashboard/brands");
                } else if (value !== "new") {
                  window.location.href = `/dashboard/brand/${value}`;
                }
              }} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  {brands?.map((brand: any) => (
                    <TabsTrigger key={brand.id} value={brand.id} className="flex-shrink-0">
                      {brand.name}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="settings" className="flex-shrink-0" title="All Brands & Settings">
                    <Settings className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Asset Carousel - ALWAYS AT TOP */}
            {assets && assets.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Asset {currentAssetIndex + 1} of {assets?.length}</h3>
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevAsset}
                      disabled={currentAssetIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {isLongPressing ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={confirmDeleteAsset}
                          disabled={deleteAsset.isPending}
                        >
                          {deleteAsset.isPending ? "Deleting..." : "Confirm Delete"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsLongPressing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onMouseDown={handleDeleteAssetMouseDown}
                        onMouseUp={handleDeleteAssetMouseUp}
                        onMouseLeave={handleDeleteAssetMouseUp}
                        onTouchStart={handleDeleteAssetMouseDown}
                        onTouchEnd={handleDeleteAssetMouseUp}
                        title="Long-press to delete asset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextAsset}
                      disabled={currentAssetIndex === (assets?.length || 0) - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Asset Image */}
                {currentAsset && (
                <div className="relative bg-muted rounded-lg overflow-hidden aspect-square">
                  <img
                    src={currentAsset.s3Url}
                    alt={currentAsset.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                )}


              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg text-muted-foreground">
                <p>No assets uploaded yet. Click + to add your first asset.</p>
              </div>
            )}

            {/* Action Buttons - BELOW CAROUSEL */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowUpload(!showUpload)}
                variant="outline"
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleCreatePosts()}
                className="flex-1"
                disabled={!assets || assets.length === 0}
              >
                {generateDrafts.isPending ? "Creating..." : "Create"}
              </Button>
            </div>

            {/* Platform Selection Toggles - Styled like brand tabs */}
            <div className="bg-muted p-1 gap-1 inline-flex rounded-md">
              {ALL_PLATFORMS.map(platform => {
                const isActive = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={[
                      "px-4 py-2 rounded-md text-sm font-medium transition-all select-none",
                      isActive
                        ? "bg-white text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {PLATFORM_LABELS[platform]}
                  </button>
                );
              })}
            </div>

            {/* Upload Section - BELOW BUTTONS */}
            {showUpload && selectedBrandId && (
              <AssetUpload
                brandId={selectedBrandId}
                onUploadSuccess={() => setShowUpload(false)}
              />
            )}

          </CardContent>
        </Card>
      </div>

      {/* CREATE SECTION */}
      <div className={createSectionClass}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Create Posts</CardTitle>
            <CardDescription>Review and approve posts for each platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Drafts Label */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Drafts</h3>
            </div>

            {/* Draft Preview */}
            {currentAsset && filteredDrafts.length > 0 ? (
              <div className="space-y-4">
                {filteredDrafts.map((draft: any) => {
                  const draftAsset = assets?.find((a: any) => a.id === draft.assetId);
                  return (
                  <div key={draft.id} className="space-y-4">
                    <DraftPreview
                      draft={draft}
                      assetImage={draftAsset?.s3Url}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveDraft(draft.id)}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleFeedback(draft.id)}
                      >
                        Feedback
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleEditDraft(draft)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteDraftMutation.isPending}
                        onClick={async () => {
                          if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) return;
                          try {
                            await deleteDraftMutation.mutateAsync({ draftId: draft.id });
                            toast.success("Draft deleted successfully");
                          } catch (error: any) {
                            toast.error(`Failed to delete draft: ${error.message}`);
                          }
                        }}
                        title="Delete draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {editingDraftId === draft.id && (
                      <div className="space-y-2 mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                        <label className="text-sm font-medium">Edit caption:</label>
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 border rounded text-sm"
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSaveEdit}
                            disabled={!editContent.trim() || updateDraft.isPending}
                            className="flex-1"
                          >
                            {updateDraft.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingDraftId(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                                        {feedbackDraftId === draft.id && (
                      <div className="space-y-2 mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <label className="text-sm font-medium">Provide feedback for AI rewrite:</label>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="e.g., Make it more casual, add more emojis, focus on luxury features..."
                          className="w-full p-2 border rounded text-sm"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleSubmitFeedback}
                            disabled={!feedbackText.trim() || rewriteDraft.isPending}
                            className="flex-1"
                          >
                            {rewriteDraft.isPending ? "Rewriting..." : "Rewrite with AI"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setFeedbackDraftId(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Create posts to see previews here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
