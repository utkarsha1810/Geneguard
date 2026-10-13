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
import GeneticAssessmentAI from "./Components/Pages/GeneticAssessmentAI";
import Disorders from "./Components/Pages/Disorders";
import AdminDashboard from "./Components/Admin/AdminDashboard";
import GeneGuardAssistant from "./Components/AIAssistant/GeneGuardAssistant";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/learn-genetics" element={<LearnGenetics />} />
        <Route path="/genetic-disorders" element={<Disorders />} />
        <Route path="/disorders" element={<Disorders />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dna" element={<DNA />} />
        <Route path="/dna/agents/:agentId" element={<DNAAgentsDashboard />} />
        <Route path="/dna/agents" element={<DNAAgentsDashboard />} />
        <Route path="/dna/patient-intake" element={<PatientDNAIntake />} />
        <Route path="/home" element={<Home />}/>
        <Route path="/about" element={<About />} />
        <Route path="/counselling" element={<Counselling />} />
        <Route path="/genetic-assessment" element={<GeneticAssessmentAI />} />
      
      </Routes>
      {/* Gemini-powered AI Assistant — replaces Botpress, self-hides on login/register/admin */}
      <GeneGuardAssistant />
    </BrowserRouter>
  );
}

export default App;
