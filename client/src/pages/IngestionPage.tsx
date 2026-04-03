import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useRef } from "react";
import { Upload, Link2, Loader2, CheckCircle, AlertCircle, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function IngestionPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const { data: assets, isLoading, refetch } = trpc.ingestion.listAssets.useQuery({ brandId: brandId! });
  const { data: categories } = trpc.brands.listCategories.useQuery({ brandId: brandId! });

  if (isLoading) {
    return <div className="p-6">Loading assets...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Ingestion</h1>
        <p className="text-muted-foreground mt-1">Upload images or add URLs for content generation</p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Upload Images</TabsTrigger>
          <TabsTrigger value="url">Add URL</TabsTrigger>
          <TabsTrigger value="assets">Assets ({assets?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <ImageUploadSection brandId={brandId!} categories={categories} onSuccess={refetch} />
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <URLIngestionSection brandId={brandId!} categories={categories} onSuccess={refetch} />
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <AssetsListSection assets={assets} brandId={brandId!} onDelete={refetch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImageUploadSection({
  brandId,
  categories,
  onSuccess,
}: {
  brandId: string;
  categories?: any[];
  onSuccess: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.ingestion.uploadImage.useMutation();
  const utils = trpc.useUtils();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (!selectedCategory) {
        toast.error("Please select a category first");
        return;
      }
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    for (const file of validFiles) {
      try {
        const fileId = `${file.name}-${Date.now()}`;
        setUploadProgress((prev) => ({ ...prev, [fileId]: 10 }));

        // Read file as buffer
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const current = prev[fileId] || 10;
            if (current >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [fileId]: current + Math.random() * 40 };
          });
        }, 300);

        // Upload to server
        await uploadMutation.mutateAsync({
          brandId,
          categoryId: selectedCategory,
          fileName: file.name,
          fileBuffer: uint8Array as any,
          mimeType: file.type,
        });

        clearInterval(progressInterval);
        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

        toast.success(`${file.name} uploaded successfully`);

        // Clear progress after 2 seconds
        setTimeout(() => {
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 2000);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[`${file.name}-${Date.now()}`];
          return newProgress;
        });
      }
    }

    // Refresh assets list
    await utils.ingestion.listAssets.invalidate({ brandId });
    onSuccess();
    setUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Images</CardTitle>
        <CardDescription>Drag and drop images or click to browse</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-input rounded-md"
            disabled={uploading}
          >
            <option value="">Choose a category...</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {categories && categories.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              No categories found. Create one in Brand settings first.
            </p>
          )}
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
            disabled={uploading}
          />
          <div className="space-y-2">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="font-medium">Drag images here or click to browse</p>
            <p className="text-sm text-muted-foreground">Supports JPG, PNG, WebP (max 10MB each)</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Select Files"
            )}
          </Button>
        </div>

        {Object.entries(uploadProgress).length > 0 && (
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <h3 className="text-sm font-medium">Upload Progress</h3>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{fileId.split("-")[0]}</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function URLIngestionSection({
  brandId,
  categories,
  onSuccess,
}: {
  brandId: string;
  categories?: any[];
  onSuccess: () => void;
}) {
  const [url, setUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const createAssetMutation = trpc.ingestion.createAssetFromUrl.useMutation();
  const scrapeMutation = trpc.ingestion.scrapeListingMetadata.useMutation();
  const utils = trpc.useUtils();

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !selectedCategory) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      // Create asset record
      await createAssetMutation.mutateAsync({
        brandId,
        categoryId: selectedCategory,
        url,
      });

      // Scrape metadata in background
      scrapeMutation.mutate({ url });

      setUrl("");
      setSelectedCategory("");
      await utils.ingestion.listAssets.invalidate({ brandId });
      onSuccess();
      toast.success("URL asset created successfully");
    } catch (error) {
      console.error("Failed to add URL:", error);
      toast.error("Failed to add URL asset");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add URL</CardTitle>
        <CardDescription>Paste a real estate listing URL for automatic metadata extraction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddUrl} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              disabled={createAssetMutation.isPending}
            >
              <option value="">Choose a category...</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Listing URL</label>
            <input
              type="url"
              placeholder="https://example.com/listing/property-123"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              disabled={createAssetMutation.isPending}
              required
            />
          </div>

          <Button type="submit" disabled={createAssetMutation.isPending || !url || !selectedCategory}>
            {createAssetMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Add URL
              </>
            )}
          </Button>
        </form>

        <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
          <p className="font-medium">What happens next:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>URL is added to your assets with "pending" status</li>
            <li>Metadata is extracted (price, location, bedrooms, etc.)</li>
            <li>Status updates to "completed" when ready for AI processing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetsListSection({
  assets,
  brandId,
  onDelete,
}: {
  assets?: any[];
  brandId: string;
  onDelete: () => void;
}) {
  const deleteMutation = trpc.ingestion.deleteAsset.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (assetId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ assetId });
      await utils.ingestion.listAssets.invalidate({ brandId });
      onDelete();
      toast.success("Asset deleted");
    } catch (error) {
      console.error("Failed to delete asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <p className="text-muted-foreground">No assets yet. Upload images or add URLs to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <Card key={asset.id} className="overflow-hidden flex flex-col">
          {asset.mimeType?.startsWith("image/") && (
            <div className="aspect-video bg-muted overflow-hidden">
              <img
                src={asset.s3Url}
                alt={asset.fileName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3EImage%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          )}
          <CardContent className="pt-4 flex-1 flex flex-col space-y-3">
            <div className="flex-1">
              <p className="text-sm font-medium truncate">{asset.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(2)} MB` : "URL asset"}
              </p>
              <div className="mt-2">
                <StatusBadge status={asset.status} />
              </div>
            </div>

            {asset.extractedMetadata && Object.keys(asset.extractedMetadata).length > 0 && (
              <div className="text-xs space-y-2 bg-muted p-3 rounded">
                <p className="font-semibold text-foreground">Extracted Details:</p>
                <div className="space-y-1">
                  {asset.extractedMetadata.bedrooms !== null && asset.extractedMetadata.bedrooms !== undefined && (
                    <p><span className="font-medium">Bedrooms:</span> {asset.extractedMetadata.bedrooms}</p>
                  )}
                  {asset.extractedMetadata.bathrooms !== null && asset.extractedMetadata.bathrooms !== undefined && (
                    <p><span className="font-medium">Bathrooms:</span> {asset.extractedMetadata.bathrooms}</p>
                  )}
                  {asset.extractedMetadata.squareFeet && (
                    <p><span className="font-medium">Sq Ft:</span> {asset.extractedMetadata.squareFeet}</p>
                  )}
                  {asset.extractedMetadata.propertyType && (
                    <p><span className="font-medium">Type:</span> {asset.extractedMetadata.propertyType}</p>
                  )}
                  {asset.extractedMetadata.architecturalStyle && (
                    <p><span className="font-medium">Style:</span> {asset.extractedMetadata.architecturalStyle}</p>
                  )}
                  {asset.extractedMetadata.condition && (
                    <p><span className="font-medium">Condition:</span> {asset.extractedMetadata.condition}</p>
                  )}
                </div>
                {asset.extractedMetadata.confidence && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Confidence: <span className="font-medium">{asset.extractedMetadata.confidence}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(asset.s3Url, "_blank")}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(asset.id, asset.fileName)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string; text: string }> = {
    pending: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-yellow-600", text: "Pending" },
    processing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-blue-600", text: "Processing" },
    completed: { icon: <CheckCircle className="w-4 h-4" />, color: "text-green-600", text: "Completed" },
    failed: { icon: <AlertCircle className="w-4 h-4" />, color: "text-red-600", text: "Failed" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div className={`flex items-center gap-2 ${config.color}`}>
      {config.icon}
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}
