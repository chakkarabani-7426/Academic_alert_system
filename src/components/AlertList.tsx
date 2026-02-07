import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Alert, Student } from '../types';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface AlertWithStudent extends Alert {
  student?: Student;
}

export default function AlertList() {
  const [alerts, setAlerts] = useState<AlertWithStudent[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter]);

  async function loadAlerts() {
    setLoading(true);
    try {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          student:students(*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data } = await query;

      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateAlertStatus(alertId: string, newStatus: string) {
    const updates: any = { status: newStatus };

    if (newStatus === 'acknowledged') {
      updates.acknowledged_at = new Date().toISOString();
    } else if (newStatus === 'resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    await supabase.from('alerts').update(updates).eq('id', alertId);

    loadAlerts();
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <SeverityIcon severity={alert.severity} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                    <TypeBadge type={alert.alert_type} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {alert.student
                      ? `${alert.student.first_name} ${alert.student.last_name}`
                      : 'Unknown Student'}
                  </h3>
                  <p className="text-slate-700 mb-3">{alert.message}</p>
                  <p className="text-sm text-slate-500">
                    Created: {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {alert.recommendations && alert.recommendations.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                  Recommended Actions:
                </h4>
                <ul className="space-y-2">
                  {alert.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              {alert.status === 'new' && (
                <>
                  <button
                    onClick={() => updateAlertStatus(alert.id, 'acknowledged')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => updateAlertStatus(alert.id, 'in_progress')}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Start Working
                  </button>
                </>
              )}
              {(alert.status === 'acknowledged' || alert.status === 'in_progress') && (
                <button
                  onClick={() => updateAlertStatus(alert.id, 'resolved')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-slate-600">No alerts found matching your criteria</p>
        </div>
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const icons = {
    critical: <XCircle className="w-6 h-6 text-red-600" />,
    high: <AlertCircle className="w-6 h-6 text-orange-600" />,
    medium: <AlertCircle className="w-6 h-6 text-yellow-600" />,
    low: <Clock className="w-6 h-6 text-blue-600" />,
  };

  return icons[severity as keyof typeof icons] || icons.low;
}

function SeverityBadge({ severity }: { severity: string }) {
  const configs = {
    critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
    low: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Low' },
  };

  const config = configs[severity as keyof typeof configs] || configs.low;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    new: { bg: 'bg-slate-100', text: 'text-slate-800', label: 'New' },
    acknowledged: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Acknowledged' },
    in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Progress' },
    resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
  };

  const config = configs[status as keyof typeof configs] || configs.new;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const configs = {
    attendance: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Attendance' },
    performance: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Performance' },
    dropout_risk: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dropout Risk' },
  };

  const config = configs[type as keyof typeof configs] || configs.dropout_risk;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
