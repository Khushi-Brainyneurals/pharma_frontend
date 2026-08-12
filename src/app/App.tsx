import { Navigate, Route, Routes } from "react-router-dom";
import { env } from "../shared/config/env";
import { GlobalSessionTimeoutOverlay } from "../features/auth/components/GlobalSessionTimeoutOverlay";
import { CoreInputsPage } from "../features/core-inputs/pages/CoreInputsPage";
import { FormatPreviewPage } from "../features/format-preview/pages/FormatPreviewPage";
import { CoverBomPage } from "../features/cover-bom/pages/CoverBomPage";
import { PreparedByCoverBomRoute } from "../features/cover-bom/routing/PreparedByCoverBomRoute";
import { NewDocumentSelectorPage } from "../features/new-document/pages/NewDocumentSelectorPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { LoginStatesPage } from "../features/auth/pages/LoginStatesPage";
import { ProtectedRoute } from "../features/auth/routing/ProtectedRoute";
import { ProtectedPlaceholderPage } from "./ProtectedPlaceholderPage";
import { MASTER_DATA_ROUTES, ROUTES } from "./routing/routes";
import { MasterDataHubPage } from "../features/master-data/pages/MasterDataHubPage";
import { CompanyInfoPage } from "../features/master-data/pages/CompanyInfoPage";
import { EquipmentInstrumentPage } from "../features/master-data/pages/EquipmentInstrumentPage";
import { MasterDataTypesPage } from "../features/master-data/pages/MasterDataTypesPage";
import { StageDocumentsPage } from "../features/master-data/pages/StageDocumentsPage";
import { BatchDocumentsPage } from "../features/master-data/pages/BatchDocumentsPage";
import { MasterDataPreviewPage } from "../features/master-data/pages/MasterDataPreviewPage";
import { AdminRoute } from "../features/employee-management/routing/AdminRoute";
import { EmployeeManagementPage } from "../features/employee-management/pages/EmployeeManagementPage";
import { SelectStagesPage } from "../features/select-stages/pages/SelectStagesPage";

export function App() {
  return (
    <>
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />
        {env.isDev ? <Route path="/login/states" element={<LoginStatesPage />} /> : null}
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.newDocument} element={<NewDocumentSelectorPage />} />
          <Route path={ROUTES.documentInputs} element={<CoreInputsPage />} />
          <Route path={ROUTES.documentPreview} element={<FormatPreviewPage />} />
          <Route path={ROUTES.documentCoverBom} element={<PreparedByCoverBomRoute><CoverBomPage /></PreparedByCoverBomRoute>} />
          <Route path={ROUTES.documentSelectStages} element={<SelectStagesPage />} />
          <Route path={ROUTES.statusBoard} element={<ProtectedPlaceholderPage />} />
          <Route path={MASTER_DATA_ROUTES.hub} element={<MasterDataHubPage />} />
          <Route path={MASTER_DATA_ROUTES.company} element={<CompanyInfoPage />} />
          <Route path={MASTER_DATA_ROUTES.equipmentInstrument} element={<EquipmentInstrumentPage />} />
          <Route path={MASTER_DATA_ROUTES.types} element={<MasterDataTypesPage />} />
          <Route path={MASTER_DATA_ROUTES.stageDocuments} element={<StageDocumentsPage />} />
          <Route path={MASTER_DATA_ROUTES.batchDocuments} element={<BatchDocumentsPage />} />
          <Route path={MASTER_DATA_ROUTES.preview} element={<MasterDataPreviewPage />} />
          <Route element={<AdminRoute />}>
            <Route path={ROUTES.employeeManagement} element={<EmployeeManagementPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
      </Routes>
      <GlobalSessionTimeoutOverlay />
    </>
  );
}
