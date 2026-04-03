import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function BrandsPage() {
  const { user } = useAuth();
  const { data: brands, isLoading, refetch } = trpc.brands.list.useQuery();
  const [, navigate] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (isLoading) {
    return <div className="p-6">Loading brands...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground mt-1">Manage your brand profiles and voice bibles</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          New Brand
        </Button>
      </div>

      {showCreateForm && <CreateBrandForm onSuccess={() => { setShowCreateForm(false); refetch(); }} />}

      {brands && brands.length === 0 ? (
        <Card>
          <CardContent className="pt-12 text-center">
            <p className="text-muted-foreground mb-4">No brands yet. Create your first brand to get started.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Brand
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {brands?.map((brand) => (
            <Card
              key={brand.id}
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => navigate(`/dashboard/brands/${brand.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span>{brand.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </CardTitle>
                <CardDescription>{brand.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {brand.websiteUrl && (
                  <div className="text-sm text-muted-foreground">
                    <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {brand.websiteUrl}
                    </a>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Created {new Date(brand.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateBrandForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const createMutation = trpc.brands.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({ name, websiteUrl: websiteUrl || undefined, description: description || undefined });
      setName("");
      setWebsiteUrl("");
      setDescription("");
      onSuccess();
    } catch (error) {
      console.error("Failed to create brand:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Brand</CardTitle>
        <CardDescription>Set up a new brand profile with basic information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Brand Name *</label>
            <input
              type="text"
              placeholder="e.g., Modern Villas Real Estate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Website URL</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              placeholder="Brief description of your brand"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-md"
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Brand"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setName("")}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
