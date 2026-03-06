import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import Designer from "./pages/Designer";
import Auth from "./pages/Auth";
import ProductPage from "./pages/ProductPage";
import ProductPageV2 from "./pages/ProductPageV2";
import ProductPageV2Copy from "./pages/ProductPageV2Copy";
import NewcatalogCollectionAll from "./pages/NewcatalogCollectionAll";
import NewcatalogCollectionCategory from "./pages/NewcatalogCollectionCategory";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductEdit from "@/pages/admin/AdminProductEdit";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminAttributes from "@/pages/admin/AdminAttributes";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminImport from "@/pages/admin/AdminImport";
import AdminExport from "@/pages/admin/AdminExport";
import { RequireCorporate } from "@/components/auth/RequireCorporate";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import BusinessCatalogs from "@/pages/business/BusinessCatalogs";
import BusinessCatalogProducts from "@/pages/business/BusinessCatalogProducts";
import BusinessProducts from "@/pages/business/BusinessProducts";
import BusinessCatalog from "@/pages/business/BusinessCatalog";
import BusinessQuotes from "@/pages/business/BusinessQuotes";
import AdminCatalog from "@/pages/admin/AdminCatalog";
import PublicCatalog from "@/pages/PublicCatalog";
import PublicCatalogList from "@/pages/PublicCatalogList";
import CartPage from "./pages/CartPage";
import { CartProvider } from "./contexts/CartContext";
import { PrelineInit } from "@/components/PrelineInit";
import { RequireAuth } from "@/components/auth/RequireAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LocaleProvider>
        <BrowserRouter>
          <PrelineInit />
          <CartProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/designer" element={<Designer />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/brands" element={<PublicCatalogList />} />
              <Route path="/brand/:slug" element={<PublicCatalog />} />
              <Route path="/brand/:brandSlug/:parentSlug/:categorySlug/:slug" element={<ProductPage />} />
              <Route path="/product/:slug/:code" element={<ProductPage />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/:parentSlug/:categorySlug/:slug" element={<ProductPage />} />
              <Route path="/catalog/:parentSlug/:categorySlug/:slug" element={<ProductPage />} />
              <Route path="/product/id/:id" element={<ProductPage />} />
              <Route path="/product-v2/:slug" element={<ProductPageV2 />} />
              <Route path="/product-v2/id/:id" element={<ProductPageV2 />} />
              <Route path="/product-v2-copy/:slug" element={<ProductPageV2Copy />} />
              <Route path="/product-v2-copy/id/:id" element={<ProductPageV2Copy />} />
              <Route
                path="/catalog"
                element={
                  <RequireAuth>
                    <NewcatalogCollectionAll />
                  </RequireAuth>
                }
              />
              <Route path="/apparel" element={<Navigate to="/catalog" replace />} />
              <Route
                path="/collection/all"
                element={
                  <Navigate to="/catalog" replace />
                }
              />
              <Route path="/catalog/all" element={<Navigate to="/catalog" replace />} />
              <Route
                path="/catalog/:slug"
                element={
                  <RequireAuth>
                    <NewcatalogCollectionCategory />
                  </RequireAuth>
                }
              />
              <Route
                path="/:slug"
                element={
                  <RequireAuth>
                    <NewcatalogCollectionCategory />
                  </RequireAuth>
                }
              />
              <Route
                path="/:parentSlug/:slug"
                element={
                  <RequireAuth>
                    <NewcatalogCollectionCategory />
                  </RequireAuth>
                }
              />
              <Route
                path="/apparel/:slug"
                element={
                  <RequireAuth>
                    <NewcatalogCollectionCategory />
                  </RequireAuth>
                }
              />
              <Route
                path="/collection/:slug"
                element={
                  <RequireAuth>
                    <NewcatalogCollectionCategory />
                  </RequireAuth>
                }
              />
              <Route path="/cart" element={<CartPage />} />

              <Route
                path="/brand"
                element={
                  <RequireCorporate>
                    <BusinessLayout />
                  </RequireCorporate>
                }
              >
                <Route index element={<Navigate to="/brand/catalog" replace />} />
                <Route path="products" element={<BusinessProducts />} />
                <Route path="products/new" element={<AdminProductEdit mode="create" />} />
                <Route path="products/:id" element={<AdminProductEdit mode="edit" />} />
                <Route path="catalog" element={<BusinessCatalog />} />
                <Route path="profile" element={<BusinessCatalogs />} />
                <Route path="quotes" element={<BusinessQuotes />} />
                <Route path="catalogs" element={<Navigate to="/brand/profile" replace />} />
                <Route path="catalogs/:id/products" element={<BusinessCatalogProducts />} />
                <Route path="users" element={<Navigate to="/brand/catalog" replace />} />
              </Route>
              <Route path="/business/*" element={<Navigate to="/brand/catalog" replace />} />

              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductEdit mode="create" />} />
                <Route path="products/:id" element={<AdminProductEdit mode="edit" />} />
                <Route path="catalog" element={<AdminCatalog />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="filters" element={<AdminAttributes />} />
                <Route path="attributes" element={<Navigate to="/admin/filters" replace />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="import" element={<AdminImport />} />
                <Route path="export" element={<AdminExport />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </CartProvider>
        </BrowserRouter>
      </LocaleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
