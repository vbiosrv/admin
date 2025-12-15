import express from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'shm',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DATABASE || 'shm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let mysqlConnected = false;

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('[Redis] Max retry attempts reached, giving up');
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`[Redis] Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  lazyConnect: false,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

let redisConnected = false;

redis.on('connect', () => {
  console.log(`[Redis] Connected to ${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`);
  redisConnected = true;
});

redis.on('ready', () => {
  console.log('[Redis] Ready to accept commands');
  redisConnected = true;
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
  redisConnected = false;
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
  redisConnected = false;
});

const DEFAULT_BRANDING = {
  appName: 'SHM Admin',
  appTitle: 'SHM Admin',
  logoUrl: '',
  primaryColor: '#22d3ee',
  loginTitle: 'SHM Admin',
  loginSubtitle: 'Добро пожаловать',
};

async function initDatabase() {
  try {
    console.log(`[MySQL] Connecting to ${process.env.MYSQL_HOST || 'mysql'}:${process.env.MYSQL_PORT || '3306'}/${process.env.DB_NAME || 'shm'}`);
    const connection = await pool.getConnection();
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    const [rows] = await connection.execute(
      'SELECT setting_value FROM admin_settings WHERE setting_key = ?',
      ['branding']
    );
    
    if (rows.length === 0) {
      await connection.execute(
        'INSERT INTO admin_settings (setting_key, setting_value) VALUES (?, ?)',
        ['branding', JSON.stringify(DEFAULT_BRANDING)]
      );
    }
    
    connection.release();
    mysqlConnected = true;
    console.log('[MySQL] Connected and initialized');
  } catch (error) {
    console.error('[MySQL] Connection failed:', error.message);
    mysqlConnected = false;
  }
}

initDatabase();

app.use(cors());
app.use(express.json());

console.log('[Backend] Starting server...');
console.log('[Backend] Environment:');
console.log(`  - MYSQL_HOST: ${process.env.MYSQL_HOST || 'mysql'}`);
console.log(`  - DB_NAME: ${process.env.DB_NAME || 'shm'}`);
console.log(`  - REDIS_HOST: ${process.env.REDIS_HOST || 'redis'}`);
console.log(`  - PORT: ${PORT}`);

const CACHE_PREFIX = 'shm-admin:cache:';
const BRANDING_CACHE_KEY = 'shm-admin:branding';

app.get('/api/branding', async (req, res) => {
  try {
    if (redisConnected) {
      const cached = await redis.get(BRANDING_CACHE_KEY);
      if (cached) {
        console.log('[Branding] Cache hit');
        return res.json(JSON.parse(cached));
      } else {
        console.log('[Branding] Cache miss');
      }
    } else {
      console.log('[Branding] Redis not connected, skipping cache');
    }
    
    if (mysqlConnected) {
      const [rows] = await pool.execute(
        'SELECT setting_value FROM admin_settings WHERE setting_key = ?',
        ['branding']
      );
      
      if (rows.length > 0) {
        const branding = rows[0].setting_value;
        
        if (redisConnected) {
          await redis.setex(BRANDING_CACHE_KEY, 3600, JSON.stringify(branding));
          console.log('[Branding] Cached for 3600s');
        }
        
        return res.json(branding);
      }
    }
    
    console.log('[Branding] Using default branding');
    res.json(DEFAULT_BRANDING);
  } catch (error) {
    console.error('[Branding] Error:', error.message);
    res.json(DEFAULT_BRANDING);
  }
});

app.post('/api/branding', async (req, res) => {
  try {
    const branding = { ...DEFAULT_BRANDING, ...req.body };
    
    if (mysqlConnected) {
      await pool.execute(
        `INSERT INTO admin_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['branding', JSON.stringify(branding), JSON.stringify(branding)]
      );
      
      if (redisConnected) {
        await redis.del(BRANDING_CACHE_KEY);
      }
      
      return res.json({ success: true, data: branding });
    }
    
    res.status(500).json({ success: false, error: 'Database not connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save branding' });
  }
});

