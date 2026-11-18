import type { Route as RootRoute } from "./routes/__root";
import type { Route as BillingCheckoutRoute } from "./routes/api/billing/checkout";
import type { Route as BillingWebhookRoute } from "./routes/api/billing/webhook";
import type { Route as CreditsRoute } from "./routes/api/credits";

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/api/billing/checkout": {
      id: "/api/billing/checkout";
      path: "/api/billing/checkout";
      fullPath: "/api/billing/checkout";
      preLoaderRoute: typeof BillingCheckoutRoute;
      parentRoute: typeof RootRoute;
    };
    "/api/credits": {
      id: "/api/credits";
      path: "/api/credits";
      fullPath: "/api/credits";
      preLoaderRoute: typeof CreditsRoute;
      parentRoute: typeof RootRoute;
    };
    "/api/billing/webhook": {
      id: "/api/billing/webhook";
      path: "/api/billing/webhook";
      fullPath: "/api/billing/webhook";
      preLoaderRoute: typeof BillingWebhookRoute;
      parentRoute: typeof RootRoute;
    };
  }
}
