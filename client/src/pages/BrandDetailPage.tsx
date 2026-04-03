import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function BrandDetailPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const { data: brand, isLoading } = trpc.brands.getById.useQuery({ brandId: brandId! });
  const { data: categories } = trpc.brands.listCategories.useQuery({ brandId: brandId! });
  const { data: partners } = trpc.brands.listPartners.useQuery({ brandId: brandId! });
  const { data: agents } = trpc.brands.listAgents.useQuery({ brandId: brandId! });

  if (isLoading) {
    return <div className="p-6">Loading brand details...</div>;
  }

  if (!brand) {
    return <div className="p-6">Brand not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
          <p className="text-muted-foreground mt-1">{brand.description}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="voice-bible">Voice Bible</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Website URL</label>
                <p className="text-muted-foreground">{brand.websiteUrl || "Not set"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-muted-foreground">{new Date(brand.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Content Categories</h2>
            <CreateCategoryButton brandId={brandId!} />
          </div>
          <div className="grid gap-4">
            {categories && categories.length > 0 ? (
              categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No categories yet. Create one to get started.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Partners</h2>
            <CreatePartnerButton brandId={brandId!} />
          </div>
          <div className="grid gap-4">
            {partners && partners.length > 0 ? (
              partners.map((partner) => (
                <Card key={partner.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{partner.name}</CardTitle>
                    <CardDescription>{partner.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {partner.contactEmail && <p>Email: {partner.contactEmail}</p>}
                    {partner.phone && <p>Phone: {partner.phone}</p>}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No partners yet. Add one to collaborate.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Real Estate Agents</h2>
            <CreateAgentButton brandId={brandId!} />
          </div>
          <div className="grid gap-4">
            {agents && agents.length > 0 ? (
              agents.map((agent) => (
                <Card key={agent.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>{agent.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {agent.phone && <p>Phone: {agent.phone}</p>}
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground">No agents yet. Add team members to get started.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="voice-bible" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Brand Voice Bible</CardTitle>
              <CardDescription>Define your brand's tone, style, and messaging guidelines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VoiceBibleEditor brandId={brandId!} initialContent={brand.voiceBibleContent} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateCategoryButton({ brandId }: { brandId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const createMutation = trpc.brands.createCategory.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ brandId, name });
      setName("");
      setShowForm(false);
      // Invalidate the categories query to refresh the list
      await utils.brands.listCategories.invalidate({ brandId });
      toast.success("Category created successfully");
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Failed to create category");
    }
  };

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
          required
        />
        <Button type="submit" size="sm" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Adding..." : "Add"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </form>
    );
  }

  return (
    <Button size="sm" onClick={() => setShowForm(true)}>
      <Plus className="w-4 h-4 mr-2" />
      Add Category
    </Button>
  );
}

function CreatePartnerButton({ brandId }: { brandId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const createMutation = trpc.brands.createPartner.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ 
        brandId, 
        name,
        contactEmail: email || undefined,
        phone: phone || undefined
      });
      setName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      // Invalidate the partners query to refresh the list
      await utils.brands.listPartners.invalidate({ brandId });
      toast.success("Partner created successfully");
    } catch (error) {
      console.error("Failed to create partner:", error);
      toast.error("Failed to create partner");
    }
  };

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-md">
        <input
          type="text"
          placeholder="Partner name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 border border-input rounded-md text-sm"
          required
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border border-input rounded-md text-sm"
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="px-3 py-2 border border-input rounded-md text-sm"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button size="sm" onClick={() => setShowForm(true)}>
      <Plus className="w-4 h-4 mr-2" />
      Add Partner
    </Button>
  );
}

function CreateAgentButton({ brandId }: { brandId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const createMutation = trpc.brands.createAgent.useMutation();
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ 
        brandId, 
        name, 
        email,
        phone: phone || undefined
      });
      setName("");
      setEmail("");
      setPhone("");
      setShowForm(false);
      // Invalidate the agents query to refresh the list
      await utils.brands.listAgents.invalidate({ brandId });
      toast.success("Agent created successfully");
    } catch (error) {
      console.error("Failed to create agent:", error);
      toast.error("Failed to create agent");
    }
  };

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-md">
        <input
          type="text"
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 border border-input rounded-md text-sm"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border border-input rounded-md text-sm"
          required
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="px-3 py-2 border border-input rounded-md text-sm"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Adding..."}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Button size="sm" onClick={() => setShowForm(true)}>
      <Plus className="w-4 h-4 mr-2" />
      Add Agent
    </Button>
  );
}

function VoiceBibleEditor({ brandId, initialContent }: { brandId: string; initialContent?: string | null }) {
  const [content, setContent] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const updateMutation = trpc.brands.update.useMutation();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        brandId,
        voiceBibleContent: content,
      });
      toast.success("Voice Bible saved successfully");
    } catch (error) {
      console.error("Failed to save voice bible:", error);
      toast.error("Failed to save voice bible");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Define your brand's tone, style, messaging guidelines, target audience, key values, and any other voice characteristics..."
        className="w-full h-64 px-3 py-2 border border-input rounded-md text-sm font-mono"
      />
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Voice Bible"}
      </Button>
    </div>
  );
}
