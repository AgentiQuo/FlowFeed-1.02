import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { DraftPreview } from "@/components/DraftPreview";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const params = useParams();
  const selectedBrandId = params.brandId;

  // Queries
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: assets } = trpc.ingestion.listAssets.useQuery(
    { brandId: selectedBrandId || "" },
    { enabled: !!selectedBrandId }
  );
  const { data: drafts } = trpc.content.getDrafts.useQuery(
    { brandId: selectedBrandId || "" },
    { enabled: !!selectedBrandId }
  );

  // State
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [isLayoutVertical, setIsLayoutVertical] = useState(window.innerWidth < 1024);

  // Mutations
  const generateDrafts = trpc.content.generateDrafts.useMutation();
  const approveDraft = trpc.queue.publishPost.useMutation();

  // Derived state
  const currentAsset = assets?.[currentAssetIndex];
  const activeBrand = brands?.find((b: any) => b.id === selectedBrandId);
  const currentDrafts = useMemo(() => {
    if (!drafts || !currentAsset) return [];
      return drafts.filter(
        (d: any) => d.assetId === currentAsset.id && d.platform === selectedPlatform
      );
  }, [drafts, currentAsset, selectedPlatform]);

  const filteredDrafts = useMemo(() => {
    if (!drafts) return [];
    return drafts.filter((d: any) => d.platform === selectedPlatform);
  }, [drafts, selectedPlatform]);

  const platforms: Array<"instagram" | "x" | "linkedin" | "facebook"> = ["instagram", "x", "linkedin", "facebook"];

  const handleCreatePosts = async () => {
    if (!currentAsset || !selectedBrandId) return;
    await generateDrafts.mutateAsync({
      brandId: selectedBrandId,
      assetId: currentAsset.id,
      platforms: platforms as any,
    });
  };

  const handleApproveDraft = async (draftId: string) => {
    await approveDraft.mutateAsync({ postId: draftId });
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

  // Responsive layout
  const inputSectionClass = isLayoutVertical ? "w-full mb-6" : "w-1/2 pr-3";
  const createSectionClass = isLayoutVertical ? "w-full" : "w-1/2 pl-3";

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-background min-h-screen">
      {/* INPUT SECTION */}
      <div className={inputSectionClass}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Select brand and browse assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Tabs */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Brand</h3>
              <Tabs value={selectedBrandId || ""} onValueChange={(value) => {
                if (value !== "new") {
                  window.location.href = `/dashboard/brand/${value}`;
                }
              }} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  {brands?.map((brand: any) => (
                    <TabsTrigger key={brand.id} value={brand.id} className="flex-shrink-0">
                      {brand.name}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="new" className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Asset Carousel */}
            {assets && assets.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Asset {currentAssetIndex + 1} of {assets?.length}</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevAsset}
                      disabled={currentAssetIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
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

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreatePosts}
                    disabled={generateDrafts.isPending}
                    className="flex-1"
                  >
                    {generateDrafts.isPending ? "Creating..." : "Create"}
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Edit
                  </Button>
                  <Button variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No assets uploaded yet</p>
              </div>
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
            {/* Platform Tabs */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Platform</h3>
              <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <TabsList className="w-full justify-start overflow-x-auto">
                  {platforms.map((platform) => (
                    <TabsTrigger key={platform} value={platform} className="flex-shrink-0 capitalize">
                      {platform}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="new" className="flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Draft Preview */}
            {currentAsset && filteredDrafts.length > 0 ? (
              <div className="space-y-4">
                {currentDrafts.map((draft: any) => (
                  <div key={draft.id} className="space-y-4">
                    <DraftPreview
                      draft={draft}
                      assetImage={currentAsset?.s3Url}
                      editContent={draft.content}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveDraft(draft.id)}
                        className="flex-1"
                      >
                        Approve
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Feedback
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
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
