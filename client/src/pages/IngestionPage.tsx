import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useRef } from "react";
import { Upload, Link2, Loader2, CheckCircle, AlertCircle } from "lucide-react";

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
          <AssetsListSection assets={assets} />
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (e.dataTransfer.files && e.dataTransfer.files[0] && selectedCategory) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${file.name}-${Date.now()}`;

      // In a real implementation, you would:
      // 1. Read the file as a buffer
      // 2. Call trpc.ingestion.uploadImage with the buffer
      // 3. Update progress as the upload completes

      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
    }

    onSuccess();
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
          >
            <option value="">Choose a category...</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="space-y-2">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="font-medium">Drag images here or click to browse</p>
            <p className="text-sm text-muted-foreground">Supports JPG, PNG, WebP</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
        </div>

        {Object.entries(uploadProgress).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Upload Progress</h3>
            {Object.entries(uploadProgress).map(([fileId, progress]) => (
              <div key={fileId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{fileId.split("-")[0]}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
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
  const [isProcessing, setIsProcessing] = useState(false);
  const createAssetMutation = trpc.ingestion.createAssetFromUrl.useMutation();
  const scrapeMutation = trpc.ingestion.scrapeListingMetadata.useMutation();

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !selectedCategory) return;

    setIsProcessing(true);
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
      onSuccess();
    } catch (error) {
      console.error("Failed to add URL:", error);
    } finally {
      setIsProcessing(false);
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
              required
            />
          </div>

          <Button type="submit" disabled={isProcessing || !url || !selectedCategory}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
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

function AssetsListSection({ assets }: { assets?: any[] }) {
  if (!assets || assets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 text-center">
          <p className="text-muted-foreground">No assets yet. Upload images or add URLs to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {assets.map((asset) => (
        <Card key={asset.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{asset.fileName}</CardTitle>
                <CardDescription>{asset.mimeType}</CardDescription>
              </div>
              <StatusBadge status={asset.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {asset.extractedMetadata && (
              <div className="bg-muted p-3 rounded-md space-y-1">
                <p className="font-medium">Extracted Metadata:</p>
                {Object.entries(asset.extractedMetadata).map(([key, value]: [string, any]) => (
                  <p key={key} className="text-muted-foreground">
                    <span className="font-medium">{key}:</span> {String(value)}
                  </p>
                ))}
              </div>
            )}
            <p className="text-muted-foreground">
              Created {new Date(asset.createdAt).toLocaleDateString()}
            </p>
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
