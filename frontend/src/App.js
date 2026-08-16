import { BrowserRouter, Routes, Route } from "react-router-dom";
import LearnGenetics from "./components/Pages/LearnGenetics";
import DNA from "./components/DNA/DNA";
import About from "./components/Pages/About";
import Home from "./components/Pages/Home";
import Counselling from "./components/DNA/Counselling";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import DNAAgentsDashboard from "./components/DNA/DNAAgentsDashboard";
import PatientDNAIntake from "./components/DNA/PatientDNAIntake";
import GeneticAssessmentAI from "./components/Pages/GeneticAssessmentAI";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/learn-genetics" element={<LearnGenetics />} />
        <Route path="/register" element={<Register />} />
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
    </BrowserRouter>
  );
}

export default App;
