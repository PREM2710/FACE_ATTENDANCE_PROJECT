"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Camera, Edit3, LogOut, Users } from "lucide-react";

import ToastStack, { ToastItem } from "../components/ToastStack";
import { apiRequest } from "../services/api";

export default function DashboardPage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [loadingCard, setLoadingCard] = useState<number | null>(null);
  const [time, setTime] = useState(new Date());
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkAuthStatus = () => {
      const loggedIn = localStorage.getItem("isLoggedIn");
      const storedUsername = localStorage.getItem("username");
      const storedEmail = localStorage.getItem("userEmail");

      if (!loggedIn || loggedIn !== "true") {
        setIsLoggedIn(false);
        router.push("/signin");
      } else {
        setIsLoggedIn(true);
        setUsername(storedUsername || "User");
        setUserEmail(storedEmail || "");
      }
    };

    const timeoutId = setTimeout(checkAuthStatus, 100);
    return () => clearTimeout(timeoutId);
  }, [router]);

  const pushToast = (title: string, tone: ToastItem["tone"] = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, title, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2600);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Ignore network/logout errors and clear client state anyway.
    }
    localStorage.clear();
    router.push("/");
  };

  const handleCardClick = (index: number, path: string, title: string) => {
    setLoadingCard(index);
    pushToast(`${title} opened`, "success");

    setTimeout(() => {
      router.push(path);
    }, 500);
  };

  const studentManagementOptions = [
    {
      title: "Student Registration",
      description: "Register students with face recognition",
      icon: <Users className="w-7 h-7" />,
      path: "/student/registrationform",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Update Details",
      description: "Edit student data",
      icon: <Edit3 className="w-7 h-7" />,
      path: "/student/updatedetails",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Face Recognition",
      description: "Live face detection demo",
      icon: <Camera className="w-7 h-7" />,
      path: "/student/demo-session",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Attendance",
      description: "View attendance reports",
      icon: <BarChart3 className="w-7 h-7" />,
      path: "/student/view-attendance",
      color: "from-orange-500 to-amber-500",
    },
  ];

  if (isLoggedIn === null) {
    return <div className="text-center mt-20">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((current) => current.filter((item) => item.id !== id))} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="rounded-[32px] border border-white/60 bg-[var(--surface)] p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.22em] text-sky-700">Student workspace</p>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Attendance dashboard</h1>
                <p className="mt-2 max-w-2xl text-base text-slate-600">
                  Register faces, manage student details, test recognition, and review attendance without leaving one workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-900">{username}</p>
                <p className="text-sm text-slate-500">{userEmail}</p>
                <p className="mt-1 text-xs text-sky-700">{time.toLocaleTimeString()}</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {studentManagementOptions.map((option, index) => (
            <button
              key={option.title}
              type="button"
              onMouseEnter={() => setActiveCard(index)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => handleCardClick(index, option.path, option.title)}
              className={`group rounded-[28px] border border-white/70 bg-white/90 p-6 text-left shadow-lg shadow-slate-900/5 transition ${
                activeCard === index ? "scale-[1.02] -translate-y-1" : "hover:-translate-y-1"
              }`}
            >
              <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${option.color} p-3 text-white shadow-lg`}>
                {option.icon}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{option.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{option.description}</p>
              <div className="mt-6 inline-flex min-w-28 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                {loadingCard === index ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  "Open module"
                )}
              </div>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
