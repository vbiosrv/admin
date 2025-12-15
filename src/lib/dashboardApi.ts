const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';

export interface AnalyticsStats {
  totalUsers: number;
  totalServices: number;
  totalServers: number;
  activeUserServices: number;
  totalRevenue: number;
  recentPayments: number;
  totalWithdraws: number;
  pendingTasks: number;
}

export interface PaymentStats {
  total: number;
  count: number;
  byPaySystem: { name: string; value: number }[];
  timeline: { date: string; value: number; label?: string }[];
}

export interface UserServiceStats {
  total: number;
  byStatus: { name: string; value: number; color: string }[];
  byService: { name: string; value: number }[];
  timeline: { date: string; value: number; label?: string }[];
}

export interface RevenueStats {
  totalRevenue: number;
  totalWithdraws: number;
  netRevenue: number;
  revenueTimeline: { date: string; value: number; label?: string }[];
  withdrawTimeline: { date: string; value: number; label?: string }[];
}

export interface FinancialMetrics {
  arpu: number;
  arppu: number;
  ltv: number;
  churnRate: number;
  payingUsersCount: number;
  totalUsers: number;
  avgRevenuePerPayment: number;
  avgPaymentsPerUser: number;
  conversionRate: number;
}

export interface MRRStats {
  mrr: number;
  activeSubscriptions: number;
  avgSubscriptionValue: number;
  mrrGrowth: number;
}

export interface DashboardAnalytics {
  counts: {
    totalUsers: number;
    totalServices: number;
    totalServers: number;
    activeUserServices: number;
    recentPayments: number;
    totalWithdraws: number;
    pendingTasks: number;
  };
  payments: {
    total: number;
    count: number;
    byPaySystem: { name: string; value: number }[];
    timeline: { date: string; value: number }[];
  };
  users: {
    total: number;
    newUsers: number;
    timeline: { date: string; value: number }[];
  };
  revenue: {
    totalRevenue: number;
    totalWithdraws: number;
    netRevenue: number;
    revenueTimeline: { date: string; value: number }[];
    withdrawTimeline: { date: string; value: number }[];
  };
  services: {
    total: number;
    byStatus: { name: string; value: number }[];
    topServices: { name: string; count: number; revenue: number }[];
  };
  servers: {
    total: number;
    byGroup: { name: string; value: number }[];
  };
  financial: {
    arpu: number;
    arppu: number;
    payingUsersCount: number;
    totalUsers: number;
    conversionRate: number;
  };
  mrr: {
    mrr: number;
    activeSubscriptions: number;
    avgSubscriptionValue: number;
  };
  recent: {
    payments: any[];
    tasks: any[];
  };
}

export async function fetchDashboardAnalytics(period: number = 7): Promise<DashboardAnalytics> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/dashboard/analytics?period=${period}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    throw error;
  }
}
