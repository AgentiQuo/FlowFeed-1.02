import { useState, useRef, useEffect } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AssetUploadProps {
  brandId: string;
  onUploadSuccess?: () => void;
}

export default function AssetUpload({ brandId, onUploadSuccess }: AssetUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, { progress: number; status: 'uploading' | 'success' | 'error' }>>({});
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
    uploadFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    // Initialize upload state for all files
    const newUploads: Record<string, { progress: number; status: 'uploading' | 'success' | 'error' }> = {};
    files.forEach((file) => {
      newUploads[file.name] = { progress: 0, status: 'uploading' };
    });
    setUploadingFiles((prev) => ({ ...prev, ...newUploads }));

    // Upload each file
    for (const file of files) {
      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) => {
            const current = prev[file.name]?.progress || 0;
            if (current < 90) {
              return {
                ...prev,
                [file.name]: {
                  ...prev[file.name],
                  progress: current + Math.random() * 30,
                },
              };
            }
            return prev;
          });
        }, 200);

        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadMutation.mutateAsync({
          brandId,
          fileName: file.name,
          fileBase64: base64,
          mimeType: file.type,
          categoryId: "default",
        });

        clearInterval(progressInterval);
        
        // Mark as success
        setUploadingFiles((prev) => ({
          ...prev,
          [file.name]: { progress: 100, status: 'success' },
        }));

        toast.success(`${file.name} uploaded successfully`);

        // Remove from list after delay
        setTimeout(() => {
          setUploadingFiles((prev) => {
            const newState = { ...prev };
            delete newState[file.name];
            return newState;
          });
        }, 2000);
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadingFiles((prev) => ({
          ...prev,
          [file.name]: { progress: 0, status: 'error' },
        }));
        toast.error(`Failed to upload ${file.name}`);

        // Remove from list after delay
        setTimeout(() => {
          setUploadingFiles((prev) => {
            const newState = { ...prev };
            delete newState[file.name];
            return newState;
          });
        }, 3000);
      }
    }

    // Refetch assets after all uploads complete
    await utils.ingestion.listAssets.invalidate({ brandId });
    
    // Check if all uploads succeeded
    const allSucceeded = files.every((file) => uploadingFiles[file.name]?.status === 'success');
    if (allSucceeded && files.length > 0) {
      onUploadSuccess?.();
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasUploads = Object.keys(uploadingFiles).length > 0;

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

        {/* Upload Progress List */}
        {hasUploads && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Uploading files...</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(uploadingFiles).map(([fileName, { progress, status }]) => (
                <div key={fileName} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm truncate font-medium">{fileName}</p>
                      {status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      {status === 'error' && (
                        <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    {status === 'uploading' && (
                      <Progress value={progress} className="mt-1 h-1" />
                    )}
                    {status === 'success' && (
                      <p className="text-xs text-green-600">Upload complete</p>
                    )}
                    {status === 'error' && (
                      <p className="text-xs text-red-600">Upload failed</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state message */}
        {!hasUploads && (
          <p className="text-xs text-muted-foreground text-center">
            Files will upload automatically after selection
          </p>
        )}
      </div>
    </Card>
  );
}
