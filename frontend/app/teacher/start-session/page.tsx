"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ArrowLeft, Play, Square, User, Calendar, BookOpen, Users, CheckCircle2 } from "lucide-react";
import CameraCapture, { FaceData } from "../../components/CameraCapture";
import { apiRequest } from "../../services/api";

export default function DemoSessionPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recognitionStarted, setRecognitionStarted] = useState(false);
  const [status, setStatus] = useState("");
  const [facesData, setFacesData] = useState<FaceData[]>([]);
  const [recognizedStudents, setRecognizedStudents] = useState<string[]>([]);
  const [processingFrame, setProcessingFrame] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  const [form, setForm] = useState({
    date: "",
    subject: "",
    department: "",
    year: "",
    division: "",
  });

  const departments = ["Computer Science", "IT", "Electronics", "Mechanical", "Civil"];
  const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const divisions = ["A", "B", "C", "D"];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createSession = async () => {
    if (!form.date || !form.subject || !form.department || !form.year || !form.division) {
      setStatus("Please fill all fields");
      return;
    }

    setStatus("Creating session...");
    try {
      const data = await apiRequest<{
        session_id: string;
        students_count: number;
        reused_existing?: boolean;
      }>("/api/attendance/create_session", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (data.session_id) {
        setSessionId(data.session_id);
        setStatus(
          data.reused_existing
            ? `✅ Existing session loaded with ${data.students_count} students.`
            : `✅ Session created with ${data.students_count} students.`
        );
      } else {
        setStatus("❌ Failed to create session");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Error creating session");
    }
  };

  const handleRecognize = useCallback(
    async (imageDataUrl: string) => {
      if (!sessionId || processingFrame) {
        return;
      }

      try {
        setProcessingFrame(true);
        const data = await apiRequest<{ faces: Array<FaceData & { status?: string; message?: string }> }>(
          "/api/attendance/real-mark",
          {
          method: "POST",
          body: JSON.stringify({ image: imageDataUrl, session_id: sessionId }),
          }
        );

        if (data.faces && data.faces.length > 0) {
          const face = data.faces[0];
          if (face.match && face.status === "marked_present") {
            setStatus(`✅ ${face.match.name} marked present`);
            setRecognizedStudents((prev) => (prev.includes(face.match.name) ? prev : [...prev, face.match.name]));
          } else if (face.match && face.status === "duplicate") {
            setStatus(`ℹ️ ${face.match.name} already marked for this session`);
          } else if (face.match) {
            setStatus(`✅ Recognized ${face.match.name}`);
          } else {
            setStatus("❌ Face not recognized");
          }
          setFacesData(data.faces.map((f) => ({ box: f.box, match: f.match, confidence: f.confidence })));
        } else {
          setStatus("❌ No faces detected");
          setFacesData([]);
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ Recognition failed");
        setFacesData([]);
      } finally {
        setProcessingFrame(false);
      }
    },
    [processingFrame, sessionId]
  );

  const handleStartRecognition = () => {
    if (!sessionId) {
      setStatus("Create a session before starting recognition");
      return;
    }
    setRecognitionStarted(true);
    setStatus("Starting live recognition...");
  };

  const handleStopRecognition = () => {
    setRecognitionStarted(false);
    setStatus("Recognition stopped");
  };

  const handleEndSession = async () => {
    if (!sessionId) {
      return;
    }

    try {
      setEndingSession(true);
      const data = await apiRequest<{ statistics: { present_count: number; absent_count: number } }>(
        "/api/attendance/end_session",
        {
          method: "POST",
          body: JSON.stringify({ session_id: sessionId }),
        }
      );
      setRecognitionStarted(false);
      setStatus(
        `✅ Session finalized. Present: ${data.statistics.present_count}, Absent: ${data.statistics.absent_count}`
      );
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to finalize session");
    } finally {
      setEndingSession(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-white/20 relative z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/teacher/dashboard")}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors group"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600 group-hover:text-gray-800 transition-colors" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                  <Camera className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Attendance Session</h1>
                  <p className="text-gray-600 text-sm">Live face recognition attendance</p>
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                recognitionStarted 
                  ? "bg-green-100 border border-green-300" 
                  : "bg-gray-100 border border-gray-300"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  recognitionStarted ? "bg-green-600 animate-pulse" : "bg-gray-400"
                }`} />
                <span className={`text-sm font-medium ${
                  recognitionStarted ? "text-green-700" : "text-gray-600"
                }`}>
                  {recognitionStarted ? "LIVE" : "SETUP"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="px-6 py-4 border-b border-gray-200/50 bg-white/60 backdrop-blur-lg relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Left Controls */}
            <div className="flex flex-wrap gap-3">
              {sessionId && recognitionStarted && (
                <button
                  onClick={handleStopRecognition}
                  className="px-6 py-3 rounded-lg font-semibold bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-md hover:-translate-y-0.5"
                >
                  <Square className="w-5 h-5" />
                  Stop Recognition
                </button>
              )}

              {sessionId && (
                <button
                  onClick={handleEndSession}
                  disabled={endingSession}
                  className="px-6 py-3 rounded-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-900 transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-md hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {endingSession ? "Finalizing..." : "Finalize Session"}
                </button>
              )}

              {/* Demo recognition: start without creating a session */}
              {!sessionId && !recognitionStarted && (
                <button
                  onClick={() => {
                    setStatus("Create a session before starting recognition.");
                  }}
                  className="px-6 py-3 rounded-lg font-semibold bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-300 transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-md hover:-translate-y-0.5"
                >
                  <Play className="w-5 h-5" />
                  Session Required
                </button>
              )}

              <button
                onClick={() => router.push("/teacher/dashboard")}
                className="px-6 py-3 rounded-lg font-semibold bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300 transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-md hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </button>
            </div>

            {/* Right Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-gray-200">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  recognitionStarted ? "text-green-600" : 
                  sessionId ? "text-amber-600" : "text-gray-600"
                }`}>
                  {recognitionStarted ? "Active" : sessionId ? "Ready" : "Setup"}
                </span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-gray-200">
                <span className="text-gray-600">Students:</span>
                <span className="font-medium text-gray-800">
                  {recognizedStudents.length}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-gray-200">
                <span className="text-gray-600">Frame:</span>
                <span className={`font-medium ${processingFrame ? "text-amber-600" : "text-gray-700"}`}>
                  {processingFrame ? "Processing" : "Idle"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {!sessionId ? (
            /* Session Creation Form */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="bg-white/70 backdrop-blur-lg rounded-xl border-2 border-blue-200 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Create Attendance Session</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-gray-700 text-sm mb-2 block font-medium">Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      value={form.date} 
                      onChange={handleChange}
                      className="w-full p-3 rounded-lg bg-white/60 border border-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 text-sm mb-2 block font-medium">Subject</label>
                    <input 
                      type="text" 
                      name="subject" 
                      placeholder="Enter subject name"
                      value={form.subject} 
                      onChange={handleChange}
                      className="w-full p-3 rounded-lg bg-white/60 border border-gray-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="text-gray-700 text-sm mb-2 block font-medium">Department</label>
                    <select 
                      name="department" 
                      value={form.department} 
                      onChange={handleChange}
                      className="w-full p-3 rounded-lg bg-white/60 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-700 text-sm mb-2 block font-medium">Year</label>
                      <select 
                        name="year" 
                        value={form.year} 
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white/60 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="">Select Year</option>
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-700 text-sm mb-2 block font-medium">Division</label>
                      <select 
                        name="division" 
                        value={form.division} 
                        onChange={handleChange}
                        className="w-full p-3 rounded-lg bg-white/60 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="">Select Division</option>
                        {divisions.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={createSession}
                    className="w-full py-3 px-4 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-300 flex items-center justify-center gap-3 mt-6 hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Calendar className="w-5 h-5" />
                    Create Session
                  </button>

                  {status && (
                    <div className={`p-3 rounded-lg text-center ${
                      status.includes("✅") ? "bg-green-100 border border-green-300 text-green-700" :
                      status.includes("❌") ? "bg-red-100 border border-red-300 text-red-700" :
                      "bg-blue-100 border border-blue-300 text-blue-700"
                    }`}>
                      {status}
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white/70 backdrop-blur-lg rounded-xl border-2 border-purple-200 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">How to Start</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <h4 className="text-gray-800 font-medium mb-2">Session Setup</h4>
                    <ul className="text-gray-600 text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Fill in all the session details
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Click "Create Session" to initialize
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        Start face recognition when ready
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <h4 className="text-gray-800 font-medium mb-2">During Session</h4>
                    <ul className="text-gray-600 text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        Students face the camera clearly
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        Attendance is marked automatically
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        View recognized students in real-time
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Session Active View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Camera Section */}
              <div className="bg-white/70 backdrop-blur-lg rounded-xl border-2 border-purple-200 p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                    <Camera className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Live Camera Feed</h2>
                </div>

                {!recognitionStarted ? (
                  <div className="text-center py-12 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-10 h-10 text-gray-600" />
                    </div>
                    <p className="text-gray-600 font-medium mb-4">Ready to start recognition</p>
                    <button
                      onClick={handleStartRecognition}
                      className="px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all duration-300 flex items-center justify-center gap-3 mx-auto hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <Play className="w-5 h-5" />
                      Start Recognition
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                    <CameraCapture
                      isLiveMode={true}
                      onCapture={handleRecognize}
                      facesData={facesData}
                      captureIntervalMs={2000}
                    />
                  </div>
                )}
              </div>

              {/* Results Section */}
              <div className="space-y-6">
                {/* Status Card */}
                <div className="bg-white/70 backdrop-blur-lg rounded-xl border-2 border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Session Status</h2>
                  </div>

                  <div className={`p-4 rounded-lg border-2 transition-all ${
                    status.includes("✅") ? "bg-green-100 border-green-300" :
                    status.includes("❌") ? "bg-red-100 border-red-300" :
                    "bg-blue-100 border-blue-300"
                  }`}>
                    <p className={`font-semibold text-center ${
                      status.includes("✅") ? "text-green-700" :
                      status.includes("❌") ? "text-red-700" :
                      "text-blue-700"
                    }`}>
                      {status || "Waiting for recognition..."}
                    </p>
                  </div>
                </div>

                {/* Recognized Students */}
                <div className="bg-white/70 backdrop-blur-lg rounded-xl border-2 border-green-200 p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Recognized Students</h2>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-lg">
                      {recognizedStudents.length}
                    </span>
                  </div>

                  {recognizedStudents.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {recognizedStudents.map((student, index) => (
                          <div
                            key={student}
                            className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
                          >
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-800 font-medium truncate">{student}</p>
                              <p className="text-green-600 text-xs">Attendance marked</p>
                            </div>
                            <div className="text-gray-500 text-sm flex-shrink-0">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 rounded-lg bg-gray-50 border border-gray-200">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No students recognized yet</p>
                      <p className="text-gray-500 text-sm mt-1">Students will appear here when recognized</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
