import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ExternalLink, Calendar, Heart, MessageCircle, Share2, Eye, TrendingUp } from "lucide-react";
import { getPlatformAbbr } from "@/lib/platformNames";

export default function PublishedPostsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [, setLocation] = useLocation();
  const [selectedPlatform, setSelectedPlatform] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Auto-select last used brand on first load
  useEffect(() => {
    if (!brandId) {
      const lastBrandId = localStorage.getItem("lastSelectedPublishedBrandId");
      if (lastBrandId) {
        setLocation(`/dashboard/published/${lastBrandId}`);
      }
    }
  }, [brandId, setLocation]);

  // Save brand selection to localStorage
  useEffect(() => {
    if (brandId) {
      localStorage.setItem("lastSelectedPublishedBrandId", brandId);
    }
  }, [brandId]);

  // Fetch all brands for filter dropdown
  const { data: allBrands = [] } = trpc.brands.list.useQuery();

  // Fetch published posts
  const { data: postsData, isLoading: isLoadingPosts } = trpc.queue.getPublishedPosts.useQuery(
    {
      brandId: brandId || "",
      platform: selectedPlatform as any,
      limit: pageSize,
      offset: currentPage * pageSize,
    },
    { enabled: !!brandId }
  );

  // Fetch analytics summary
  const { data: analyticsData } = trpc.queue.getPublishedPostsAnalytics.useQuery(
    {
      brandId: brandId || "",
      platform: selectedPlatform as any,
    },
    { enabled: !!brandId }
  );

  const currentBrand = allBrands.find((b) => b.id === brandId);
  const posts = postsData?.posts || [];
  const totalPosts = postsData?.total || 0;
  const totalPages = Math.ceil(totalPosts / pageSize);

  const filteredPosts = posts.filter((post) =>
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "bg-pink-100 text-pink-800";
      case "facebook":
        return "bg-blue-100 text-blue-800";
      case "linkedin":
        return "bg-blue-600 text-white";
      case "x":
        return "bg-black text-white";
      case "website":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Published Posts</h1>
          <p className="text-muted-foreground">View and track all your published content across platforms</p>
        </div>

        {/* Brand Selector */}
        {brandId && currentBrand && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium">Brand:</span>
              <Badge variant="outline">{currentBrand.name}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
              >
                Change Brand
              </Button>
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalPosts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4" /> Total Impressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalImpressions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Avg: {analyticsData.averageImpressions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Engagement Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.engagementRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{analyticsData.totalEngagements} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{analyticsData.totalConversions} conversions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4 items-center">
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Tabs value={selectedPlatform || "all"} onValueChange={(v) => setSelectedPlatform(v === "all" ? undefined : v)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="instagram">IG</TabsTrigger>
              <TabsTrigger value="facebook">FB</TabsTrigger>
              <TabsTrigger value="linkedin">LI</TabsTrigger>
              <TabsTrigger value="x">X</TabsTrigger>
              <TabsTrigger value="website">Web</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {isLoadingPosts ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No published posts found</p>
                  <Button variant="outline" onClick={() => setLocation(`/dashboard/queue/${brandId}`)}>
                    Go to Queue
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Thumbnail */}
                    {post.thumbnailUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={post.thumbnailUrl}
                          alt="Post thumbnail"
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getPlatformColor(post.platform)}>
                              {getPlatformAbbr(post.platform)}
                            </Badge>
                            {post.publishedAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.publishedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold line-clamp-2 mb-2">
                            {post.title || post.content?.substring(0, 100)}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.content?.substring(0, 150)}</p>
                        </div>

                        {/* View Post Link */}
                        {post.postUrl && (
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>

                      {/* Analytics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Eye className="w-4 h-4" />
                            <span className="text-xs">Impressions</span>
                          </div>
                          <div className="font-semibold">{post.impressions || 0}</div>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">Likes</span>
                          </div>
                          <div className="font-semibold">{post.likes || 0}</div>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs">Comments</span>
                          </div>
                          <div className="font-semibold">{post.comments || 0}</div>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Share2 className="w-4 h-4" />
                            <span className="text-xs">Shares</span>
                          </div>
                          <div className="font-semibold">{post.shares || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
