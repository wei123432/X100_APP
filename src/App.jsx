import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AddDevicePage from "./pages/AddDevicePage";
import ViewerPage from "./pages/ViewerPage";
import "./App.css";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add-device" element={<AddDevicePage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </Router>
  );
}
