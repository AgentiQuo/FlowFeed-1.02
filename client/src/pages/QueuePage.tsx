import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Calendar, Clock, Trash2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DraftPreview } from "@/components/DraftPreview";

export default function QueuePage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [schedulingDraftId, setSchedulingDraftId] = useState<string | null>(null);
  const [schedulingDate, setSchedulingDate] = useState<string>("");
  const [schedulingTime, setSchedulingTime] = useState<string>("09:00");
  const [batchSchedulingDate, setBatchSchedulingDate] = useState<string>("");
  const [batchSchedulingTime, setBatchSchedulingTime] = useState<string>("09:00");
  const [batchSchedulingInterval, setBatchSchedulingInterval] = useState<number>(1); // hours between posts

  // Fetch approved drafts for current brand
  const { data: approvedDrafts = [], isLoading: isLoadingDrafts, refetch: refetchDrafts } = trpc.content.getApprovedDrafts.useQuery(
    { brandId: brandId || "" },
    { enabled: !!brandId }
  );

  // Fetch all assets for images
  const { data: allAssets = [] } = trpc.ingestion.listAssets.useQuery({ brandId: "" });

  // Derive asset images
  const assetImages = useMemo(() => {
    const images: Record<string, string> = {};
    allAssets.forEach((asset) => {
      if (asset.s3Url) {
        images[asset.id] = asset.s3Url;
      }
    });
    return images;
  }, [allAssets]);

  // Mutations
  const addToQueueMutation = trpc.queue.addToQueue.useMutation({
    onSuccess: () => {
      toast.success("Post added to queue");
      setSchedulingDraftId(null);
      setSchedulingDate("");
      setSchedulingTime("09:00");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to schedule: ${error.message}`);
    },
  });

  const removeMutation = trpc.queue.removeFromQueue.useMutation({
    onSuccess: () => {
      toast.success("Post removed from queue");
      refetchDrafts();
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const handleScheduleSingle = async () => {
    if (!schedulingDraftId || !schedulingDate || !schedulingTime) {
      toast.error("Please fill in all fields");
      return;
    }

    const dateTime = new Date(`${schedulingDate}T${schedulingTime}`);
    const draft = approvedDrafts.find((d: any) => d.id === schedulingDraftId);
    if (!draft) return;
    await addToQueueMutation.mutateAsync({
      brandId: brandId || "",
      draftId: schedulingDraftId,
      platforms: [draft.platform],
      scheduledAt: dateTime,
    });
  };

  const handleScheduleBatch = async () => {
    if (selectedDrafts.size === 0 || !batchSchedulingDate || !batchSchedulingTime) {
      toast.error("Please select posts and fill in scheduling details");
      return;
    }

    let currentTime = new Date(`${batchSchedulingDate}T${batchSchedulingTime}`);
    const draftsArray = Array.from(selectedDrafts);

    for (const draftId of draftsArray) {
      const draft = approvedDrafts.find((d: any) => d.id === draftId);
      if (!draft) continue;
      await addToQueueMutation.mutateAsync({
        brandId: brandId || "",
        draftId,
        platforms: [draft.platform],
        scheduledAt: currentTime,
      });
      // Add interval for next post
      currentTime = new Date(currentTime.getTime() + batchSchedulingInterval * 60 * 60 * 1000);
    }

    setSelectedDrafts(new Set());
    setBatchSchedulingDate("");
    setBatchSchedulingTime("09:00");
    setBatchSchedulingInterval(1);
    toast.success(`${draftsArray.length} posts scheduled successfully`);
  };

  const toggleDraftSelection = (draftId: string) => {
    const newSelected = new Set(selectedDrafts);
    if (newSelected.has(draftId)) {
      newSelected.delete(draftId);
    } else {
      newSelected.add(draftId);
    }
    setSelectedDrafts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDrafts.size === approvedDrafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(approvedDrafts.map((d: any) => d.id)));
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: "bg-pink-100 text-pink-800",
      linkedin: "bg-blue-100 text-blue-800",
      facebook: "bg-blue-50 text-blue-700",
      x: "bg-gray-100 text-gray-800",
      website: "bg-purple-100 text-purple-800",
    };
    return colors[platform] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduling Queue</h1>
          <p className="text-muted-foreground mt-2">
            Schedule approved posts for publication across platforms
          </p>
        </div>
      </div>

      {/* Batch Scheduling Section */}
      {selectedDrafts.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Batch Schedule {selectedDrafts.size} Posts
            </CardTitle>
            <CardDescription>Schedule multiple posts with automatic time intervals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={batchSchedulingDate}
                  onChange={(e) => setBatchSchedulingDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={batchSchedulingTime}
                  onChange={(e) => setBatchSchedulingTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Interval (hours)</label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={batchSchedulingInterval}
                  onChange={(e) => setBatchSchedulingInterval(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleScheduleBatch}
                  disabled={addToQueueMutation.isPending}
                  className="w-full"
                >
                  {addToQueueMutation.isPending ? "Scheduling..." : "Schedule All"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Drafts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Approved Posts ({approvedDrafts.length})</CardTitle>
              <CardDescription>Ready to be scheduled for publication</CardDescription>
            </div>
            {approvedDrafts.length > 0 && (
              <Button
                variant={selectedDrafts.size === approvedDrafts.length ? "default" : "outline"}
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedDrafts.size === approvedDrafts.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDrafts ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : approvedDrafts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No approved posts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create and approve posts in the Dashboard to schedule them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedDrafts.map((draft: any) => (
                <div
                  key={draft.id}
                  className={`p-4 border rounded-lg transition-all ${
                    selectedDrafts.has(draft.id) ? "bg-blue-50 border-blue-300" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedDrafts.has(draft.id)}
                      onChange={() => toggleDraftSelection(draft.id)}
                      className="mt-2"
                    />

                    {/* Preview */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPlatformColor(draft.platform)}>
                              {draft.platform}
                            </Badge>
                            <Badge variant="secondary">Approved</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{draft.content}</p>
                        </div>

                        {/* Asset Image */}
                        {draft.assetId && assetImages[draft.assetId] && (
                          <div className="flex-shrink-0">
                            <img
                              src={assetImages[draft.assetId]}
                              alt="Asset"
                              className="w-20 h-20 object-cover rounded border border-border"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSchedulingDraftId(draft.id);
                              setSchedulingDate("");
                              setSchedulingTime("09:00");
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Schedule Post</DialogTitle>
                            <DialogDescription>
                              Choose when to publish this {draft.platform} post
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Date</label>
                              <Input
                                type="date"
                                value={schedulingDate}
                                onChange={(e) => setSchedulingDate(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Time</label>
                              <Input
                                type="time"
                                value={schedulingTime}
                                onChange={(e) => setSchedulingTime(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={handleScheduleSingle}
                                disabled={addToQueueMutation.isPending}
                                className="flex-1"
                              >
                                {addToQueueMutation.isPending ? "Scheduling..." : "Schedule"}
                              </Button>
                              <DialogClose asChild>
                                <Button variant="outline" className="flex-1">
                                  Cancel
                                </Button>
                              </DialogClose>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate({ postId: draft.id })}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
