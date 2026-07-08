import { Navigate, Route, Routes } from "react-router-dom";
import { env } from "../shared/config/env";
import { NewDocumentSelectorPage } from "../features/new-document/pages/NewDocumentSelectorPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { LoginStatesPage } from "../features/auth/pages/LoginStatesPage";
import { ProtectedRoute } from "../features/auth/routing/ProtectedRoute";
import { ProtectedPlaceholderPage } from "./ProtectedPlaceholderPage";
import { ROUTES } from "./routing/routes";

export function App() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      {env.isDev ? <Route path="/login/states" element={<LoginStatesPage />} /> : null}
      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.newDocument} element={<NewDocumentSelectorPage />} />
        <Route path={ROUTES.statusBoard} element={<ProtectedPlaceholderPage />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
    </Routes>
  );
}
