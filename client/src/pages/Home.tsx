import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900">
              Social Poster
            </h1>
            <p className="text-xl text-slate-600">
              AI-powered content creation for multi-brand real estate marketing
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Brand Management</h3>
                <p className="text-sm text-slate-600">
                  Manage multiple brands with unique voice bibles and content categories
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">AI Copywriting</h3>
                <p className="text-sm text-slate-600">
                  Generate platform-specific content using Gemini and Claude
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Smart Scheduling</h3>
                <p className="text-sm text-slate-600">
                  Queue and schedule posts with intelligent timing and lead capture
                </p>
              </div>
            </div>

            <div className="pt-4">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard/brands")}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="w-full">
                    Sign In to Get Started
                  </Button>
                </a>
              )}
            </div>
          </div>

          {isAuthenticated && user && (
            <div className="text-sm text-slate-600">
              Welcome, <span className="font-semibold">{user.name || user.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
