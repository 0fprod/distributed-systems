import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { LoginUserFeature } from "#features/auth/login-user";
import { RegisterUserFeature } from "#features/auth/register-user";

type Tab = "register" | "login";

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<Tab>("register");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-center text-3xl font-bold text-gray-900">Distributed Systems Demo</h1>

        <div className="rounded-lg bg-white shadow">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 px-4 py-3 text-sm font-medium focus:outline-none ${
                activeTab === "register"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Register
            </button>
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 px-4 py-3 text-sm font-medium focus:outline-none ${
                activeTab === "login"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Login
            </button>
          </div>

          <div className="p-1">
            {activeTab === "register" ? (
              <RegisterUserFeature onRegistered={() => setActiveTab("login")} />
            ) : (
              <LoginUserFeature onLoggedIn={() => navigate("/invoices")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
