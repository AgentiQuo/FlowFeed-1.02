import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, AlertCircle, CheckCircle, XCircle, Loader } from "lucide-react";
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
import { useParams, useLocation } from "wouter";

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

interface BrandGuides {
  copywritingGuide: string;
  imageGenerationGuide: string;
}

export default function BrandSettingsPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [, setLocation] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isSavingGuides, setIsSavingGuides] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<Record<string, { verified: boolean; error?: string }>>({});
  const [scopeStatus, setScopeStatus] = useState<Record<string, any>>({});
  const [checkingScopesPlatform, setCheckingScopesPlatform] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, CredentialForm>>({});
  const [guides, setGuides] = useState<BrandGuides>({
    copywritingGuide: "",
    imageGenerationGuide: "",
  });
  const [brandName, setBrandName] = useState("");

  // Fetch all brands to get current brand
  const { data: allBrands = [] } = trpc.brands.list.useQuery();
  const brand = allBrands.find((b: any) => b.id === brandId);

  // Initialize guides and name when brand is loaded
  useEffect(() => {
    if (brand) {
      setGuides({
        copywritingGuide: brand.copywritingGuide || "",
        imageGenerationGuide: brand.imageGenerationGuide || "",
      });
      setBrandName(brand.name || "");
    }
  }, [brand?.id]);



  // Check Instagram token scopes
  const checkInstagramScopes = async (platform: string) => {
    if (platform !== "instagram") return;
    
    setCheckingScopesPlatform(platform);
    try {
      const result = await (trpc.brandCredentials.checkInstagramScopes as any).query({
        brandId: brandId || "",
      });
      setScopeStatus(prev => ({
        ...prev,
        [platform]: result
      }));
    } catch (error: any) {
      setScopeStatus(prev => ({
        ...prev,
        [platform]: { hasRequiredScopes: false, scopes: [], missingScopes: [], error: error.message }
      }));
    } finally {
      setCheckingScopesPlatform(null);
    }
  };

  // Fetch existing credentials
  const { data: existingCredentials = [] } = trpc.brandCredentials.list.useQuery(
    { brandId: brandId || "" }
  );

  // Initialize credentials from existing data
  useEffect(() => {
    if (existingCredentials && existingCredentials.length > 0) {
      const credentialsMap: Record<string, CredentialForm> = {};
      existingCredentials.forEach((cred: any) => {
        const credData = JSON.parse(cred.credentials || "{}");
        credentialsMap[cred.platform] = {
          platform: cred.platform,
          accountId: cred.accountId || "",
          accountName: cred.accountName || "",
          accountEmail: cred.accountEmail || "",
          accessToken: credData.accessToken ? "••••••••••••••••••••" : "",
          accessTokenSecret: credData.accessTokenSecret ? "••••••••••••••••••••" : "",
          apiKey: credData.apiKey ? "••••••••••••••••••••" : "",
          apiSecret: credData.apiSecret ? "••••••••••••••••••••" : "",
          bearerToken: credData.bearerToken ? "••••••••••••••••••••" : "",
        };
      });
      setCredentials(credentialsMap);
    }
  }, [existingCredentials]);


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

  const updateBrandGuidesMutation = trpc.brands.update.useMutation({
    onSuccess: () => {
      toast.success("Brand guides updated successfully");
      setIsSavingGuides(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
      setIsSavingGuides(false);
    },
  });

  const updateBrandNameMutation = trpc.brands.update.useMutation({
    onSuccess: () => {
      toast.success("Brand name updated successfully");
      setIsSavingName(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
      setIsSavingName(false);
    },
  });

  const verifyCredentialsMutation = trpc.brandCredentials.verify.useMutation({
    onSuccess: (result: any) => {
      setIsVerifying(null);
      const platform = result.platform || Object.keys(credentials)[0];
      setVerificationStatus((prev) => ({
        ...prev,
        [platform]: { verified: result.verified, error: result.error },
      }));
      if (result.verified) {
        toast.success(`${platform} credentials verified successfully`);
      } else {
        toast.error(`Verification failed: ${result.error}`);
      }
    },
    onError: (error: any) => {
      setIsVerifying(null);
      toast.error(`Verification error: ${error.message}`);
    },
  });

  const handleVerifyCredentials = async (platform: "instagram" | "x" | "linkedin" | "facebook" | "website") => {
    setIsVerifying(platform);
    try {
      await verifyCredentialsMutation.mutateAsync({
        brandId: brandId || "",
        platform,
      });
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

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

  const handleSaveGuides = async () => {
    setIsSavingGuides(true);
    try {
      await updateBrandGuidesMutation.mutateAsync({
        id: brandId || "",
        copywritingGuide: guides.copywritingGuide,
        imageGenerationGuide: guides.imageGenerationGuide,
      });
    } catch (error) {
      console.error("Error saving guides:", error);
    }
  };

  const handleSaveBrandName = async () => {
    if (!brandName.trim()) {
      toast.error("Brand name cannot be empty");
      return;
    }
    if (brandName.length > 20) {
      toast.error("Brand name must be 20 characters or less");
      return;
    }
    setIsSavingName(true);
    try {
      await updateBrandNameMutation.mutateAsync({
        id: brandId || "",
        name: brandName,
      });
    } catch (error) {
      console.error("Error saving brand name:", error);
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

  const handleGuideChange = (field: keyof BrandGuides, value: string) => {
    setGuides((prev) => ({
      ...prev,
      [field]: value,
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Brand Settings</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 max-w-xs">
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value.slice(0, 20))}
                  placeholder="Brand name"
                  maxLength={20}
                  className="text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSaveBrandName}
                disabled={isSavingName || brandName === brand?.name}
                variant={brandName === brand?.name ? "outline" : "default"}
              >
                {isSavingName ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground ml-2">{brandName.length}/20</span>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Configure your social media credentials and brand marketing guides. Credentials are encrypted and guides are used to personalize AI-generated content.
          </AlertDescription>
        </Alert>

        {/* Main Tabs */}
        <Tabs defaultValue="credentials" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="credentials">Social Media Accounts</TabsTrigger>
            <TabsTrigger value="guides">Brand Guides</TabsTrigger>
          </TabsList>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4">
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

                      {/* Scope Validator for Instagram */}
                      {platform.id === "instagram" && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-blue-900">API Permissions</p>
                              <p className="text-xs text-blue-700 mt-1">
                                {scopeStatus[platform.id]?.hasRequiredScopes 
                                  ? "✓ All required permissions granted"
                                  : "⚠ Missing permissions"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => checkInstagramScopes(platform.id)}
                              disabled={checkingScopesPlatform === platform.id}
                            >
                              {checkingScopesPlatform === platform.id ? (
                                <>
                                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                                  Checking...
                                </>
                              ) : (
                                "Check Permissions"
                              )}
                            </Button>
                          </div>
                          
                          {scopeStatus[platform.id] && (
                            <div className="mt-3 space-y-2 text-sm">
                              {scopeStatus[platform.id].scopes?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-green-700">Granted Scopes:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {scopeStatus[platform.id].scopes.map((scope: string) => (
                                      <Badge key={scope} className="bg-green-100 text-green-800 text-xs">
                                        ✓ {scope}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {scopeStatus[platform.id].missingScopes?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-red-700">Missing Scopes:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {scopeStatus[platform.id].missingScopes.map((scope: string) => (
                                      <Badge key={scope} className="bg-red-100 text-red-800 text-xs">
                                        ✗ {scope}
                                      </Badge>
                                    ))}
                                  </div>
                                  <p className="text-xs text-red-600 mt-2">
                                    To fix this, regenerate your Instagram access token with the required permissions in the Instagram App Dashboard.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

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

                        {/* Verification Status */}
                        {verificationStatus[platform.id] && (
                          <div className="pt-2">
                            {verificationStatus[platform.id].verified ? (
                              <div className="flex items-center gap-2 text-green-600 text-sm">
                                <CheckCircle className="h-4 w-4" />
                                <span>Credentials verified successfully</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-600 text-sm">
                                <XCircle className="h-4 w-4" />
                                <span>{verificationStatus[platform.id].error || "Verification failed"}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Save and Verify Buttons */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={() => handleSaveCredentials(platform.id)}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Credentials"}
                          </Button>
                          <Button
                            onClick={() => handleVerifyCredentials(platform.id)}
                            disabled={isVerifying === platform.id || !credentials[platform.id]?.accessToken}
                            variant="outline"
                          >
                            {isVerifying === platform.id ? (
                              <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              "Verify Credentials"
                            )}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Guides Tab */}
          <TabsContent value="guides" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Brand Marketing Guides</CardTitle>
                <CardDescription>
                  Define your brand voice and visual identity for AI-generated content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Copywriting Guide */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Copywriting Guide</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Define your brand's language, tone of voice, style, and content focus. This guides AI copywriting for all platforms.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="copywritingGuide">Copywriting Guidelines</Label>
                    <Textarea
                      id="copywritingGuide"
                      placeholder="Example: We use conversational, friendly language with a focus on practical benefits. Avoid jargon and corporate speak. Include emojis sparingly. Focus on storytelling and customer success. Always include a clear call-to-action."
                      value={guides.copywritingGuide}
                      onChange={(e) => handleGuideChange("copywritingGuide", e.target.value)}
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include details about: language style, tone, vocabulary, brand personality, content themes, and any specific guidelines
                    </p>
                  </div>
                </div>

                {/* Image Generation Guide */}
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Image Generation Guide</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Describe your visual identity, color palette, and design preferences for AI-generated images.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageGenerationGuide">Visual Identity Guidelines</Label>
                    <Textarea
                      id="imageGenerationGuide"
                      placeholder="Example: Modern, minimalist aesthetic. Primary colors: navy blue (#1e3a8a) and gold (#fbbf24). Secondary colors: light gray (#f3f4f6). Use clean typography, lots of white space. Include lifestyle photography with diverse people. Avoid stock photo look - prefer authentic, candid moments."
                      value={guides.imageGenerationGuide}
                      onChange={(e) => handleGuideChange("imageGenerationGuide", e.target.value)}
                      className="min-h-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Include details about: color palette (with hex codes), visual style, design elements, photography style, and any specific preferences
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSaveGuides}
                    disabled={isSavingGuides}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingGuides ? "Saving..." : "Save Brand Guides"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
