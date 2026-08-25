import { useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE } from "@/api/client";
import Cookies from "js-cookie";


export default function WalkIn() {
  const { id: organizerId } = useParams();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const token = Cookies.get("authToken");

    const response = await fetch(`${API_BASE}/walk-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create walk-in user");
    }

    console.log("Walk-in user created:", data);

    alert(`User ID: ${data.userId}`);
  } catch (error) {
    console.error("Walk-in error:", error);
    alert(error instanceof Error ? error.message : "Something went wrong");
  }
};


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Walk-in Registration</h1>

      <p className="mt-2 text-gray-400">
        Organizer ID: {organizerId}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
        <div>
          <label className="block mb-2">First Name</label>
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            type="text"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3"
            placeholder="First name"
          />
        </div>

        <div>
          <label className="block mb-2">Last Name</label>
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            type="text"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3"
            placeholder="Last name"
          />
        </div>

        <div>
          <label className="block mb-2">Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 p-3"
            placeholder="Email"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
