import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import LoginPage from "@/components/auth/LoginPage";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NewLaudo from "@/pages/NewLaudo";
import LaudoList from "@/pages/LaudoList";
import LaudoDetail from "@/pages/LaudoDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novo-laudo" element={<NewLaudo />} />
            <Route path="/laudos" element={<LaudoList />} />
            <Route path="/laudos/:id" element={<LaudoDetail />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
