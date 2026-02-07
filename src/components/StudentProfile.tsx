import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, Assessment, AttendanceRecord, RiskPrediction, Alert } from '../types';
import { ArrowLeft, Calendar, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import { calculateRiskPrediction, generateAlert } from '../services/riskPrediction';

interface StudentProfileProps {
  student: Student;
  onBack: () => void;
}

export default function StudentProfile({ student, onBack }: StudentProfileProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [riskPredictions, setRiskPredictions] = useState<RiskPrediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, [student.id]);

  async function loadStudentData() {
    setLoading(true);
    try {
      const [assessmentsData, attendanceData, predictionsData, alertsData] = await Promise.all([
        supabase.from('assessments').select('*').eq('student_id', student.id).order('date', { ascending: false }),
        supabase.from('attendance_records').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(30),
        supabase.from('risk_predictions').select('*').eq('student_id', student.id).order('prediction_date', { ascending: false }),
        supabase.from('alerts').select('*').eq('student_id', student.id).order('created_at', { ascending: false }),
      ]);

      setAssessments(assessmentsData.data || []);
      setAttendance(attendanceData.data || []);
      setRiskPredictions(predictionsData.data || []);
      setAlerts(alertsData.data || []);
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeStudent() {
    setAnalyzing(true);
    try {
      const prediction = await calculateRiskPrediction(supabase, student.id);

      const { data: predictionRecord } = await supabase
        .from('risk_predictions')
        .insert({
          student_id: student.id,
          risk_level: prediction.riskLevel,
          risk_score: prediction.riskScore,
          attendance_score: prediction.attendanceScore,
          performance_score: prediction.performanceScore,
          trend_score: prediction.trendScore,
          factors: prediction.factors,
        })
        .select()
        .single();

      if (predictionRecord) {
        await generateAlert(supabase, student.id, prediction, predictionRecord.id);
      }

      await loadStudentData();
    } catch (error) {
      console.error('Error analyzing student:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  const latestRisk = riskPredictions[0];
  const attendanceRate = attendance.length > 0
    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
    : 0;
  const averageGrade = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + a.percentage, 0) / assessments.length
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Students
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {student.first_name} {student.last_name}
              </h1>
              <div className="space-y-1 text-slate-600">
                <p>Student ID: {student.student_id}</p>
                <p>Email: {student.email}</p>
                <p>Grade Level: {student.grade_level}</p>
                <p>Major: {student.major}</p>
                <p>Enrolled: {new Date(student.enrollment_date).toLocaleDateString()}</p>
              </div>
            </div>
            <button
              onClick={analyzeStudent}
              disabled={analyzing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
            >
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Attendance Rate</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {attendanceRate.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Last 30 days: {attendance.length} records
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-slate-900">Average Grade</h3>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {averageGrade.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {assessments.length} assessments
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-slate-900">Risk Level</h3>
            </div>
            {latestRisk ? (
              <>
                <div className="mb-2">
                  <RiskBadge level={latestRisk.risk_level} />
                </div>
                <p className="text-sm text-slate-600">
                  Score: {latestRisk.risk_score} / 100
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">Not yet analyzed</p>
            )}
          </div>
        </div>

        {latestRisk && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Risk Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <ScoreBar
                label="Attendance Risk"
                score={latestRisk.attendance_score}
                color="bg-blue-600"
              />
              <ScoreBar
                label="Performance Risk"
                score={latestRisk.performance_score}
                color="bg-green-600"
              />
              <ScoreBar
                label="Trend Risk"
                score={latestRisk.trend_score}
                color="bg-orange-600"
              />
            </div>

            {latestRisk.factors && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Risk Factors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <RiskFactor
                    label="Low Attendance"
                    active={latestRisk.factors.lowAttendance}
                  />
                  <RiskFactor
                    label="Declining Grades"
                    active={latestRisk.factors.decliningGrades}
                  />
                  <RiskFactor
                    label="Failing Assessments"
                    active={latestRisk.factors.failingAssessments}
                  />
                  <RiskFactor
                    label="Recent Absences"
                    active={latestRisk.factors.recentAbsences}
                  />
                  <RiskFactor
                    label="Below Average Performance"
                    active={latestRisk.factors.belowAveragePerformance}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Recent Assessments
            </h2>
            <div className="space-y-3">
              {assessments.slice(0, 5).map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {assessment.assessment_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {assessment.subject} • {new Date(assessment.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      {assessment.percentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-600">
                      {assessment.score}/{assessment.max_score}
                    </p>
                  </div>
                </div>
              ))}
              {assessments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No assessments recorded
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Recent Attendance
            </h2>
            <div className="space-y-2">
              {attendance.slice(0, 10).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <p className="text-sm text-slate-900">
                    {new Date(record.date).toLocaleDateString()}
                  </p>
                  <AttendanceStatusBadge status={record.status} />
                </div>
              ))}
              {attendance.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  No attendance records
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const configs = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
    low: { bg: 'bg-green-100', text: 'text-green-800', label: 'Low' },
  };

  const config = configs[level as keyof typeof configs] || configs.low;

  return (
    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{score}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function RiskFactor({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg ${
        active ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-600'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          active ? 'bg-red-600' : 'bg-slate-400'
        }`}
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function AttendanceStatusBadge({ status }: { status: string }) {
  const configs = {
    present: { bg: 'bg-green-100', text: 'text-green-800', label: 'Present' },
    absent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' },
    late: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Late' },
    excused: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Excused' },
  };

  const config = configs[status as keyof typeof configs] || configs.present;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
