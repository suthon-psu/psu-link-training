import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/LoginPage.tsx"),
  route("auth/callback", "routes/OidcCallbackPage.tsx"),
  layout("components/ProtectedRoute.tsx", [
    index("routes/home.tsx"),
  ]),
] satisfies RouteConfig;
