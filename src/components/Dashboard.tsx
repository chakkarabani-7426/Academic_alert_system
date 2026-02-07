import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Alert, Student, RiskPrediction } from '../types';
import { AlertTriangle, Users, TrendingDown, CheckCircle } from 'lucide-react';
import StudentList from './StudentList';
import AlertList from './AlertList';
import StudentProfile from './StudentProfile';

interface DashboardStats {
  totalStudents: number;
  atRiskStudents: number;
  activeAlerts: number;
  averageAttendance: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    atRiskStudents: 0,
    activeAlerts: 0,
    averageAttendance: 0,
  });
  const [riskDistribution, setRiskDistribution] = useState({
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'alerts'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active');

      const { data: predictions } = await supabase
        .from('risk_predictions')
        .select('*')
        .order('prediction_date', { ascending: false });

      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .in('status', ['new', 'acknowledged', 'in_progress']);

      const latestPredictions = new Map();
      predictions?.forEach((pred: RiskPrediction) => {
        if (!latestPredictions.has(pred.student_id)) {
          latestPredictions.set(pred.student_id, pred);
        }
      });

      const atRisk = Array.from(latestPredictions.values()).filter(
        (p: RiskPrediction) => p.risk_level === 'high' || p.risk_level === 'critical'
      ).length;

      const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
      Array.from(latestPredictions.values()).forEach((p: RiskPrediction) => {
        distribution[p.risk_level]++;
      });

      setStats({
        totalStudents: students?.length || 0,
        atRiskStudents: atRisk,
        activeAlerts: alerts?.length || 0,
        averageAttendance: 0,
      });

      setRiskDistribution(distribution);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (selectedStudent) {
    return (
      <StudentProfile
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Academic Monitoring System
          </h1>
          <p className="text-slate-600">
            AI-powered student performance tracking and dropout prevention
          </p>
        </div>

        <div className="flex space-x-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'students'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alerts
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Students"
                value={stats.totalStudents}
                icon={Users}
                color="bg-blue-500"
                loading={loading}
              />
              <StatCard
                title="At-Risk Students"
                value={stats.atRiskStudents}
                icon={AlertTriangle}
                color="bg-red-500"
                loading={loading}
              />
              <StatCard
                title="Active Alerts"
                value={stats.activeAlerts}
                icon={TrendingDown}
                color="bg-orange-500"
                loading={loading}
              />
              <StatCard
                title="Performing Well"
                value={stats.totalStudents - stats.atRiskStudents}
                icon={CheckCircle}
                color="bg-green-500"
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  Risk Level Distribution
                </h2>
                <div className="space-y-4">
                  <RiskBar
                    label="Critical"
                    count={riskDistribution.critical}
                    total={stats.totalStudents}
                    color="bg-red-600"
                  />
                  <RiskBar
                    label="High"
                    count={riskDistribution.high}
                    total={stats.totalStudents}
                    color="bg-orange-500"
                  />
                  <RiskBar
                    label="Medium"
                    count={riskDistribution.medium}
                    total={stats.totalStudents}
                    color="bg-yellow-500"
                  />
                  <RiskBar
                    label="Low"
                    count={riskDistribution.low}
                    total={stats.totalStudents}
                    color="bg-green-500"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('students')}
                    className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors text-left"
                  >
                    View All Students
                  </button>
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors text-left"
                  >
                    Review Active Alerts
                  </button>
                  <button
                    onClick={loadDashboardData}
                    className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-left"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'students' && (
          <StudentList onSelectStudent={setSelectedStudent} />
        )}

        {activeTab === 'alerts' && <AlertList />}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function RiskBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-600">
          {count} ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
