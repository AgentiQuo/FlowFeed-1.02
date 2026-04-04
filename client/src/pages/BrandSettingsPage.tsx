import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

const PLATFORMS = [
  { id: "instagram" as const, name: "Instagram", icon: "📷", color: "bg-pink-100 text-pink-800" },
  { id: "x" as const, name: "X (Twitter)", icon: "𝕏", color: "bg-gray-100 text-gray-800" },
  { id: "linkedin" as const, name: "LinkedIn", icon: "💼", color: "bg-blue-100 text-blue-800" },
  { id: "facebook" as const, name: "Facebook", icon: "f", color: "bg-blue-50 text-blue-700" },
];

interface CredentialForm {
  platform: string;
  accountId: string;
  accountName: string;
  accountEmail: string;
  accessToken: string;
  accessTokenSecret?: string;
  apiKey?: string;
  apiSecret?: string;
  bearerToken?: string;
}

export default function BrandSettingsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, CredentialForm>>({});

  // Fetch all brands to get current brand
  const { data: allBrands = [] } = trpc.brands.list.useQuery();
  const brand = allBrands.find((b: any) => b.id === brandId);

  // Fetch existing credentials
  const { data: existingCredentials = [] } = trpc.brandCredentials.list.useQuery(
    { brandId: brandId || "" }
  );

  // Mutations
  const saveCredentialsMutation = trpc.brandCredentials.save.useMutation({
    onSuccess: () => {
      toast.success("Credentials saved successfully");
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
      setIsSaving(false);
    },
  });

  const handleSaveCredentials = async (platform: "instagram" | "x" | "linkedin" | "facebook" | "website") => {
    setIsSaving(true);
    const cred = credentials[platform];
    if (!cred || !cred.accessToken) {
      toast.error("Please fill in all required fields");
      setIsSaving(false);
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync({
        brandId: brandId || "",
        platform,
        accountId: cred.accountId,
        accountName: cred.accountName,
        accountEmail: cred.accountEmail,
        credentials: {
          accessToken: cred.accessToken,
          accessTokenSecret: cred.accessTokenSecret,
          apiKey: cred.apiKey,
          apiSecret: cred.apiSecret,
          bearerToken: cred.bearerToken,
        },
      });
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const handleInputChange = (platform: string, field: string, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const getCredentialStatus = (platform: string) => {
    const existing = existingCredentials.find((c: any) => c.platform === platform);
    return existing?.verificationStatus || "pending";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation(`/dashboard/brand/${brandId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Brand Settings</h1>
            <p className="text-muted-foreground">{brand?.name}</p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure your social media account credentials here. Your credentials are securely encrypted and only used for publishing posts.
          </AlertDescription>
        </Alert>

        {/* Credentials Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Accounts</CardTitle>
            <CardDescription>
              Add and manage credentials for each platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="instagram" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                {PLATFORMS.map((platform) => (
                  <TabsTrigger key={platform.id} value={platform.id} className="flex items-center gap-2">
                    <span>{platform.icon}</span>
                    <span className="hidden sm:inline">{platform.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {PLATFORMS.map((platform) => (
                <TabsContent key={platform.id} value={platform.id} className="space-y-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">{platform.name} Credentials</h3>
                    <Badge className={getCredentialStatus(platform.id) === "verified" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {getCredentialStatus(platform.id)}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {/* Account Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${platform.id}-accountId`}>Account ID</Label>
                        <Input
                          id={`${platform.id}-accountId`}
                          placeholder="e.g., 123456789"
                          value={credentials[platform.id]?.accountId || ""}
                          onChange={(e) =>
                            handleInputChange(platform.id, "accountId", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${platform.id}-accountName`}>Account Name</Label>
                        <Input
                          id={`${platform.id}-accountName`}
                          placeholder="e.g., @myaccount"
                          value={credentials[platform.id]?.accountName || ""}
                          onChange={(e) =>
                            handleInputChange(platform.id, "accountName", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${platform.id}-accountEmail`}>Account Email</Label>
                      <Input
                        id={`${platform.id}-accountEmail`}
                        type="email"
                        placeholder="account@example.com"
                        value={credentials[platform.id]?.accountEmail || ""}
                        onChange={(e) =>
                          handleInputChange(platform.id, "accountEmail", e.target.value)
                        }
                      />
                    </div>

                    {/* Platform-specific credentials */}
                    {platform.id === "instagram" && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-accessToken`}>Access Token *</Label>
                          <Input
                            id={`${platform.id}-accessToken`}
                            type="password"
                            placeholder="Your Instagram Access Token"
                            value={credentials[platform.id]?.accessToken || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "accessToken", e.target.value)
                            }
                          />
                          <p className="text-xs text-gray-500">Required for posting to Instagram</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-apiSecret`}>App Secret</Label>
                          <Input
                            id={`${platform.id}-apiSecret`}
                            type="password"
                            placeholder="Your Instagram App Secret"
                            value={credentials[platform.id]?.apiSecret || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "apiSecret", e.target.value)
                            }
                          />
                          <p className="text-xs text-gray-500">Optional - used for token refresh</p>
                        </div>
                      </div>
                    )}

                    {platform.id === "x" && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-apiKey`}>API Key *</Label>
                          <Input
                            id={`${platform.id}-apiKey`}
                            type="password"
                            placeholder="X API Key"
                            value={credentials[platform.id]?.apiKey || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "apiKey", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-apiSecret`}>API Secret *</Label>
                          <Input
                            id={`${platform.id}-apiSecret`}
                            type="password"
                            placeholder="X API Secret"
                            value={credentials[platform.id]?.apiSecret || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "apiSecret", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-bearerToken`}>Bearer Token *</Label>
                          <Input
                            id={`${platform.id}-bearerToken`}
                            type="password"
                            placeholder="X Bearer Token"
                            value={credentials[platform.id]?.bearerToken || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "bearerToken", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}

                    {platform.id === "linkedin" && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-accessToken`}>Access Token *</Label>
                          <Input
                            id={`${platform.id}-accessToken`}
                            type="password"
                            placeholder="LinkedIn Access Token"
                            value={credentials[platform.id]?.accessToken || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "accessToken", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}

                    {platform.id === "facebook" && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${platform.id}-accessToken`}>Access Token *</Label>
                          <Input
                            id={`${platform.id}-accessToken`}
                            type="password"
                            placeholder="Facebook Access Token"
                            value={credentials[platform.id]?.accessToken || ""}
                            onChange={(e) =>
                              handleInputChange(platform.id, "accessToken", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => handleSaveCredentials(platform.id)}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Credentials"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