app.delete('/api/branding', async (req, res) => {
  try {
    if (mysqlConnected) {
      await pool.execute(
        'UPDATE admin_settings SET setting_value = ? WHERE setting_key = ?',
        [JSON.stringify(DEFAULT_BRANDING), 'branding']
      );
      
      if (redisConnected) {
        await redis.del(BRANDING_CACHE_KEY);
      }
      
      return res.json({ success: true, data: DEFAULT_BRANDING });
    }
    
    res.status(500).json({ success: false, error: 'Database not connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reset branding' });
  }
});

app.get('/api/settings/:key', async (req, res) => {
  try {
    if (mysqlConnected) {
      const [rows] = await pool.execute(
        'SELECT setting_value FROM admin_settings WHERE setting_key = ?',
        [req.params.key]
      );
      
      if (rows.length > 0) {
        return res.json({ data: rows[0].setting_value, found: true });
      }
    }
    
    res.json({ data: null, found: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

app.post('/api/settings/:key', async (req, res) => {
  try {
    if (mysqlConnected) {
      await pool.execute(
        `INSERT INTO admin_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [req.params.key, JSON.stringify(req.body.value), JSON.stringify(req.body.value)]
      );
      
      return res.json({ success: true });
    }
    
    res.status(500).json({ success: false, error: 'Database not connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save setting' });
  }
});

app.get('/api/cache/:key', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ data: null, cached: false });
    }
    
    const key = CACHE_PREFIX + req.params.key;
    const cached = await redis.get(key);
    
    if (cached) {
      return res.json({ data: JSON.parse(cached), cached: true });
    }
    
    res.json({ data: null, cached: false });
  } catch (error) {
    res.json({ data: null, cached: false });
  }
});

app.post('/api/cache/:key', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ success: false, error: 'Redis not connected' });
    }
    
    const key = CACHE_PREFIX + req.params.key;
    const { data, ttl = 300 } = req.body; 
    
    await redis.setex(key, ttl, JSON.stringify(data));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to set cache' });
  }
});

app.delete('/api/cache/:key', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ success: true });
    }
    
    const key = CACHE_PREFIX + req.params.key;
    await redis.del(key);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete cache' });
  }
});

app.delete('/api/cache', async (req, res) => {
  try {
    if (!redisConnected) {
      return res.json({ success: true, deleted: 0 });
    }
    
    const keys = await redis.keys(CACHE_PREFIX + '*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    res.json({ success: true, deleted: keys.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear cache' });
  }
});

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    mysql: mysqlConnected,
    redis: redisConnected,
    timestamp: new Date().toISOString(),
  };
  
  console.log('[Health] Check:', JSON.stringify(health));
  res.json(health);
});

// Dashboard Analytics - один запрос вместо 36!
app.get('/api/dashboard/analytics', async (req, res) => {
  try {
    const cacheKey = 'dashboard:analytics';
    
    // Проверяем кеш в Redis
    if (redisConnected) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log('[Dashboard] Cache hit');
        return res.json(JSON.parse(cached));
      }
    }
    
    if (!mysqlConnected) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const period = parseInt(req.query.period) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date().toISOString().split('T')[0];
    
    console.log(`[Dashboard] Fetching analytics for period: ${period} days (${startDateStr} to ${endDateStr})`);
    
    // Один большой запрос для всех счётчиков
    const [countsResult] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM services WHERE deleted = 0) as total_services,
        (SELECT COUNT(*) FROM servers WHERE enabled = 1) as total_servers,
        (SELECT COUNT(*) FROM user_services WHERE status IN ('ACTIVE', 'active')) as active_user_services,
        (SELECT COUNT(*) FROM pays_history) as recent_payments,
        (SELECT COUNT(*) FROM withdraw_history) as total_withdraws,
        (SELECT COUNT(*) FROM spool WHERE status = 'NEW') as pending_tasks
    `);
    
    const counts = countsResult[0];
    
    // Платежи за период (исключая manual и пустые pay_system_id)
    const [paymentsResult] = await pool.execute(`
      SELECT 
        DATE(date) as payment_date,
        SUM(money) as total,
        COUNT(*) as count,
        pay_system_id
      FROM pays_history
      WHERE date >= ? AND date <= ?
        AND pay_system_id IS NOT NULL
        AND pay_system_id != ''
        AND pay_system_id != '0'
        AND LOWER(pay_system_id) != 'manual'
      GROUP BY DATE(date), pay_system_id
      ORDER BY payment_date
    `, [startDateStr, endDateStr]);
    
    // Статистика по платёжным системам
    const [paySystemsResult] = await pool.execute(`
      SELECT 
        pay_system_id,
        SUM(money) as total
      FROM pays_history
      WHERE date >= ? AND date <= ?
        AND pay_system_id IS NOT NULL
        AND pay_system_id != ''
        AND pay_system_id != '0'
        AND LOWER(pay_system_id) != 'manual'
      GROUP BY pay_system_id
      ORDER BY total DESC
      LIMIT 10
    `, [startDateStr, endDateStr]);
    
    // Новые пользователи за период
    const [newUsersResult] = await pool.execute(`
      SELECT DATE(created) as date, COUNT(*) as count
      FROM users
      WHERE created >= ? AND created <= ?
      GROUP BY DATE(created)
      ORDER BY DATE(created)
    `, [startDateStr, endDateStr]);
    
    // Списания за период
    const [withdrawsResult] = await pool.execute(`
      SELECT DATE(create_date) as date, SUM(cost) as total
      FROM withdraw_history
      WHERE create_date >= ? AND create_date <= ?
      GROUP BY DATE(create_date)
      ORDER BY DATE(create_date)
    `, [startDateStr, endDateStr]);
    
    // Статистика по сервисам
    const [servicesStatsResult] = await pool.execute(`
      SELECT 
        us.status,
        COUNT(*) as count,
        s.name as service_name,
        SUM(s.cost) as revenue
      FROM user_services us
      LEFT JOIN services s ON us.service_id = s.service_id
      GROUP BY us.status, s.name
      ORDER BY count DESC
    `);
    
    // Топ сервисов
    const [topServicesResult] = await pool.execute(`
      SELECT 
        s.name,
        COUNT(*) as count,
        SUM(s.cost) as revenue
      FROM user_services us
      LEFT JOIN services s ON us.service_id = s.service_id
      WHERE us.status IN ('ACTIVE', 'active')
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Серверы по группам
    const [serverGroupsResult] = await pool.execute(`
      SELECT 
        COALESCE(server_gid, 'ungrouped') as group_name,
        COUNT(*) as count
      FROM servers
      WHERE enabled = 1
      GROUP BY server_gid
    `);
    
    // Финансовые метрики
    const totalRevenue = paymentsResult.reduce((sum, p) => sum + parseFloat(p.total || 0), 0);
    const totalWithdraws = withdrawsResult.reduce((sum, w) => sum + parseFloat(w.total || 0), 0);
    const payingUsersCount = new Set(paymentsResult.map(p => p.user_id)).size;
    
    // MRR (Monthly Recurring Revenue) - активные подписки
    const [mrrResult] = await pool.execute(`
      SELECT SUM(s.cost) as mrr, COUNT(*) as active_subscriptions
      FROM user_services us
      LEFT JOIN services s ON us.service_id = s.service_id
      WHERE us.status IN ('ACTIVE', 'active')
    `);
    
    // Последние платежи
    const [recentPaymentsResult] = await pool.execute(`
      SELECT 
        ph.id,
        ph.user_id,
        ph.money,
        ph.date,
        ph.pay_system_id,
        u.login
      FROM pays_history ph
      LEFT JOIN users u ON ph.user_id = u.user_id
      WHERE ph.pay_system_id IS NOT NULL
        AND ph.pay_system_id != ''
        AND ph.pay_system_id != '0'
        AND LOWER(ph.pay_system_id) != 'manual'
      ORDER BY ph.date DESC
      LIMIT 5
    `);
    
    // Последние задачи
    const [recentTasksResult] = await pool.execute(`
      SELECT id, user_id, status, created, event
      FROM spool
      ORDER BY created DESC
      LIMIT 5
    `);
    
    const result = {
      counts: {
        totalUsers: counts.total_users,
        totalServices: counts.total_services,
        totalServers: counts.total_servers,
        activeUserServices: counts.active_user_services,
        recentPayments: counts.recent_payments,
        totalWithdraws: counts.total_withdraws,
        pendingTasks: counts.pending_tasks,
      },
      payments: {
        total: totalRevenue,
        count: paymentsResult.length,
        byPaySystem: paySystemsResult.map(p => ({
          name: p.pay_system_id,
          value: parseFloat(p.total),
        })),
        timeline: paymentsResult.map(p => ({
          date: p.payment_date,
          value: parseFloat(p.total),
        })),
      },
      users: {
        total: counts.total_users,
        newUsers: newUsersResult.reduce((sum, u) => sum + u.count, 0),
        timeline: newUsersResult.map(u => ({
          date: u.date,
          value: u.count,
        })),
      },
      revenue: {
        totalRevenue,
        totalWithdraws,
        netRevenue: totalRevenue - totalWithdraws,
        revenueTimeline: paymentsResult.map(p => ({
          date: p.payment_date,
          value: parseFloat(p.total),
        })),
        withdrawTimeline: withdrawsResult.map(w => ({
          date: w.date,
          value: parseFloat(w.total),
        })),
      },
      services: {
        total: counts.active_user_services,
        byStatus: servicesStatsResult.reduce((acc, s) => {
          const existing = acc.find(x => x.name === s.status);
          if (existing) {
            existing.value += s.count;
          } else {
            acc.push({ name: s.status, value: s.count });
          }
          return acc;
        }, []),
        topServices: topServicesResult.map(s => ({
          name: s.name,
          count: s.count,
          revenue: parseFloat(s.revenue || 0),
        })),
      },
      servers: {
        total: counts.total_servers,
        byGroup: serverGroupsResult.map(g => ({
          name: String(g.group_name),
          value: g.count,
        })),
      },
      financial: {
        arpu: counts.total_users > 0 ? totalRevenue / counts.total_users : 0,
        arppu: payingUsersCount > 0 ? totalRevenue / payingUsersCount : 0,
        payingUsersCount,
        totalUsers: counts.total_users,
        conversionRate: counts.total_users > 0 ? (payingUsersCount / counts.total_users) * 100 : 0,
      },
      mrr: {
        mrr: parseFloat(mrrResult[0]?.mrr || 0),
        activeSubscriptions: mrrResult[0]?.active_subscriptions || 0,
        avgSubscriptionValue: mrrResult[0]?.active_subscriptions > 0 
          ? parseFloat(mrrResult[0].mrr) / mrrResult[0].active_subscriptions 
          : 0,
      },
      recent: {
        payments: recentPaymentsResult,
        tasks: recentTasksResult,
      },
    };
    
    // Кешируем на 60 секунд
    if (redisConnected) {
      await redis.setex(cacheKey, 60, JSON.stringify(result));
      console.log('[Dashboard] Cached for 60s');
    }
    
    console.log('[Dashboard] Analytics fetched successfully');
    res.json(result);
    
  } catch (error) {
    console.error('[Dashboard] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Analytics endpoint - более детальная аналитика с периодами
app.get('/api/analytics', async (req, res) => {
  try {
    console.log('[Analytics] Fetching analytics data...');
    
    const period = req.query.period || 'month';
    let days;
    
    // Конвертируем период в дни
    if (period === 'month') {
      days = 30;
    } else {
      days = parseInt(period);
    }
    
    const cacheKey = `analytics_${period}`;
    
    // Проверяем кеш
    if (redisConnected) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log('[Analytics] Returning cached data');
          return res.json(JSON.parse(cached));
        }
      } catch (err) {
        console.error('[Analytics] Redis error:', err.message);
      }
    }
    
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];
    
    // 1. Загружаем платежи за период (используем для нескольких расчётов)
    const [paymentsForPeriod] = await pool.execute(`
      SELECT user_id, pay_system_id, money, date, comment
      FROM pays_history
      WHERE date >= ? AND date <= ?
        AND pay_system_id IS NOT NULL AND pay_system_id != '' 
        AND pay_system_id != '0' AND LOWER(pay_system_id) != 'manual'
      ORDER BY date DESC
    `, [startDateStr, endDateStr]);
    
    // 2. Payment stats - временная шкала и по платёжным системам
    const [paymentTimeline] = await pool.execute(`
      SELECT DATE(date) as payment_date, SUM(money) as total, COUNT(*) as count, pay_system_id
      FROM pays_history
      WHERE date >= ? AND date <= ?
        AND pay_system_id IS NOT NULL AND pay_system_id != '' 
        AND pay_system_id != '0' AND LOWER(pay_system_id) != 'manual'
      GROUP BY DATE(date), pay_system_id
      ORDER BY payment_date
    `, [startDateStr, endDateStr]);
    
    const [paymentSystems] = await pool.execute(`
      SELECT pay_system_id, SUM(money) as total, COUNT(*) as count
      FROM pays_history
      WHERE date >= ? AND date <= ?
        AND pay_system_id IS NOT NULL AND pay_system_id != '' 
        AND pay_system_id != '0' AND LOWER(pay_system_id) != 'manual'
      GROUP BY pay_system_id
      ORDER BY total DESC
    `, [startDateStr, endDateStr]);
    
    // 3. User stats - новые пользователи
    const [newUsersTimeline] = await pool.execute(`
      SELECT DATE(created) as date, COUNT(*) as count
      FROM users
      WHERE created >= ? AND created <= ?
      GROUP BY DATE(created)
      ORDER BY DATE(created)
    `, [startDateStr, endDateStr]);
    
    const [totalUsers] = await pool.execute(`SELECT COUNT(*) as count FROM users`);
    
    // 4. Revenue stats - доходы и расходы
    const [withdrawTimeline] = await pool.execute(`
      SELECT DATE(create_date) as date, SUM(cost) as total, COUNT(*) as count
      FROM withdraw_history
      WHERE create_date >= ? AND create_date <= ?
      GROUP BY DATE(create_date)
      ORDER BY DATE(create_date)
    `, [startDateStr, endDateStr]);
    
    const totalRevenue = paymentsForPeriod.reduce((sum, p) => sum + parseFloat(p.money || 0), 0);
    const totalWithdraws = withdrawTimeline.reduce((sum, w) => sum + parseFloat(w.total || 0), 0);
    
    // 5. User services stats
    const [userServicesByStatus] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM user_services
      GROUP BY status
    `);
    
    const [userServicesByService] = await pool.execute(`
      SELECT s.name, COUNT(*) as count
      FROM user_services us
      JOIN services s ON us.service_id = s.service_id
      GROUP BY s.service_id, s.name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    const [userServicesTimeline] = await pool.execute(`
      SELECT DATE(created) as date, COUNT(*) as count
      FROM user_services
      WHERE created >= ? AND created <= ?
      GROUP BY DATE(created)
      ORDER BY DATE(created)
    `, [startDateStr, endDateStr]);
    
    const [totalUserServices] = await pool.execute(`SELECT COUNT(*) as count FROM user_services`);
    
    // 6. Task stats
    const [tasksPending] = await pool.execute(`SELECT COUNT(*) as count FROM spool WHERE status = 'pending'`);
    const [tasksCompleted] = await pool.execute(`SELECT COUNT(*) as count FROM spool WHERE status = 'completed'`);
    const [tasksFailed] = await pool.execute(`SELECT COUNT(*) as count FROM spool WHERE status = 'failed'`);
    
    const [tasksByEvent] = await pool.execute(`
      SELECT event, COUNT(*) as count
      FROM spool
      GROUP BY event
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 7. Top services
    const [topServicesResult] = await pool.execute(`
      SELECT s.name, COUNT(us.user_service_id) as count, 
             COALESCE(SUM(s.cost), 0) as revenue
      FROM services s
      LEFT JOIN user_services us ON s.service_id = us.service_id
      WHERE s.deleted = 0
      GROUP BY s.service_id, s.name
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 8. Server stats
    const [serverGroups] = await pool.execute(`
      SELECT COALESCE(server_gid, 'Без группы') as group_name, COUNT(*) as count
      FROM servers
      WHERE enabled = 1
      GROUP BY server_gid
      ORDER BY count DESC
    `);
    
    const [totalServers] = await pool.execute(`SELECT COUNT(*) as count FROM servers WHERE enabled = 1`);
    
    // 9. Financial metrics
    const uniquePayingUsers = new Set(paymentsForPeriod.map(p => p.user_id)).size;
    const arpu = totalUsers[0].count > 0 ? totalRevenue / totalUsers[0].count : 0;
    const arppu = uniquePayingUsers > 0 ? totalRevenue / uniquePayingUsers : 0;
    const conversionRate = totalUsers[0].count > 0 ? (uniquePayingUsers / totalUsers[0].count) * 100 : 0;
    const avgRevenuePerPayment = paymentsForPeriod.length > 0 ? totalRevenue / paymentsForPeriod.length : 0;
    const avgPaymentsPerUser = uniquePayingUsers > 0 ? paymentsForPeriod.length / uniquePayingUsers : 0;
    
    // LTV (простой расчёт: средний доход на платящего пользователя)
    const ltv = arppu;
    
    // Churn rate (упрощённый: процент истёкших подписок)
    const [expiredServices] = await pool.execute(`
      SELECT COUNT(*) as count FROM user_services WHERE expire < NOW() AND expire IS NOT NULL
    `);
    const [activeServices] = await pool.execute(`
      SELECT COUNT(*) as count FROM user_services WHERE (expire > NOW() OR expire IS NULL)
    `);
    const totalServices = expiredServices[0].count + activeServices[0].count;
    const churnRate = totalServices > 0 ? (expiredServices[0].count / totalServices) * 100 : 0;
    
    // 10. Top customers
    const [topCustomersResult] = await pool.execute(`
      SELECT u.user_id, u.login, SUM(ph.money) as total_spent, COUNT(ph.id) as payment_count
      FROM users u
      JOIN pays_history ph ON u.user_id = ph.user_id
      WHERE ph.date >= ? AND ph.date <= ?
        AND ph.pay_system_id IS NOT NULL AND ph.pay_system_id != '' 
        AND ph.pay_system_id != '0' AND LOWER(ph.pay_system_id) != 'manual'
      GROUP BY u.user_id, u.login
      ORDER BY total_spent DESC
      LIMIT 10
    `, [startDateStr, endDateStr]);
    
    // 11. MRR (Monthly Recurring Revenue)
    const [mrrResult] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT us.user_service_id) as active_subscriptions,
        COALESCE(SUM(s.cost / (s.period / 30)), 0) as mrr
      FROM user_services us
      JOIN services s ON us.service_id = s.service_id
      WHERE us.status = 'active' 
        AND (us.expire > NOW() OR us.expire IS NULL)
        AND s.period > 0
    `);
    
    // Формируем ответ
    const result = {
      period: {
        type: period,
        days: days,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      payments: {
        total: totalRevenue,
        count: paymentsForPeriod.length,
        timeline: paymentTimeline.map(p => ({
          date: p.payment_date,
          total: parseFloat(p.total || 0),
          count: p.count,
          paySystemId: p.pay_system_id,
        })),
        byPaySystem: paymentSystems.map(ps => ({
          name: ps.pay_system_id,
          total: parseFloat(ps.total || 0),
          count: ps.count,
        })),
      },
      users: {
        total: totalUsers[0].count,
        newUsers: newUsersTimeline.reduce((sum, u) => sum + u.count, 0),
        timeline: newUsersTimeline.map(u => ({
          date: u.date,
          count: u.count,
        })),
      },
      revenue: {
        totalRevenue: totalRevenue,
        totalWithdraws: totalWithdraws,
        netRevenue: totalRevenue - totalWithdraws,
        revenueTimeline: paymentTimeline.reduce((acc, p) => {
          const existing = acc.find(item => item.date === p.payment_date);
          if (existing) {
            existing.total += parseFloat(p.total || 0);
          } else {
            acc.push({
              date: p.payment_date,
              total: parseFloat(p.total || 0),
            });
          }
          return acc;
        }, []),
        withdrawTimeline: withdrawTimeline.map(w => ({
          date: w.date,
          total: parseFloat(w.total || 0),
        })),
      },
      userServices: {
        total: totalUserServices[0].count,
        byStatus: userServicesByStatus.map(s => ({
          status: s.status,
          count: s.count,
        })),
        byService: userServicesByService.map(s => ({
          name: s.name,
          count: s.count,
        })),
        timeline: userServicesTimeline.map(t => ({
          date: t.date,
          count: t.count,
        })),
      },
      tasks: {
        pending: tasksPending[0].count,
        completed: tasksCompleted[0].count,
        failed: tasksFailed[0].count,
        byEvent: tasksByEvent.map(t => ({
          name: t.event,
          value: t.count,
        })),
      },
      topServices: topServicesResult.map(s => ({
        name: s.name,
        count: s.count,
        revenue: parseFloat(s.revenue || 0),
      })),
      servers: {
        total: totalServers[0].count,
        byGroup: serverGroups.map(g => ({
          name: String(g.group_name),
          value: g.count,
        })),
      },
      financial: {
        arpu: arpu,
        arppu: arppu,
        ltv: ltv,
        churnRate: churnRate,
        payingUsersCount: uniquePayingUsers,
        totalUsers: totalUsers[0].count,
        avgRevenuePerPayment: avgRevenuePerPayment,
        avgPaymentsPerUser: avgPaymentsPerUser,
        conversionRate: conversionRate,
      },
      topCustomers: topCustomersResult.map(c => ({
        userId: c.user_id,
        username: c.login,
        totalSpent: parseFloat(c.total_spent || 0),
        paymentCount: c.payment_count,
      })),
      mrr: {
        mrr: parseFloat(mrrResult[0]?.mrr || 0),
        activeSubscriptions: mrrResult[0]?.active_subscriptions || 0,
        avgSubscriptionValue: mrrResult[0]?.active_subscriptions > 0 
          ? parseFloat(mrrResult[0].mrr) / mrrResult[0].active_subscriptions 
          : 0,
        mrrGrowth: 0, // TODO: расчёт роста MRR
      },
    };
    
    // Кешируем на 60 секунд
    if (redisConnected) {
      await redis.setex(cacheKey, 60, JSON.stringify(result));
      console.log('[Analytics] Cached for 60s');
    }
    
    console.log('[Analytics] Data fetched successfully');
    res.json(result);
    
  } catch (error) {
    console.error('[Analytics] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Backend] Server listening on port ${PORT}`);
  console.log(`[Backend] MySQL: ${mysqlConnected ? 'connected' : 'disconnected'}`);
  console.log(`[Backend] Redis: ${redisConnected ? 'connected' : 'disconnected'}`);
});
