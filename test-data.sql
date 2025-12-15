-- Тестовые данные для Dashboard

-- Создаём тестовых пользователей
INSERT INTO users (user_id, login, password, balance, credit, bonus, created, last_login, discount, `type`, block, gid, perm_credit, can_overdraft, verified)
VALUES 
  (1, 'user1@test.com', 'hash1', 1000.00, 0.00, 0.00, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW(), 0, 1, 0, 1, 0, 0, 1),
  (2, 'user2@test.com', 'hash2', 500.00, 0.00, 0.00, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 0, 1, 0, 1, 0, 0, 1),
  (3, 'user3@test.com', 'hash3', 2000.00, 0.00, 50.00, DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 2 HOUR), 10, 1, 0, 1, 0, 0, 1),
  (4, 'user4@test.com', 'hash4', 0.00, 0.00, 0.00, DATE_SUB(NOW(), INTERVAL 10 DAY), NOW(), 0, 1, 0, 1, 0, 0, 1),
  (5, 'user5@test.com', 'hash5', 750.00, 0.00, 0.00, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 HOUR), 5, 1, 0, 1, 0, 0, 1);

-- Создаём тестовые сервисы
INSERT INTO services (service_id, name, cost, period, category, allow_to_order, deleted)
VALUES
  (1, 'VPS Basic', 500.00, 1, 'vps', 1, 0),
  (2, 'VPS Pro', 1000.00, 1, 'vps', 1, 0),
  (3, 'Dedicated Server', 5000.00, 1, 'dedicated', 1, 0),
  (4, 'Domain .ru', 200.00, 12, 'domain', 1, 0),
  (5, 'SSL Certificate', 300.00, 12, 'ssl', 1, 0);

-- Создаём серверы
INSERT INTO servers (server_id, server_gid, name, transport, host, ip, weight, enabled, services_count)
VALUES
  (1, 1, 'vps-node-01', 'ssh', 'vps1.example.com', '192.168.1.10', 100, 1, 5),
  (2, 1, 'vps-node-02', 'ssh', 'vps2.example.com', '192.168.1.11', 100, 1, 3),
  (3, 2, 'dedicated-01', 'ssh', 'ded1.example.com', '192.168.2.10', 100, 1, 2);

-- Создаём активные сервисы пользователей
INSERT INTO user_services (user_service_id, user_id, service_id, status, status_before, created, expire, auto_bill)
VALUES
  (1, 1, 1, 'ACTIVE', 'ACTIVE', DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), 1),
  (2, 2, 2, 'ACTIVE', 'ACTIVE', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), 1),
  (3, 3, 1, 'ACTIVE', 'ACTIVE', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 20 DAY), 1),
  (4, 3, 4, 'ACTIVE', 'ACTIVE', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 355 DAY), 1),
  (5, 4, 1, 'BLOCK', 'ACTIVE', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 1),
  (6, 5, 2, 'ACTIVE', 'ACTIVE', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 27 DAY), 1);

-- Создаём платежи за последние 7 дней
INSERT INTO pays_history (user_id, pay_system_id, money, date)
VALUES
  (1, 'card', 1000.00, DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (2, 'card', 500.00, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (3, 'paypal', 2000.00, DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (3, 'card', 500.00, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (4, 'card', 300.00, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (5, 'yandex', 750.00, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1, 'card', 500.00, NOW());

-- Создаём списания
INSERT INTO withdraw_history (user_id, service_id, user_service_id, cost, discount, bonus, months, total, create_date, withdraw_date)
VALUES
  (1, 1, 1, 500.00, 0, 0.00, 1, 500.00, DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)),
  (2, 2, 2, 1000.00, 0, 0.00, 1, 1000.00, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (3, 1, 3, 500.00, 10, 0.00, 1, 450.00, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (5, 2, 6, 1000.00, 5, 0.00, 1, 950.00, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Создаём задачи в очереди
INSERT INTO spool (user_id, user_service_id, event, status, prio, created)
VALUES
  (1, 1, '{"name": "create_vps", "params": {}}', 'NEW', 10, NOW()),
  (5, 6, '{"name": "activate_service", "params": {}}', 'NEW', 5, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (3, 3, '{"name": "renew_service", "params": {}}', 'WORK', 3, DATE_SUB(NOW(), INTERVAL 2 HOUR));

-- Создаём историю задач
INSERT INTO spool_history (spool_id, user_id, user_service_id, event, status, prio, created, executed)
VALUES
  (1, 2, 2, '{"name": "create_vps", "params": {}}', 'DONE', 10, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (2, 3, 4, '{"name": "register_domain", "params": {}}', 'DONE', 5, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (3, 4, 5, '{"name": "create_vps", "params": {}}', 'ERROR', 10, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY));
