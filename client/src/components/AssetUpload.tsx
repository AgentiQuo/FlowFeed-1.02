import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";

interface AssetUploadProps {
  brandId: string;
  onUploadSuccess?: () => void;
}

export default function AssetUpload({ brandId, onUploadSuccess }: AssetUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.ingestion.uploadImage.useMutation();
  const utils = trpc.useUtils();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    for (const file of selectedFiles) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const current = prev[file.name] || 0;
            if (current < 90) {
              return { ...prev, [file.name]: current + Math.random() * 30 };
            }
            return prev;
          });
        }, 200);

        const buffer = await file.arrayBuffer();
        await uploadMutation.mutateAsync({
          brandId,
          fileName: file.name,
          fileBuffer: new Uint8Array(buffer),
          mimeType: file.type,
          categoryId: "default",
        } as any);

        clearInterval(progressInterval);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));

        setTimeout(() => {
          setSelectedFiles((prev) => prev.filter((f) => f.name !== file.name));
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 800);
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    // Refetch assets after upload completes
    await utils.ingestion.listAssets.invalidate({ brandId });
    onUploadSuccess?.();
  };

  const hasFiles = selectedFiles.length > 0;
  const hasProgress = Object.keys(uploadProgress).length > 0;

  return (
    <Card className="border-dashed">
      <div className="p-6 space-y-4">
        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Drag & drop images here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to select files</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            Select Files
          </Button>
        </div>

        {/* Selected Files List */}
        {hasFiles && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadProgress[file.name] !== undefined && (
                      <Progress
                        value={uploadProgress[file.name]}
                        className="mt-1 h-1"
                      />
                    )}
                  </div>
                  {!uploadProgress[file.name] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {hasFiles && !hasProgress && (
          <Button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""}`
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
