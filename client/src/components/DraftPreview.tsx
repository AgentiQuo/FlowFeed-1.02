import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, Send, Trash2 } from "lucide-react";
import { getPlatformPreviewConfig, getTruncatedText } from "@/lib/platformPreview";
import { toast } from "sonner";

interface DraftPreviewProps {
  draft: any;
  assetImage?: string | null;
  isQueued?: boolean;
  isEditing?: boolean;
  editContent?: string;
  onEditChange?: (content: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onStartEdit?: () => void;
  onCopy?: () => void;
  onExport?: () => void;
  onQueue?: () => void;
  onRemove?: () => void;
  isPublishing?: boolean;
  isMovingToQueue?: boolean;
  isRemoving?: boolean;
}

export function DraftPreview({
  draft,
  assetImage,
  isQueued,
  isEditing,
  editContent,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onCopy,
  onExport,
  onQueue,
  onRemove,
  isPublishing,
  isMovingToQueue,
  isRemoving,
}: DraftPreviewProps) {
  const previewConfig = getPlatformPreviewConfig(draft.platform);
  const truncatedText = getTruncatedText(draft.content, previewConfig.maxTextLines, 60);

  // Calculate responsive width (max 600px, min 300px)
  const previewWidth = Math.min(600, Math.max(300, previewConfig.width / 2));
  const previewHeight = (previewWidth / previewConfig.width) * previewConfig.height;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Platform Preview */}
          <div className="flex flex-col items-center">
            <div
              className={`relative ${previewConfig.backgroundColor} ${previewConfig.textColor} rounded-lg border border-border overflow-hidden flex items-center justify-center`}
              style={{
                width: `${previewWidth}px`,
                height: `${previewHeight}px`,
              }}
            >
              {assetImage && (
                <img
                  src={assetImage}
                  alt="Asset"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {/* Text Overlay */}
              <div
                className={`absolute inset-0 ${previewConfig.padding} flex flex-col ${
                  previewConfig.textPosition === "center"
                    ? "justify-center"
                    : previewConfig.textPosition === "bottom"
                      ? "justify-end"
                      : "justify-between"
                } bg-black/40`}
              >
                <div className={`${previewConfig.fontSize} font-medium whitespace-pre-wrap line-clamp-${previewConfig.maxTextLines}`}>
                  {truncatedText}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {previewConfig.width}x{previewConfig.height}px
            </div>
          </div>

          {/* Draft Header with Platform and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="capitalize">{draft.platform}</Badge>
              <Badge variant={draft.status === "reviewed" ? "default" : "secondary"}>
                {draft.status === "draft" && "Draft"}
                {draft.status === "reviewed" && "Approved"}
                {draft.status === "published" && "Published"}
              </Badge>
              {isQueued && (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  ✓ Queued
                </Badge>
              )}
            </div>
          </div>

          {/* Draft Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent || ""}
                onChange={(e) => onEditChange?.(e.target.value)}
                placeholder="Edit draft content"
                className="min-h-24"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm line-clamp-3 text-foreground">{draft.content}</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {!isEditing && (
              <>
                <Button size="sm" variant="outline" onClick={onStartEdit}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={onCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={onExport}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={onQueue}
                  disabled={isMovingToQueue || isQueued}
                  className={isQueued ? "opacity-50" : ""}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {isMovingToQueue ? "Queueing..." : isQueued ? "Queued" : "Queue"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRemove}
                  disabled={isRemoving}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
