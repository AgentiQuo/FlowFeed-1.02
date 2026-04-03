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
      <Route path={"/dashboard/*"}>
        {() => (
          <DashboardLayout>
            <Switch>
              <Route path={"/brands"} component={BrandsPage} />
              <Route path={"/brands/:brandId"} component={BrandDetailPage} />
              <Route path={"/ingestion/:brandId"} component={IngestionPage} />
              <Route path={"/drafts/:brandId"} component={DraftsPage} />
              <Route path={"/queue/:brandId"} component={QueuePage} />
              <Route component={NotFound} />
            </Switch>
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
