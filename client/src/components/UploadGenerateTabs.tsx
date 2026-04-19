import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import AssetUpload from "@/components/AssetUpload";

interface UploadGenerateTabsProps {
  brandId: string;
  onUploadSuccess?: () => void;
  onGeneratePromptChange?: (prompt: string) => void;
  onActiveTabChange?: (tab: string) => void;
}

export default function UploadGenerateTabs({
  brandId,
  onUploadSuccess,
  onGeneratePromptChange,
  onActiveTabChange,
}: UploadGenerateTabsProps) {
  const [activeTab, setActiveTab] = useState("upload");
  const [generatePrompt, setGeneratePrompt] = useState("");

  const handlePromptChange = (value: string) => {
    setGeneratePrompt(value);
    onGeneratePromptChange?.(value);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onActiveTabChange?.(tab);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="generate">Generate</TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-4">
        <AssetUpload brandId={brandId} onUploadSuccess={onUploadSuccess} />
      </TabsContent>

      <TabsContent value="generate" className="mt-4 space-y-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Describe the image you want to generate…"
            value={generatePrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            className="min-h-32 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This prompt will be used to generate an AI image using your brand's image-style settings.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
