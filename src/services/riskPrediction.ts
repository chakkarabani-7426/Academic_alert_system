import { SupabaseClient } from '@supabase/supabase-js';

export interface RiskFactors {
  lowAttendance: boolean;
  decliningGrades: boolean;
  failingAssessments: boolean;
  recentAbsences: boolean;
  belowAveragePerformance: boolean;
}

export interface RiskPrediction {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  attendanceScore: number;
  performanceScore: number;
  trendScore: number;
  factors: RiskFactors;
}

export async function calculateRiskPrediction(
  supabase: SupabaseClient,
  studentId: string
): Promise<RiskPrediction> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data: attendanceRecords } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', studentId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  const { data: assessments } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  const { data: recentAssessments } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  const { data: olderAssessments } = await supabase
    .from('assessments')
    .select('*')
    .eq('student_id', studentId)
    .gte('date', sixtyDaysAgo.toISOString().split('T')[0])
    .lt('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  const attendanceScore = calculateAttendanceScore(attendanceRecords || []);
  const performanceScore = calculatePerformanceScore(assessments || []);
  const trendScore = calculateTrendScore(
    recentAssessments || [],
    olderAssessments || [],
    attendanceRecords || []
  );

  const riskScore = (
    attendanceScore * 0.4 +
    performanceScore * 0.4 +
    trendScore * 0.2
  );

  const factors = identifyRiskFactors(
    attendanceRecords || [],
    assessments || [],
    recentAssessments || [],
    attendanceScore,
    performanceScore
  );

  const riskLevel = determineRiskLevel(riskScore);

  return {
    riskLevel,
    riskScore: Math.round(riskScore),
    attendanceScore: Math.round(attendanceScore),
    performanceScore: Math.round(performanceScore),
    trendScore: Math.round(trendScore),
    factors,
  };
}

function calculateAttendanceScore(records: any[]): number {
  if (records.length === 0) return 50;

  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const excusedCount = records.filter(r => r.status === 'excused').length;

  const totalDays = records.length;
  const attendanceRate = ((presentCount + lateCount * 0.5 + excusedCount * 0.7) / totalDays) * 100;

  return 100 - attendanceRate;
}

function calculatePerformanceScore(assessments: any[]): number {
  if (assessments.length === 0) return 50;

  const recentAssessments = assessments.slice(0, Math.min(10, assessments.length));
  const averagePercentage = recentAssessments.reduce((sum, a) => sum + a.percentage, 0) / recentAssessments.length;

  const failingCount = recentAssessments.filter(a => a.percentage < 60).length;
  const failingRate = (failingCount / recentAssessments.length) * 100;

  return (100 - averagePercentage) * 0.7 + failingRate * 0.3;
}

function calculateTrendScore(
  recentAssessments: any[],
  olderAssessments: any[],
  attendanceRecords: any[]
): number {
  let trendScore = 0;

  if (recentAssessments.length > 0 && olderAssessments.length > 0) {
    const recentAvg = recentAssessments.reduce((sum, a) => sum + a.percentage, 0) / recentAssessments.length;
    const olderAvg = olderAssessments.reduce((sum, a) => sum + a.percentage, 0) / olderAssessments.length;
    const gradeTrend = olderAvg - recentAvg;
    trendScore += gradeTrend * 2;
  }

  if (attendanceRecords.length >= 10) {
    const recentAbsences = attendanceRecords.slice(0, 5).filter(r => r.status === 'absent').length;
    const olderAbsences = attendanceRecords.slice(5, 10).filter(r => r.status === 'absent').length;
    if (recentAbsences > olderAbsences) {
      trendScore += 20;
    }
  }

  return Math.max(0, Math.min(100, trendScore));
}

function identifyRiskFactors(
  attendanceRecords: any[],
  assessments: any[],
  recentAssessments: any[],
  attendanceScore: number,
  performanceScore: number
): RiskFactors {
  const recentAbsences = attendanceRecords.slice(0, 5).filter(r => r.status === 'absent').length;
  const failingAssessments = recentAssessments.filter(a => a.percentage < 60).length;

  const recentAvg = recentAssessments.length > 0
    ? recentAssessments.reduce((sum, a) => sum + a.percentage, 0) / recentAssessments.length
    : 75;

  const overallAvg = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + a.percentage, 0) / assessments.length
    : 75;

  return {
    lowAttendance: attendanceScore > 30,
    decliningGrades: recentAvg < overallAvg - 10,
    failingAssessments: failingAssessments >= 2,
    recentAbsences: recentAbsences >= 3,
    belowAveragePerformance: performanceScore > 40,
  };
}

function determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 70) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 30) return 'medium';
  return 'low';
}

export function generateRecommendations(prediction: RiskPrediction): string[] {
  const recommendations: string[] = [];
  const { factors, riskLevel } = prediction;

  if (factors.lowAttendance || factors.recentAbsences) {
    recommendations.push('Schedule a meeting with the student to discuss attendance concerns');
    recommendations.push('Contact parents/guardians about frequent absences');
    recommendations.push('Investigate potential barriers to attendance (transportation, health, etc.)');
  }

  if (factors.failingAssessments || factors.belowAveragePerformance) {
    recommendations.push('Arrange tutoring or academic support sessions');
    recommendations.push('Review learning materials and study strategies with the student');
    recommendations.push('Consider adjusting teaching approach or providing additional resources');
  }

  if (factors.decliningGrades) {
    recommendations.push('Conduct academic performance review with the student');
    recommendations.push('Identify specific subjects or topics causing difficulty');
    recommendations.push('Develop a personalized improvement plan with measurable goals');
  }

  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('Assign an academic advisor for regular check-ins');
    recommendations.push('Consider counseling services to address any personal issues');
    recommendations.push('Implement an early intervention program');
    recommendations.push('Schedule a meeting with parents, student, and academic team');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring student progress');
    recommendations.push('Maintain regular communication with the student');
  }

  return recommendations;
}

export async function generateAlert(
  supabase: SupabaseClient,
  studentId: string,
  prediction: RiskPrediction,
  predictionId: string
): Promise<void> {
  const { data: student } = await supabase
    .from('students')
    .select('first_name, last_name')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) return;

  const recommendations = generateRecommendations(prediction);

  let message = '';
  let alertType = 'dropout_risk';

  if (prediction.riskLevel === 'critical') {
    message = `CRITICAL: ${student.first_name} ${student.last_name} is at severe risk of dropping out. Immediate intervention required.`;
  } else if (prediction.riskLevel === 'high') {
    message = `HIGH RISK: ${student.first_name} ${student.last_name} shows significant warning signs. Urgent attention needed.`;
  } else if (prediction.riskLevel === 'medium') {
    message = `MODERATE RISK: ${student.first_name} ${student.last_name} requires monitoring and support.`;
  } else {
    message = `LOW RISK: ${student.first_name} ${student.last_name} is performing adequately but continue monitoring.`;
  }

  if (prediction.factors.lowAttendance || prediction.factors.recentAbsences) {
    alertType = 'attendance';
  } else if (prediction.factors.failingAssessments || prediction.factors.belowAveragePerformance) {
    alertType = 'performance';
  }

  await supabase.from('alerts').insert({
    student_id: studentId,
    risk_prediction_id: predictionId,
    alert_type: alertType,
    severity: prediction.riskLevel,
    message,
    recommendations,
    status: 'new',
  });
}
