export interface MatchResult {
  user_id: string;
  name: string;
}

export interface RecognitionFace {
  box: [number, number, number, number];
  match: MatchResult | null;
  confidence?: number | null;
  status?: string;
  message?: string;
  already_marked?: boolean;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string;
  subject: string;
  department: string;
  year: string;
  division: string;
  status: "present" | "absent";
  markedAt?: string | null;
}

export interface AttendanceStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
}

export interface SessionHistoryItem {
  sessionId: string;
  date: string;
  subject: string;
  department: string;
  year: string;
  division: string;
  finalized: boolean;
  presentCount: number;
  studentCount: number;
}
