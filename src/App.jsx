import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AddDevicePage from "./pages/AddDevicePage";
import ViewerPage from "./pages/ViewerPage";
import { DeviceProvider } from "./pages/DeviceProvider";
import "./App.css";

export default function App() {
  return (
    <DeviceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add-device" element={<AddDevicePage />} />
          <Route path="/viewer" element={<ViewerPage />} />
        </Routes>
      </Router>
    </DeviceProvider>
  );
}
