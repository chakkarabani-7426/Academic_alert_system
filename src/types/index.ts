export interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  enrollment_date: string;
  grade_level: string;
  major: string;
  status: 'active' | 'suspended' | 'graduated' | 'dropped';
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  created_at: string;
}

export interface Assessment {
  id: string;
  student_id: string;
  assessment_name: string;
  assessment_type: 'exam' | 'quiz' | 'assignment' | 'project';
  subject: string;
  score: number;
  max_score: number;
  percentage: number;
  date: string;
  created_at: string;
}

export interface RiskPrediction {
  id: string;
  student_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  attendance_score: number;
  performance_score: number;
  trend_score: number;
  factors: any;
  prediction_date: string;
  created_at: string;
}

export interface Alert {
  id: string;
  student_id: string;
  risk_prediction_id?: string;
  alert_type: 'attendance' | 'performance' | 'dropout_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendations: string[];
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface StudentWithRisk extends Student {
  latest_risk?: RiskPrediction;
  attendance_rate?: number;
  average_grade?: number;
}
