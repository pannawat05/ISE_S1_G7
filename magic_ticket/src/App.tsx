import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { Navbar } from "./components/navigater";

import ProfileLayout from "./components/layout/ProfileLayout";

import * as pages from "./page";

import { useEffect } from "react";

import { fetchUser } from "@/api/user";

import Cookies from "js-cookie";



function App() {

  const token = Cookies.get("authToken");



  useEffect(() => {

    const storedUser = localStorage.getItem("user");

    if (!storedUser && token) {

      fetchUser(token).catch((error) => {

        console.error("Failed to fetch user", error);

      });

    }

  }, [token]);



  return (

    <Router>

      <div className="flex flex-col bg-black w-full h-screen overflow-hidden text-white">

        <Navbar />

        <div className="flex-1 w-full min-h-0 overflow-x-hidden overflow-y-auto">

          <Routes>

            <Route path="/" element={<pages.Home />} />

            <Route path="/events/:id" element={<pages.EventDetail />} />

            <Route path="/payment" element={<pages.Payment />} />
            <Route path="/payment/return" element={<pages.PaymentReturn />} />

            <Route path="/admin" element={<pages.AdminPage />} />

            <Route path="/my-tickets" element={<pages.MyTickets />} />
            <Route path="/my-staff" element={<pages.MyStaff />} />
            <Route path="/scan-qr"  element={<pages.ScanQR />} />

            <Route path="/signup" element={<pages.SignUp />} />

            <Route path="/signin" element={<pages.Signin />} />

            <Route path="/otp" element={<pages.Otp />} />

            <Route path="/profile" element={<ProfileLayout />}>

              <Route index element={<Navigate to="account" replace />} />

              <Route path="account" element={<pages.Profiles />} />

              <Route path="dashboard/:id" element={<pages.Dashboards />} />

              <Route path="events/:id" element={<pages.Event />} />

              <Route path="events/:id/create" element={<pages.CreateEvent />} />

              <Route path="events/:id/edit/:eventId" element={<pages.EventEdit />} />

              <Route path="organizer/:id" element={<pages.OrganizerSettings />} />
              <Route path="attendees/:id" element={<pages.Attendees />} />

            </Route>

          </Routes>

        </div>

      </div>

    </Router>

  );

}



export default App;

