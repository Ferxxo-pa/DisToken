import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useSearch } from "wouter";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

import Home from "./pages/Home";
import Setup from "./pages/Setup";
import RemotePage from "./pages/Remote";

function WalletRoute({ params }: { params: { wallet: string } }) {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const kiosk = searchParams.get('mode') === 'kiosk';
  const embed = searchParams.get('embed') === 'true';
  return <Home initialWallet={decodeURIComponent(params.wallet)} kioskMode={kiosk} embedMode={embed} />;
}

function HomeRoute() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const kiosk = searchParams.get('mode') === 'kiosk';
  return <Home kioskMode={kiosk} />;
}

function RemoteRoute({ params }: { params: { code: string } }) {
  return <RemotePage roomCode={params.code} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/"               component={HomeRoute} />
      <Route path="/setup"          component={Setup} />
      <Route path="/remote/:code"   component={RemoteRoute} />
      {/* Direct wallet URL: /0x... or /ezven.eth or /solana-address */}
      <Route path="/:wallet"        component={WalletRoute} />
      <Route path="/404"            component={NotFound} />
      <Route                        component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
