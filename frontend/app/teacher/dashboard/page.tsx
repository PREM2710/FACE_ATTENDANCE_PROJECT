"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Camera, Edit3, LogOut, Users } from "lucide-react";

import { apiRequest } from "../../services/api";
import StatusPill from "../../components/StatusPill";

export default function TeacherDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<number | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      try {
        const loggedIn = localStorage.getItem("isLoggedIn");
        const userType = localStorage.getItem("userType");
        const name = localStorage.getItem("username");
        const empId = localStorage.getItem("employeeId");

        if (!loggedIn || loggedIn !== "true" || userType !== "teacher") {
          setIsLoggedIn(false);
          router.push("/signin");
        } else {
          setIsLoggedIn(true);
          setTeacherName(name || "");
          setEmployeeId(empId || "");
          setLoading(false);
        }
      } catch {
        setIsLoggedIn(false);
        router.push("/signin");
      }
    };

    const timeoutId = setTimeout(checkStatus, 100);
    return () => clearTimeout(timeoutId);
  }, [router]);

  const handleLogout = async () => {
    try {
      await apiRequest("/api/logout", { method: "POST" });
    } catch {
      // Ignore errors on logout
    }

    localStorage.clear();
    router.push("/");
  };

  const teacherMenuItems = [
    {
      title: "Student Registration",
      description: "Register new students with complete details and face recognition setup",
      icon: <Users className="w-7 h-7" />,
      path: "/student/registrationform",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50 hover:bg-blue-100",
      borderColor: "border-blue-200 hover:border-blue-300"
    },
    {
      title: "Update Student Details",
      description: "Modify existing student information and profile settings",
      icon: <Edit3 className="w-7 h-7" />,
      path: "/student/updatedetails",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50 hover:bg-emerald-100",
      borderColor: "border-emerald-200 hover:border-emerald-300"
    },
    {
      title: "Start Teaching Session",
      description: "Begin a live attendance session with face recognition",
      icon: <Camera className="w-7 h-7" />,
      path: "/teacher/start-session",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 hover:bg-purple-100",
      borderColor: "border-purple-200 hover:border-purple-300"
    },
    {
      title: "Attendance Records",
      description: "View comprehensive attendance statistics and reports",
      icon: <BarChart3 className="w-7 h-7" />,
      path: "/student/view-attendance",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-50 hover:bg-amber-100",
      borderColor: "border-amber-200 hover:border-amber-300"
    }
  ];

  if (isLoggedIn === null || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-slate-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[34px] border border-white/70 bg-[var(--surface)] p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-[24px] bg-slate-900 p-4 text-white shadow-lg shadow-slate-900/20">
                <Users className="h-7 w-7" />
              </div>
              <div className="space-y-3">
                <StatusPill label="Faculty Control Center" tone="info" />
                <div>
                  <h1 className="text-4xl font-bold text-slate-900">Teacher dashboard</h1>
                  <p className="mt-2 max-w-2xl text-base text-slate-600">
                    Start attendance sessions, manage student records, and review class performance from one clean workspace.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <StatusPill label={teacherName || "Teacher"} tone="success" />
                  {employeeId ? <StatusPill label={`ID ${employeeId}`} tone="neutral" /> : null}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 self-start rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="mt-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {teacherMenuItems.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setActiveCard(idx)}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => router.push(item.path)}
                className={`relative overflow-hidden rounded-[30px] border transition-all duration-500 cursor-pointer group bg-white/90 p-6 shadow-lg shadow-slate-900/5 ${
                  item.borderColor
                } ${activeCard === idx ? 'scale-[1.02] shadow-xl -translate-y-1' : 'hover:-translate-y-1'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`mb-6 w-fit rounded-[22px] bg-gradient-to-br ${item.color} p-4 text-white shadow-lg transition-transform duration-300 group-hover:scale-105`}>
                    {item.icon}
                  </div>

                  <h4 className="mb-3 text-xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                    {item.title}
                  </h4>

                  <p className="mb-6 text-sm leading-6 text-slate-600 line-clamp-3">
                    {item.description}
                  </p>

                  <div className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${item.color} px-4 py-3 text-sm font-semibold text-white transition-all duration-300 group-hover:gap-3 group-hover:shadow-lg`}>
                    Get Started
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
