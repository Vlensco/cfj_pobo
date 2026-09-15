import { ScrollToTop } from "@/components/ScrollToTop";
import { StoreShell } from "@/components/StoreShell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import AdminCatalog from "@/pages/AdminCatalog";
import AdminLogin from "@/pages/AdminLogin";
import AdminOrders from "@/pages/AdminOrders";
import Campaign from "@/pages/Campaign";
import Home from "@/pages/Home";
import Journal from "@/pages/Journal";
import NotFound from "@/pages/NotFound";
import OrderSuccess from "@/pages/OrderSuccess";
import OrderTrack from "@/pages/OrderTrack";
import ProductPage from "@/pages/ProductPage";
import Shop from "@/pages/Shop";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/catalog" component={AdminCatalog} />
        <Route>
          <StoreShell>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/shop" component={Shop} />
              <Route path="/products/:slug" component={ProductPage} />
              <Route path="/campaign" component={Campaign} />
              <Route path="/journal" component={Journal} />
              <Route path="/track" component={OrderTrack} />
              <Route path="/orders" component={OrderTrack} />
              <Route path="/my-orders" component={OrderTrack} />
              <Route path="/order-success" component={OrderSuccess} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </StoreShell>
        </Route>
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <CartProvider>
            <Toaster position="bottom-center" richColors />
            <Router />
          </CartProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

