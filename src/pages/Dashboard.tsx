import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Server,
  CreditCard,
  Activity,
  TrendingUp,
  ArrowRight,
  Clock,
  DollarSign,
  CheckCircle,
  RefreshCw,
  Repeat,
  Target,
  PieChart,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { StatCard, StatCardGrid, ChartCard } from '../components/analytics';
import { AreaLineChart, BarChart } from '../components/charts';
import { useCacheStore } from '../store/cacheStore';
import {
  fetchDashboardAnalytics,
  DashboardAnalytics,
  AnalyticsStats,
  PaymentStats,
  UserServiceStats,
  RevenueStats,
  FinancialMetrics,
  MRRStats,
} from '../lib/dashboardApi';

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: '#22c55e',
    active: '#22c55e',
    BLOCK: '#ef4444',
    block: '#ef4444',
    NOT_PAID: '#f59e0b',
    not_paid: '#f59e0b',
    PROGRESS: '#3b82f6',
    progress: '#3b82f6',
    WAIT_PAYMENT: '#f59e0b',
  };
  return colors[status] || '#6b7280';
}

function Dashboard() {
  const { settings, get: getCached, set: setCache, needsBackgroundRefresh } = useCacheStore();
  const [loading, setLoading] = useState(true);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const backgroundRefreshRef = useRef(false);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [serviceStats, setServiceStats] = useState<UserServiceStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [mrrStats, setMrrStats] = useState<MRRStats | null>(null);

  const cacheKey = 'dashboard_main';

  const fetchDashboardData = async (forceRefresh = false) => {
    if (!forceRefresh && settings.enabled) {
      const cached = getCached(cacheKey);
      if (cached) {
        setStats(cached.stats);
        setPaymentStats(cached.paymentStats);
        setServiceStats(cached.serviceStats);
        setRevenueStats(cached.revenueStats);
        setFinancialMetrics(cached.financialMetrics);
        setMrrStats(cached.mrrStats);
        setLoading(false);

        if (needsBackgroundRefresh(cacheKey) && !backgroundRefreshRef.current) {
          backgroundRefreshRef.current = true;
          setIsBackgroundRefresh(true);
          fetchDashboardData(true);
        }
        return;
      }
    }

    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    
    try {
      // ОДИН запрос вместо 36!
      const analytics = await fetchDashboardAnalytics(7);
      
      // Преобразуем данные в старый формат для совместимости
      const mainStats: AnalyticsStats = {
        totalUsers: analytics.counts.totalUsers,
        totalServices: analytics.counts.totalServices,
        totalServers: analytics.counts.totalServers,
        activeUserServices: analytics.counts.activeUserServices,
        totalRevenue: analytics.revenue.totalRevenue,
        recentPayments: analytics.counts.recentPayments,
        totalWithdraws: analytics.counts.totalWithdraws,
        pendingTasks: analytics.counts.pendingTasks,
      };
      
      const payments: PaymentStats = {
        total: analytics.payments.total,
        count: analytics.payments.count,
        byPaySystem: analytics.payments.byPaySystem,
        timeline: analytics.payments.timeline.map(t => ({
          ...t,
          label: new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        })),
      };
      
      const services: UserServiceStats = {
        total: analytics.services.total,
        byStatus: analytics.services.byStatus.map(s => ({
          ...s,
          color: getStatusColor(s.name),
        })),
        byService: analytics.services.topServices.map(s => ({ name: s.name, value: s.count })),
        timeline: [],
      };
      
      const revenue: RevenueStats = {
        totalRevenue: analytics.revenue.totalRevenue,
        totalWithdraws: analytics.revenue.totalWithdraws,
        netRevenue: analytics.revenue.netRevenue,
        revenueTimeline: analytics.revenue.revenueTimeline.map(t => ({
          ...t,
          label: new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        })),
        withdrawTimeline: analytics.revenue.withdrawTimeline.map(t => ({
          ...t,
          label: new Date(t.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        })),
      };
      
      const financial: FinancialMetrics = {
        arpu: analytics.financial.arpu,
        arppu: analytics.financial.arppu,
        ltv: analytics.financial.arpu * 12,
        churnRate: 0,
        payingUsersCount: analytics.financial.payingUsersCount,
        totalUsers: analytics.financial.totalUsers,
        avgRevenuePerPayment: analytics.payments.count > 0 ? analytics.payments.total / analytics.payments.count : 0,
        avgPaymentsPerUser: analytics.financial.payingUsersCount > 0 ? analytics.payments.count / analytics.financial.payingUsersCount : 0,
        conversionRate: analytics.financial.conversionRate,
      };
      
      const mrr: MRRStats = {
        mrr: analytics.mrr.mrr,
        activeSubscriptions: analytics.mrr.activeSubscriptions,
        avgSubscriptionValue: analytics.mrr.avgSubscriptionValue,
        mrrGrowth: 0,
      };

      const data = {
        stats: mainStats,
        paymentStats: payments,
        serviceStats: services,
        revenueStats: revenue,
        financialMetrics: financial,
        mrrStats: mrr,
      };

      setStats(mainStats);
      setPaymentStats(payments);
      setServiceStats(services);
      setRevenueStats(revenue);
      setFinancialMetrics(financial);
      setMrrStats(mrr);

      if (settings.enabled) {
        setCache(cacheKey, data);
      }

      if (isBackgroundRefresh) {
        setIsBackgroundRefresh(false);
        backgroundRefreshRef.current = false;
      }
      
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatMoney = (value: number) => `${value.toLocaleString()} ₽`;
  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  return (
    <div>
      {}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-xl font-bold">Главная</h2>
            <p style={{ color: 'var(--theme-content-text-muted)' }}>
              Обзор системы SHM
            </p>
          </div>
          {settings.enabled && !loading && !isBackgroundRefresh && getCached(cacheKey) && (
            <span 
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
              style={{ 
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                color: 'var(--theme-primary-color)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
              }}
              title="Данные загружены из кеша"
            >
              <Activity className="w-3 h-3" />
              Кеш
            </span>
          )}
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {}
      <StatCardGrid columns={4}>
        <StatCard
          title="Пользователи"
          value={stats?.totalUsers ?? '...'}
          icon={Users}
          color="cyan"
          loading={loading}
          onClick={() => window.location.href = '/users'}
        />
        <StatCard
          title="Услуги пользователей"
          value={stats?.activeUserServices ?? '...'}
          icon={Package}
          color="emerald"
          loading={loading}
          onClick={() => window.location.href = '/user-services'}
        />
        <StatCard
          title="Серверы"
          value={stats?.totalServers ?? '...'}
          icon={Server}
          color="violet"
          loading={loading}
          onClick={() => window.location.href = '/servers'}
        />
        <StatCard
          title="Задачи в очереди"
          value={stats?.pendingTasks ?? '...'}
          icon={Clock}
          color="amber"
          loading={loading}
          onClick={() => window.location.href = '/spool'}
        />
      </StatCardGrid>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatCard
          title="Выручка (7 дней)"
          value={revenueStats ? formatMoney(revenueStats.totalRevenue) : '...'}
          icon={DollarSign}
          color="emerald"
          loading={loading}
        />
        <StatCard
          title="Списания (7 дней)"
          value={revenueStats ? formatMoney(revenueStats.totalWithdraws) : '...'}
          icon={ArrowDownRight}
          color="rose"
          loading={loading}
        />
        <StatCard
          title="Чистая прибыль"
          value={revenueStats ? formatMoney(revenueStats.netRevenue) : '...'}
          icon={revenueStats && revenueStats.netRevenue >= 0 ? ArrowUpRight : ArrowDownRight}
          color={revenueStats && revenueStats.netRevenue >= 0 ? 'emerald' : 'rose'}
          loading={loading}
        />
      </div>

      {
}
      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {}
        <ChartCard
          title="Динамика платежей"
          subtitle="За последние 7 дней"
          icon={TrendingUp}
          iconColor="text-cyan-400"
          loading={loading}
        >
          {paymentStats && paymentStats.timeline.length > 0 ? (
            <AreaLineChart
              data={paymentStats.timeline}
              height={220}
              color="#22d3ee"
              valueFormatter={formatMoney}
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных о платежах
            </div>
          )}
        </ChartCard>
        <ChartCard
          title="Услуги по статусу"
          subtitle="Текущее распределение"
          icon={Package}
          iconColor="text-violet-400"
          loading={loading}
          actions={
            <Link 
              to="/user-services" 
              className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-primary-color)' }}
            >
              Все услуги <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {serviceStats && serviceStats.byStatus.length > 0 ? (
            <BarChart
              data={serviceStats.byStatus}
              height={220}
              layout="vertical"
            />
          ) : (
            <div className="flex items-center justify-center h-[220px]" style={{ color: 'var(--theme-content-text-muted)' }}>
              Нет данных об услугах
            </div>
          )}
        </ChartCard>
      </div>

      {}
      <div className="mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { to: '/users', icon: Users, label: 'Пользователи', color: 'cyan' },
            { to: '/user-services', icon: Package, label: 'Услуги', color: 'emerald' },
            { to: '/pays', icon: CreditCard, label: 'Платежи', color: 'violet' },
            { to: '/servers', icon: Server, label: 'Серверы', color: 'amber' },
            { to: '/spool', icon: Activity, label: 'Задачи', color: 'rose' },
            { to: '/analytics', icon: TrendingUp, label: 'Аналитика', color: 'blue' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-400`} />
              </div>
              <span className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
