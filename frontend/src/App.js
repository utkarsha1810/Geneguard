import { BrowserRouter, Routes, Route } from "react-router-dom";
import LearnGenetics from "./Components/Pages/LearnGenetics";
import DNA from "./Components/DNA/DNA";
import About from "./Components/Pages/About";
import Home from "./Components/Pages/Home";
import Counselling from "./Components/DNA/Counselling";
import Login from "./Components/Auth/Login";
import Signup from "./Components/Auth/Signup";
import DNAAgentsDashboard from "./Components/DNA/DNAAgentsDashboard";
import PatientDNAIntake from "./Components/DNA/PatientDNAIntake";
import LearningHub from './Components/Pages/LearningHub';
import Disorders from "./Components/Pages/Disorders";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import GeneGuardAssistant from "./Components/AIAssistant/GeneGuardAssistant";
import PrivacyPolicy from "./Components/Pages/PrivacyPolicy";
import Terms from "./Components/Pages/Terms";
import Settings from "./Components/Pages/Settings";
import { ProtectedRoute, PublicRoute } from "./Components/Auth/ProtectedRoute";
import InactivityTimer from "./Components/Auth/InactivityTimer";

function App() {
  return (
    <BrowserRouter>
      {/* HIPAA Compliance Inactivity Guard: 15-min idle detection with 60s warning modal */}
      <InactivityTimer />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        {/* Public-only routes: logged in users are redirected */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Compliance Pages */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Protected User Account Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard Protected */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Informational & Clinical Portals */}
        <Route path="/learn-genetics" element={<LearnGenetics />} />
        <Route path="/genetic-disorders" element={<Disorders />} />
        <Route path="/disorders" element={<Disorders />} />
        <Route path="/about" element={<About />} />
        <Route path="/counselling" element={<Counselling />} />
        <Route path="/learning-hub" element={<LearningHub />} />

        {/* DNA Agents & Intake */}
        <Route path="/dna" element={<DNA />} />
        <Route path="/dna/agents/:agentId" element={<DNAAgentsDashboard />} />
        <Route path="/dna/agents" element={<DNAAgentsDashboard />} />
        <Route path="/dna/patient-intake" element={<PatientDNAIntake />} />
      </Routes>

      {/* Gemini-powered AI Assistant — replaces Botpress, self-hides on login/register/admin */}
      <GeneGuardAssistant />
    </BrowserRouter>
  );
}

export default App;
