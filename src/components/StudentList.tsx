import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, RiskPrediction } from '../types';
import { Search, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateRiskPrediction, generateAlert } from '../services/riskPrediction';

interface StudentWithRisk extends Student {
  latestRisk?: RiskPrediction;
}

interface StudentListProps {
  onSelectStudent: (student: Student) => void;
}

export default function StudentList({ onSelectStudent }: StudentListProps) {
  const [students, setStudents] = useState<StudentWithRisk[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithRisk[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, riskFilter, students]);

  async function loadStudents() {
    setLoading(true);
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('last_name');

      const { data: predictions } = await supabase
        .from('risk_predictions')
        .select('*')
        .order('prediction_date', { ascending: false });

      const latestPredictions = new Map();
      predictions?.forEach((pred: RiskPrediction) => {
        if (!latestPredictions.has(pred.student_id)) {
          latestPredictions.set(pred.student_id, pred);
        }
      });

      const studentsWithRisk = studentsData?.map((student) => ({
        ...student,
        latestRisk: latestPredictions.get(student.id),
      })) || [];

      setStudents(studentsWithRisk);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterStudents() {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(
        (student) => student.latestRisk?.risk_level === riskFilter
      );
    }

    setFilteredStudents(filtered);
  }

  async function analyzeAllStudents() {
    setAnalyzing(true);
    try {
      for (const student of students) {
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

        if (predictionRecord && prediction.riskLevel !== 'low') {
          await generateAlert(supabase, student.id, prediction, predictionRecord.id);
        }
      }

      await loadStudents();
    } catch (error) {
      console.error('Error analyzing students:', error);
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search students by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <button
          onClick={analyzeAllStudents}
          disabled={analyzing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
        >
          {analyzing ? 'Analyzing...' : 'Analyze All'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Grade Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Major
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Risk Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => onSelectStudent(student)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-slate-900">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-slate-500">{student.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {student.student_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {student.grade_level}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {student.major}
                  </td>
                  <td className="px-6 py-4">
                    {student.latestRisk ? (
                      <RiskBadge level={student.latestRisk.risk_level} />
                    ) : (
                      <span className="text-sm text-slate-400">Not analyzed</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {student.latestRisk ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {student.latestRisk.risk_score}
                        </span>
                        {student.latestRisk.trend_score > 50 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No students found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const configs = {
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Critical',
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      label: 'High',
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Medium',
    },
    low: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Low',
    },
  };

  const config = configs[level as keyof typeof configs] || configs.low;

  return (
    <span
      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
