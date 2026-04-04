import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformPreviewConfig, getTruncatedText } from "@/lib/platformPreview";

interface DraftPreviewProps {
  draft: any;
  assetImage?: string | null;
}

export function DraftPreview({
  draft,
  assetImage,
}: DraftPreviewProps) {
  const previewConfig = getPlatformPreviewConfig(draft.platform);
  const truncatedText = getTruncatedText(draft.content, previewConfig.maxTextLines, 60);

  // Show full-size preview without scaling
  const previewWidth = previewConfig.width;
  const previewHeight = previewConfig.height;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Platform Preview */}
          <div className="flex flex-col items-center">
            {previewConfig.textPosition === "bottom" ? (
              // Text below image layout
              <div className={`${previewConfig.backgroundColor} rounded-lg border border-border overflow-hidden`}>
                {/* Image container */}
                <div
                  style={{
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                    overflow: "hidden",
                  }}
                >
                  {assetImage && (
                    <img
                      src={assetImage}
                      alt="Asset"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Text below image */}
                <div className={`${previewConfig.padding} ${previewConfig.textColor}`}>
                  <p className={`${previewConfig.fontSize} font-medium whitespace-pre-wrap line-clamp-${previewConfig.maxTextLines}`}>
                    {truncatedText}
                  </p>
                </div>
              </div>
            ) : (
              // Overlay or center text layout
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
                {/* Text Overlay or Center */}
                <div
                  className={`absolute inset-0 ${previewConfig.padding} flex flex-col ${
                    previewConfig.textPosition === "center"
                      ? "justify-center"
                      : "justify-between"
                  } bg-black/40`}
                >
                  <div className={`${previewConfig.fontSize} font-medium whitespace-pre-wrap line-clamp-${previewConfig.maxTextLines}`}>
                    {truncatedText}
                  </div>
                </div>
              </div>
            )}
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
