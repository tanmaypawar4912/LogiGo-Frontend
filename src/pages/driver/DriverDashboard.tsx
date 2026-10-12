import { useNavigate } from "react-router";
import { LogOut, Truck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-white/10 p-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500 p-2">
              <Truck className="h-5 w-5" />
            </div>

            <span className="font-black">
              LogiGo Driver
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-12">
        <p className="text-orange-400">
          Driver Dashboard
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Hello, {user?.name}
        </h1>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          Driver functionality will be added
          here.
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;