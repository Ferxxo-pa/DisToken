import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useSearch } from "wouter";

import Home from "./pages/Home";
import Setup from "./pages/Setup";

function WalletRoute({ params }: { params: { wallet: string } }) {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const kiosk = searchParams.get('mode') === 'kiosk';
  return <Home initialWallet={decodeURIComponent(params.wallet)} kioskMode={kiosk} />;
}

function HomeRoute() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const kiosk = searchParams.get('mode') === 'kiosk';
  return <Home kioskMode={kiosk} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/"               component={HomeRoute} />
      <Route path="/setup"          component={Setup} />
      {/* Direct wallet URL: /0x... or /ezven.eth or /solana-address */}
      <Route path="/:wallet"        component={WalletRoute} />
      <Route path="/404"            component={NotFound} />
      <Route                        component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
