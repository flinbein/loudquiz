import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { SetupPage } from "@/pages/SetupPage";
import { ConstructorPage } from "@/pages/ConstructorPage";
import { RulesPage } from "@/pages/RulesPage";
import { PlayPage } from "@/pages/PlayPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/constructor" element={<ConstructorPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/play" element={<PlayPage />} />
    </Routes>
  );
}
