export enum Severity {
  CRITICAL = 'Critical',
  WARNING = 'Warning',
  INFO = 'Info'
}

export interface Issue {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  affectedCode: string;
  replacementCode: string;
  estimatedEndOfLife: string; // ISO Date String or "Unknown"
  documentationUrl?: string;
  category: 'Security' | 'Deprecation' | 'Performance' | 'Standard';
}

export interface AnalysisReport {
  overallHealthScore: number; // 0 to 100
  summary: string;
  issues: Issue[];
  timestamp: string;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}
