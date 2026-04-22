"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusPill from "../../components/StatusPill";
import { AttendanceRecord, AttendanceStats, SessionHistoryItem } from "../../models/attendance";
import { apiRequest } from "../../services/api";
import { formatDisplayDate, formatDisplayTime } from "../../utils/format";

export default function ViewAttendance() {
  const router = useRouter();
  const [attendanceData, setAttendanceData] = useState<Array<AttendanceRecord & { _id: string }>>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [stats, setStats] = useState<AttendanceStats>({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
  });
  const [searched, setSearched] = useState(false);

  const fetchAttendanceData = async () => {
    if (!selectedDate && !filterDepartment) {
      alert("Please select at least one filter.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set("date", selectedDate);
      if (filterDepartment) params.set("department", filterDepartment);
      if (filterYear) params.set("year", filterYear);
      if (filterDivision) params.set("division", filterDivision);
      if (filterSubject) params.set("subject", filterSubject);
      if (filterStudentId) params.set("student_id", filterStudentId);

      const data = await apiRequest<{ attendance: AttendanceRecord[]; stats: AttendanceStats; history: SessionHistoryItem[] }>(
        `/api/attendance?${params.toString()}`
      );
      const mappedData = data.attendance.map((record, idx) => ({
        ...record,
        _id: `${record.studentId}-${record.date}-${idx}`,
      }));
      setAttendanceData(mappedData);
      setStats(data.stats);
      setHistory(data.history || []);
      setSearched(true);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.set("date", selectedDate);
      if (filterDepartment) params.set("department", filterDepartment);
      if (filterYear) params.set("year", filterYear);
      if (filterDivision) params.set("division", filterDivision);
      if (filterSubject) params.set("subject", filterSubject);

      const data = await apiRequest<{ data: AttendanceRecord[] }>(`/api/attendance/export?${params.toString()}`);
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(data.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
      XLSX.writeFile(workbook, `attendance_${selectedDate || "export"}.xlsx`);
    } catch (error) {
      console.error("Error exporting excel:", error);
    }
  };

  return (
    <main className="min-h-screen bg-transparent p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Attendance records</h1>
            <p className="text-slate-600">Search attendance, review session history, and export reports.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                <select
                  value={filterDivision}
                  onChange={(e) => setFilterDivision(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">All Divisions</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  placeholder="Subject name"
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  value={filterStudentId}
                  onChange={(e) => setFilterStudentId(e.target.value)}
                  placeholder="Student Id"
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-sky-200"
                >
                  <option value="">All Departments</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="IT">IT</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={fetchAttendanceData}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Search
              </button>
              <button
                onClick={exportExcel}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {attendanceData.length > 0 && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="rounded-[24px] bg-white/90 p-6 text-center shadow-lg shadow-slate-900/5">
              <div className="text-3xl font-bold text-blue-600">{stats.totalStudents}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
            <div className="rounded-[24px] bg-white/90 p-6 text-center shadow-lg shadow-slate-900/5">
              <div className="text-3xl font-bold text-green-600">{stats.presentToday}</div>
              <div className="text-sm text-gray-600">Present Today</div>
            </div>
            <div className="rounded-[24px] bg-white/90 p-6 text-center shadow-lg shadow-slate-900/5">
              <div className="text-3xl font-bold text-red-600">{stats.absentToday}</div>
              <div className="text-sm text-gray-600">Absent Today</div>
            </div>
            <div className="rounded-[24px] bg-white/90 p-6 text-center shadow-lg shadow-slate-900/5">
              <div className="text-3xl font-bold text-purple-600">{stats.attendanceRate}%</div>
              <div className="text-sm text-gray-600">Attendance Rate</div>
            </div>
          </div>
        )}

        <div className="mb-8 rounded-[28px] bg-white/90 shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Attendance {selectedDate ? `for ${new Date(selectedDate).toLocaleDateString()}` : ""}
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading attendance data...</p>
            </div>
          ) : !searched ? (
            <div className="p-8 text-center text-gray-500">
              Please apply filters and click <b>Search</b> to view attendance records.
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No attendance records found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.studentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDisplayDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDisplayTime(record.markedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusPill label={record.status} tone={record.status === "present" ? "success" : "danger"} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.markedAt ? "Captured" : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[28px] bg-white/90 p-6 shadow-xl shadow-slate-900/5">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Session history</h2>
            <p className="text-sm text-slate-500">Recent sessions matching your filters.</p>
          </div>
          {history.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {history.map((item) => (
                <div key={item.sessionId} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.subject}</p>
                    <StatusPill label={item.finalized ? "Closed" : "Open"} tone={item.finalized ? "neutral" : "warning"} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{formatDisplayDate(item.date)}</p>
                  <p className="mt-3 text-sm text-slate-600">{item.department} • {item.year} • Division {item.division}</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {item.presentCount} / {item.studentCount} present
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No matching sessions yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
