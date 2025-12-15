const BACKEND_URL = 'http://localhost:3001';

// Типы из старого analyticsApi.ts
export interface PaymentStats {
  total: number;
  count: number;
  byPaySystem: { name: string; total: number; count: number }[];
  timeline: { date: string; total: number; label?: string }[];
}

export interface UserServiceStats {
  total: number;
  byStatus: { status: string; count: number }[];
  byService: { name: string; count: number }[];
  timeline: { date: string; count: number; label?: string }[];
}

export interface UserStats {
  total: number;
  newUsers: number;
  timeline: { date: string; count: number; label?: string }[];
}

export interface RevenueStats {
  totalRevenue: number;
  totalWithdraws: number;
  netRevenue: number;
  revenueTimeline: { date: string; total: number; label?: string }[];
  withdrawTimeline: { date: string; total: number; label?: string }[];
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

export interface TopCustomer {
  userId: number;
  username: string;
  totalSpent: number;
  paymentCount: number;
}

export interface MRRStats {
  mrr: number;
  activeSubscriptions: number;
  avgSubscriptionValue: number;
  mrrGrowth: number;
}

export interface TaskStats {
  pending: number;
  completed: number;
  failed: number;
  byEvent: { name: string; value: number }[];
}

export interface TopService {
  name: string;
  count: number;
  revenue: number;
}

export interface ServerStats {
  total: number;
  byGroup: { name: string; value: number }[];
}

export interface AnalyticsData {
  period: {
    type: string;
    days: number;
    startDate: string;
    endDate: string;
  };
  payments: PaymentStats;
  users: UserStats;
  revenue: RevenueStats;
  userServices: UserServiceStats;
  tasks: TaskStats;
  topServices: TopService[];
  servers: ServerStats;
  financial: FinancialMetrics;
  topCustomers: TopCustomer[];
  mrr: MRRStats;
}

/**
 * Загружает все данные аналитики за указанный период одним запросом
 */
export async function fetchAnalytics(period: 7 | 14 | 30 | 90 | 'month' = 'month'): Promise<AnalyticsData> {
  const response = await fetch(`${BACKEND_URL}/api/analytics?period=${period}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
