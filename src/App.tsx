import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";

import Home from "./pages/Home";

function WalletRoute({ params }: { params: { wallet: string } }) {
  return <Home initialWallet={decodeURIComponent(params.wallet)} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/"               component={Home} />
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
