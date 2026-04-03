import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DashboardLayout from "./components/DashboardLayout";
import BrandsPage from "./pages/BrandsPage";
import BrandDetailPage from "./pages/BrandDetailPage";
import IngestionPage from "./pages/IngestionPage";
import DraftsPage from "./pages/DraftsPage";
import QueuePage from "./pages/QueuePage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard/brands"}>
        {() => (
          <DashboardLayout>
            <BrandsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/brands/:brandId"}>
        {() => (
          <DashboardLayout>
            <BrandDetailPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/ingestion/:brandId"}>
        {() => (
          <DashboardLayout>
            <IngestionPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/drafts/:brandId"}>
        {() => (
          <DashboardLayout>
            <DraftsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/dashboard/queue/:brandId"}>
        {() => (
          <DashboardLayout>
            <QueuePage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
