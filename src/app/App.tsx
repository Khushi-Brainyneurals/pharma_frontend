import { Navigate, Route, Routes } from "react-router-dom";
import { env } from "../shared/config/env";
import { CoreInputsPage } from "../features/core-inputs/pages/CoreInputsPage";
import { FormatPreviewPage } from "../features/format-preview/pages/FormatPreviewPage";
import { CoverBomPage } from "../features/cover-bom/pages/CoverBomPage";
import { PreparedByCoverBomRoute } from "../features/cover-bom/routing/PreparedByCoverBomRoute";
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
        <Route path={ROUTES.documentInputs} element={<CoreInputsPage />} />
        <Route path={ROUTES.documentPreview} element={<FormatPreviewPage />} />
        <Route path={ROUTES.documentCoverBom} element={<PreparedByCoverBomRoute><CoverBomPage /></PreparedByCoverBomRoute>} />
        <Route path={ROUTES.documentSelectStages} element={<ProtectedPlaceholderPage />} />
        <Route path={ROUTES.statusBoard} element={<ProtectedPlaceholderPage />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
    </Routes>
  );
}
