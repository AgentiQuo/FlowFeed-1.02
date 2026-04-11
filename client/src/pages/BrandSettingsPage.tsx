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
import { trpc } from "@/lib/trpc";
import { getPlatformAbbr } from "@/lib/platformNames";

const PLATFORMS = [
  { id: "instagram" as const, name: "Instagram", icon: "📷", color: "bg-pink-100 text-pink-800" },
  { id: "x" as const, name: "X (Twitter)", icon: "𝕏", color: "bg-gray-100 text-gray-800" },
  { id: "linkedin" as const, name: "LinkedIn", icon: "💼", color: "bg-blue-100 text-blue-800" },
  { id: "facebook" as const, name: "Facebook", icon: "f", color: "bg-blue-50 text-blue-700" },
  { id: "website" as const, name: "MV Post", icon: "🌐", color: "bg-purple-100 text-purple-800" },
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
  businessAccountId?: string;
  wpUsername?: string;
  wpAppPassword?: string;
}

interface BrandGuides {
  copywritingGuide: string;
  imageGenerationGuide: string;
}

function LearningsSection({ brandId }: { brandId: string }) {
  const [learnings, setLearnings] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getLearningsQuery = trpc.learnings.get.useQuery({ brandId });
  const updateLearningsMutation = trpc.learnings.update.useMutation({
    onSuccess: () => {
      toast.success("Learnings saved successfully");
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (getLearningsQuery.data) {
      setLearnings(getLearningsQuery.data.learnings);
      setIsLoading(false);
    }
  }, [getLearningsQuery.data]);

  const handleSaveLearnings = async () => {
    setIsSaving(true);
    try {
      await updateLearningsMutation.mutateAsync({
        brandId,
        learnings,
      });
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader className="h-5 w-5 animate-spin" />
            <span className="ml-2">Loading learnings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Learnings</CardTitle>
        <CardDescription>
          Document insights and learnings about your brand to improve future content generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={learnings}
          onChange={(e) => setLearnings(e.target.value)}
          placeholder="e.g., Our audience responds well to casual tone, prefers video content, engages most with behind-the-scenes posts..."
          className="min-h-32"
        />
        <Button
          onClick={handleSaveLearnings}
          disabled={isSaving}
          className="mt-4"
        >
          {isSaving ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Learnings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
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
  const [hasInitializedCredentials, setHasInitializedCredentials] = useState(false);
  const [editedCredentialFields, setEditedCredentialFields] = useState<Record<string, Record<string, boolean>>>({});
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
      // Reset credentials initialization flag when brand changes
      setHasInitializedCredentials(false);
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

  // Initialize credentials from existing data - SIMPLIFIED (no masking)
  useEffect(() => {
    if (!hasInitializedCredentials && existingCredentials && existingCredentials.length > 0) {
      const credentialsMap: Record<string, CredentialForm> = {};

      existingCredentials.forEach((cred: any) => {
        const credData = JSON.parse(cred.credentials || "{}");
        const platform = cred.platform;

        // Show REAL values directly (no masking)
        credentialsMap[platform] = {
          platform,
          accountId: cred.accountId || "",
          accountName: cred.accountName || "",
          accountEmail: cred.accountEmail || "",
          accessToken: credData.accessToken || "",
          accessTokenSecret: credData.accessTokenSecret || "",
          apiKey: credData.apiKey || "",
          apiSecret: credData.apiSecret || "",
          bearerToken: credData.bearerToken || "",
          businessAccountId: credData.businessAccountId || "",
          wpUsername: credData.wpUsername ? "••••••••••••••••••••••••••••••••" : "",
          wpAppPassword: credData.wpAppPassword ? "••••••••••••••••••••••••••••••••" : "",
        };

        // Mark fields with saved values as "masked" (not edited)
        setEditedCredentialFields(prev => ({
          ...prev,
          [platform]: {
            accessToken: false,
            accessTokenSecret: false,
            apiKey: false,
            apiSecret: false,
            bearerToken: false,
            wpUsername: false,
            wpAppPassword: false,
          }
        }));
      });

      setCredentials(credentialsMap);
      setHasInitializedCredentials(true);
    }
  }, [hasInitializedCredentials, existingCredentials]);

  // Mutations
  const saveCredentialsMutation = trpc.brandCredentials.save.useMutation({
    onSuccess: () => {
      toast.success("Credentials saved successfully");
      setIsSaving(false);
    },
    onError: (error: any) => {
      console.error("Save credentials error:", error);
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
      const platform = isVerifying || result.platform; // Use the platform we're currently verifying
      setIsVerifying(null);
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
    setIsVerifying(platform); // Store the platform being verified
    try {
      await verifyCredentialsMutation.mutateAsync({
        brandId: brandId || "",
        platform,
      });
    } catch (error) {
      console.error("Verification error:", error);
    }
  };

  // SIMPLIFIED handleSaveCredentials - sends ALL non-empty fields
  const handleSaveCredentials = async (platform: "instagram" | "x" | "linkedin" | "facebook" | "website") => {
    setIsSaving(true);
    const cred = credentials[platform];
    
    // Validate required fields based on platform
    const requiredFields: Record<string, string[]> = {
      instagram: ["accessToken"],
      x: ["apiKey", "apiSecret", "accessToken", "accessTokenSecret"],
      linkedin: ["accessToken"],
      facebook: ["accessToken"],
      website: ["wpUsername", "wpAppPassword"],
    };
    
    const required = requiredFields[platform] || [];
    const missing = required.filter(field => {
      const value = cred?.[field as keyof typeof cred];
      // If value is masked and was NOT edited, it means it's already saved - don't require re-entry
      const wasEdited = editedCredentialFields[platform]?.[field];
      const isMasked = value === "••••••••••••••••••••••••••••••••";
      if (isMasked && !wasEdited) {
        // Already saved, no need to re-enter
        return false;
      }
      // Otherwise, require the field to have a non-empty value
      return !value;
    });
    
    if (!cred || missing.length > 0) {
      toast.error(`Please fill in all required fields: ${missing.join(", ")}`);
      setIsSaving(false);
      return;
    }

    try {
      const MASK = "••••••••••••••••••••••••••••••••";

      // Helper: only send a field if it has a real value (not masked, not empty)
      // If the field is masked AND was NOT edited by the user, skip it (keep existing DB value via merge)
      const realValue = (field: string, value: string | undefined) => {
        if (!value || value === MASK) return undefined;
        return value;
      };

      // Send ALL credential fields with real (non-masked) values
      const credentialsToSend: any = {
        accessToken: realValue("accessToken", cred.accessToken),
        accessTokenSecret: realValue("accessTokenSecret", cred.accessTokenSecret),
        apiKey: realValue("apiKey", cred.apiKey),
        apiSecret: realValue("apiSecret", cred.apiSecret),
        bearerToken: realValue("bearerToken", cred.bearerToken),
        businessAccountId: realValue("businessAccountId", cred.businessAccountId),
        wpUsername: realValue("wpUsername", cred.wpUsername),
        wpAppPassword: realValue("wpAppPassword", cred.wpAppPassword),
      };

      // Remove undefined/empty values
      Object.keys(credentialsToSend).forEach(key => {
        if (!credentialsToSend[key]) {
          delete credentialsToSend[key];
        }
      });

      // Only send optional fields if they have actual values (not placeholders)
      const accountEmail = cred.accountEmail && cred.accountEmail !== "account@example.com" ? cred.accountEmail : undefined;
      const accountId = cred.accountId && cred.accountId !== "e.g., 123456789" ? cred.accountId : undefined;
      const accountName = cred.accountName && cred.accountName !== "e.g., @myaccount" ? cred.accountName : undefined;

      await saveCredentialsMutation.mutateAsync({
        brandId: brandId || "",
        platform,
        credentials: credentialsToSend,
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

  // SIMPLIFIED handleInputChange - no editedCredentialFields tracking
  const handleInputChange = (platform: string, field: string, value: string) => {
    setCredentials((prev) => {
      // Ensure platform object exists with all required fields
      const platformCreds = prev[platform] || {
        platform,
        accountId: "",
        accountName: "",
        accountEmail: "",
        accessToken: "",
        accessTokenSecret: "",
        apiKey: "",
        apiSecret: "",
        bearerToken: "",
        businessAccountId: "",
        wpUsername: "",
        wpAppPassword: "",
      };
      return {
        ...prev,
        [platform]: {
          ...platformCreds,
          [field]: value,
        },
      };
    });
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credentials">Social Media Accounts</TabsTrigger>
            <TabsTrigger value="guides">Brand Guides</TabsTrigger>
            <TabsTrigger value="learnings">Learnings</TabsTrigger>
          </TabsList>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Social Media Accounts</CardTitle>
                <CardDescription>
                  Add and manage credentials for each platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="instagram" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    {PLATFORMS.map((platform) => (
                      <TabsTrigger key={platform.id} value={platform.id}>
                        <span className="mr-1">{platform.icon}</span>
                        <span className="hidden sm:inline">{getPlatformAbbr(platform.id)}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {PLATFORMS.map((platform) => (
                    <TabsContent key={platform.id} value={platform.id} className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{platform.name} Credentials</h3>
                        <Badge variant={getCredentialStatus(platform.id) === "verified" ? "default" : "secondary"}>
                          {getCredentialStatus(platform.id)}
                        </Badge>
                      </div>

                      {/* Instagram specific: Check Permissions button */}
                      {platform.id === "instagram" && (
                        <div className="mb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkInstagramScopes(platform.id)}
                            disabled={checkingScopesPlatform === platform.id}
                          >
                            {checkingScopesPlatform === platform.id ? (
                              <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              "Check Permissions"
                            )}
                          </Button>
                          {scopeStatus[platform.id] && (
                            <div className="mt-2 text-sm">
                              {scopeStatus[platform.id].hasRequiredScopes ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  All required permissions granted
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-red-600">
                                  <XCircle className="h-4 w-4" />
                                  Missing permissions: {scopeStatus[platform.id].missingScopes?.join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Account Info Fields - Not needed for website or instagram platform */}
                      {platform.id !== "website" && platform.id !== "instagram" && (
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <Label htmlFor={`${platform.id}-accountId`}>Account ID</Label>
                            <Input
                              id={`${platform.id}-accountId`}
                              placeholder="e.g., 123456789"
                              value={credentials[platform.id]?.accountId || ""}
                              onChange={(e) => handleInputChange(platform.id, "accountId", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-accountName`}>Account Name</Label>
                            <Input
                              id={`${platform.id}-accountName`}
                              placeholder="e.g., @myaccount"
                              value={credentials[platform.id]?.accountName || ""}
                              onChange={(e) => handleInputChange(platform.id, "accountName", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-accountEmail`}>Account Email</Label>
                            <Input
                              id={`${platform.id}-accountEmail`}
                              type="email"
                              placeholder="account@example.com"
                              value={credentials[platform.id]?.accountEmail || ""}
                              onChange={(e) => handleInputChange(platform.id, "accountEmail", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Platform-specific credential fields */}
                      {platform.id === "instagram" && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <Label htmlFor={`${platform.id}-accessToken`}>
                              Access Token <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-accessToken`}
                              type="password"
                              placeholder="Your Instagram Access Token"
                              value={credentials[platform.id]?.accessToken || ""}
                              onChange={(e) => handleInputChange(platform.id, "accessToken", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-businessAccountId`}>Business Account ID</Label>
                            <Input
                              id={`${platform.id}-businessAccountId`}
                              placeholder="e.g., 17841400963310000"
                              value={credentials[platform.id]?.businessAccountId || ""}
                              onChange={(e) => handleInputChange(platform.id, "businessAccountId", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Find this in Instagram Settings → Apps and Websites → Business Account
                            </p>
                          </div>
                        </div>
                      )}

                      {platform.id === "x" && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <Label htmlFor={`${platform.id}-apiKey`}>
                              Consumer Key <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-apiKey`}
                              type="password"
                              placeholder="Your Consumer Key"
                              value={credentials[platform.id]?.apiKey || ""}
                              onChange={(e) => handleInputChange(platform.id, "apiKey", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-apiSecret`}>
                              Consumer Secret <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-apiSecret`}
                              type="password"
                              placeholder="Your Consumer Secret"
                              value={credentials[platform.id]?.apiSecret || ""}
                              onChange={(e) => handleInputChange(platform.id, "apiSecret", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-accessToken`}>
                              Access Token <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-accessToken`}
                              type="password"
                              placeholder="Your Access Token"
                              value={credentials[platform.id]?.accessToken || ""}
                              onChange={(e) => handleInputChange(platform.id, "accessToken", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-accessTokenSecret`}>
                              Access Token Secret <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-accessTokenSecret`}
                              type="password"
                              placeholder="Your Access Token Secret"
                              value={credentials[platform.id]?.accessTokenSecret || ""}
                              onChange={(e) => handleInputChange(platform.id, "accessTokenSecret", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {platform.id === "linkedin" && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <Label htmlFor={`${platform.id}-accessToken`}>
                              Access Token <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-accessToken`}
                              type="password"
                              placeholder="Your LinkedIn Access Token"
                              value={credentials[platform.id]?.accessToken || ""}
                              onChange={(e) => handleInputChange(platform.id, "accessToken", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {platform.id === "facebook" && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <Label htmlFor={`${platform.id}-accessToken`}>
                              Access Token <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-accessToken`}
                              type="password"
                              placeholder="Your Facebook Access Token"
                              value={credentials[platform.id]?.accessToken || ""}
                              onChange={(e) => handleInputChange(platform.id, "accessToken", e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {platform.id === "website" && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <Label htmlFor={`${platform.id}-wpUsername`}>
                              Username <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-wpUsername`}
                              type="text"
                              placeholder="Your WordPress username"
                              value={credentials[platform.id]?.wpUsername || ""}
                              onChange={(e) => handleInputChange(platform.id, "wpUsername", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              WordPress user with Editor role or higher (e.g., FlowFeed user)
                            </p>
                          </div>
                          <div>
                            <Label htmlFor={`${platform.id}-wpAppPassword`}>
                              Application Password <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`${platform.id}-wpAppPassword`}
                              type="password"
                              placeholder="Your WordPress application password"
                              value={credentials[platform.id]?.wpAppPassword || ""}
                              onChange={(e) => handleInputChange(platform.id, "wpAppPassword", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Generate in WordPress: Users → Your Profile → Application Passwords
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleSaveCredentials(platform.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Credentials
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleVerifyCredentials(platform.id)}
                          disabled={isVerifying === platform.id}
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
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Brand Guides</CardTitle>
                <CardDescription>
                  Define your brand voice and content preferences to guide AI generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="copywriting-guide">Copywriting Guide</Label>
                  <Textarea
                    id="copywriting-guide"
                    placeholder="e.g., Use casual, friendly tone. Avoid corporate jargon. Include emojis. Keep sentences short and punchy..."
                    value={guides.copywritingGuide}
                    onChange={(e) => handleGuideChange("copywritingGuide", e.target.value)}
                    className="min-h-32"
                  />
                </div>
                <div>
                  <Label htmlFor="image-generation-guide">Image Generation Guide</Label>
                  <Textarea
                    id="image-generation-guide"
                    placeholder="e.g., Modern, minimalist aesthetic. Use brand colors (blue and white). Include people. Bright, natural lighting..."
                    value={guides.imageGenerationGuide}
                    onChange={(e) => handleGuideChange("imageGenerationGuide", e.target.value)}
                    className="min-h-32"
                  />
                </div>
                <Button
                  onClick={handleSaveGuides}
                  disabled={isSavingGuides}
                >
                  {isSavingGuides ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Guides
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learnings Tab */}
          <TabsContent value="learnings" className="space-y-6">
            <LearningsSection brandId={brandId || ""} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
