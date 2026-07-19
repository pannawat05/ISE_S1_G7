import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/navigater";
import { Home, MyTickets, SignUp, Signin, OTP, OrganizeRegis, Dashboards, Event } from "./page";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/otp" element={<OTP />} />
          <Route path="/organize-regis" element={<OrganizeRegis />} />
          <Route path="/dashboard" element={<Dashboards />} />
          <Route path="/dashboard/events" element={<Event />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
