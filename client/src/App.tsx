import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Editor from "@/pages/editor";
import PluginsPage from "@/pages/plugins-page";
import SettingsPage from "@/pages/settings-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "./hooks/use-auth";

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/editor/:id?" component={Editor} />
      <ProtectedRoute path="/plugins" component={PluginsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth">
        {user ? () => {
          window.location.href = "/";
          return null;
        } : () => <AuthPage />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
