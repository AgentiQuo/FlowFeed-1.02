import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AllBrandsPage() {
  const [, setLocation] = useLocation();
  const [newBrandName, setNewBrandName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const { data: brands = [] } = trpc.brands.list.useQuery();
  const utils = trpc.useUtils();

  // Mutations
  const createBrand = trpc.brands.create.useMutation({
    onSuccess: (newBrand) => {
      toast.success("Brand created successfully");
      setNewBrandName("");
      setIsCreating(false);
      utils.brands.list.invalidate();
      // Navigate to the new brand
      setLocation(`/dashboard/brand/${newBrand.id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create brand: ${error.message}`);
      setIsCreating(false);
    },
  });

  const deleteBrand = trpc.brands.delete.useMutation({
    onSuccess: () => {
      toast.success("Brand deleted successfully");
      setDeleteConfirm(null);
      setIsDeleting(false);
      utils.brands.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete brand: ${error.message}`);
      setIsDeleting(false);
    },
  });

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setIsCreating(true);
    try {
      await createBrand.mutateAsync({ name: newBrandName });
    } catch (error) {
      console.error("Error creating brand:", error);
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    setIsDeleting(true);
    try {
      await deleteBrand.mutateAsync({ brandId });
    } catch (error) {
      console.error("Error deleting brand:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Brands</h1>
            <p className="text-muted-foreground">Manage all your brands and their settings</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Brand</DialogTitle>
                <DialogDescription>
                  Enter a name for your new brand
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Brand Name</Label>
                  <Input
                    id="brand-name"
                    placeholder="e.g., Luxury Real Estate"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateBrand();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewBrandName("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBrand}
                    disabled={isCreating || !newBrandName.trim()}
                  >
                    {isCreating ? "Creating..." : "Create Brand"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Brands Grid */}
        {brands.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground mb-4">No brands yet</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Brand
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Brand</DialogTitle>
                    <DialogDescription>
                      Enter a name for your new brand
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand-name-empty">Brand Name</Label>
                      <Input
                        id="brand-name-empty"
                        placeholder="e.g., Luxury Real Estate"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateBrand();
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNewBrandName("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateBrand}
                        disabled={isCreating || !newBrandName.trim()}
                      >
                        {isCreating ? "Creating..." : "Create Brand"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brand: any) => (
              <Card key={brand.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between">
                    <span className="truncate">{brand.name}</span>
                  </CardTitle>
                  <CardDescription>
                    {brand.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/dashboard/brand/${brand.id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/dashboard/brand/${brand.id}/settings`)}
                      title="Brand Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deleteConfirm === brand.id} onOpenChange={(open) => {
                      if (!open) setDeleteConfirm(null);
                    }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(brand.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Brand</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{brand.name}"? This action cannot be undone and will delete all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex gap-2 justify-end">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBrand(brand.id)}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
