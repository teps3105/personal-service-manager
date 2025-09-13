# Personal Service Manager Database Documentation

## 概述

Personal Service Manager 使用 PostgreSQL 作為核心數據庫，通過 Supabase 提供雲端數據庫服務。數據庫設計支持用戶管理、服務配置、通知系統和監控記錄等核心功能。

## 數據庫架構

### 核心表結構

#### 1. profiles 表 - 用戶資料管理
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**字段說明**：
- `id`: 用戶唯一標識符 (UUID)
- `email`: 用戶郵箱地址 (唯一)
- `name`: 用戶顯示名稱
- `password_hash`: 加密後的密碼
- `avatar_url`: 頭像URL (可選)
- `created_at`: 創建時間
- `updated_at`: 更新時間 (自動觸發器更新)

#### 2. user_settings 表 - 用戶偏好設置
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'zh-TW',
  timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
  ntfy_topic TEXT DEFAULT 'personal-service-notifications',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**字段說明**：
- `notifications_enabled`: 是否啟用通知
- `email_notifications`: 郵件通知開關
- `push_notifications`: 推送通知開關
- `theme`: 界面主題 (light/dark/auto)
- `language`: 界面語言
- `timezone`: 時區設置
- `ntfy_topic`: ntfy.sh 通知主題

#### 3. services 表 - 服務管理核心
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**字段說明**：
- `name`: 服務名稱
- `description`: 服務描述
- `type`: 服務類型 (general/http/tcp/script/process/api)
- `status`: 服務狀態 (active/inactive/completed/error)
- `priority`: 優先級 (low/medium/high)
- `config`: 服務配置 (JSON格式)
- `metadata`: 擴展數據 (JSON格式)
- `tags`: 標籤陣列 (全文搜索支持)

#### 4. notifications 表 - 通知記錄系統
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'system',
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  priority INTEGER DEFAULT 3,
  topic TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**字段說明**：
- `title`: 通知標題
- `message`: 通知內容
- `type`: 通知類型 (system/ntfy/email/webhook)
- `status`: 發送狀態 (sent/failed/pending)
- `priority`: 優先級 (1-5)
- `topic`: 發送主題 (ntfy.sh)
- `error_message`: 錯誤信息 (失敗時)

#### 5. monitoring_logs 表 - 服務監控日誌
```sql
CREATE TABLE monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL,
  response_time INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);
```

**字段說明**：
- `timestamp`: 監控時間戳
- `status`: 監控狀態 (success/failed/timeout/error)
- `response_time`: 響應時間 (毫秒)
- `error_message`: 錯誤信息
- `metadata`: 擴展監控數據

## 索引優化

### 主要索引
```sql
-- profiles 表索引
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- services 表索引
CREATE INDEX idx_services_user_id ON services(user_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_type ON services(type);
CREATE INDEX idx_services_priority ON services(priority);
CREATE INDEX idx_services_created_at ON services(created_at);
CREATE INDEX idx_services_updated_at ON services(updated_at);
CREATE INDEX idx_services_tags ON services USING GIN(tags);

-- notifications 表索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- monitoring_logs 表索引
CREATE INDEX idx_monitoring_logs_service_id ON monitoring_logs(service_id);
CREATE INDEX idx_monitoring_logs_timestamp ON monitoring_logs(timestamp);
CREATE INDEX idx_monitoring_logs_status ON monitoring_logs(status);
CREATE INDEX idx_monitoring_logs_service_timestamp ON monitoring_logs(service_id, timestamp);
```

## 安全設計

### Row Level Security (RLS)
所有表都啟用了 Row Level Security，確保用戶只能訪問自己的數據：

```sql
-- 用戶只能訪問自己的資料
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid()::text = id::text);

-- 用戶只能管理自己的服務
CREATE POLICY "Users can view own services" ON services
    FOR SELECT USING (auth.uid()::text = user_id::text);
```

### 權限控制
```sql
-- 給認用戶完整權限
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON user_settings TO authenticated;
GRANT ALL ON services TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON monitoring_logs TO authenticated;
```

## 自動化功能

### 時間戳觸發器
所有表都配置了自動更新的 `updated_at` 字段：

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 默認設置觸發器
新用戶註冊時自動創建默認設置：

```sql
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id, theme, language, timezone, ntfy_topic)
    VALUES (NEW.id, 'light', 'zh-TW', 'Asia/Taipei', 'personal-service-notifications');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 數據完整性約束

### 約束類型
- **PRIMARY KEY**: 所有表都有主鍵約束
- **FOREIGN KEY**: 相關表使用外鍵約束，設置 ON DELETE CASCADE
- **UNIQUE**: email 字段唯一約束
- **CHECK**: 枚舉值驗證 (status, type, priority, theme 等)
- **NOT NULL**: 必填字段約束

### 級束示例
```sql
-- 狀態枚舉約束
CHECK (status IN ('active', 'inactive', 'completed', 'error'))
CHECK (type IN ('general', 'http', 'tcp', 'script', 'process', 'api'))
CHECK (priority IN ('low', 'medium', 'high'))

-- 主題驗證約束
CHECK (theme IN ('light', 'dark', 'auto'))
```

## 備份和恢復

### Supabase 自動備份
- **頻率**: 每日自動備份
- **保留期**: 30天
- **加密**: 數據傳輸加密
- **地點**: 多區域備份存儲

### 手動備份腳本
```sql
-- 創建完整備份
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

-- 恢復數據
psql $DATABASE_URL < backup_20250913_031845.sql
```

## 性能優化

### 查詢優化建議

#### 1. 用戶相關查詢
```sql
-- 高效：使用索引查詢用戶服務
SELECT * FROM services 
WHERE user_id = 'user-uuid' AND status = 'active'
ORDER BY created_at DESC;

-- 低效：避免全表掃描
SELECT * FROM services WHERE status = 'active';
```

#### 2. 通知查詢
```sql
-- 高效：複合索引查詢
SELECT * FROM notifications 
WHERE user_id = 'user-uuid' AND status = 'failed'
ORDER BY created_at DESC 
LIMIT 50;
```

#### 3. 標籤搜索
```sql
-- 使用全文搜索索引
SELECT * FROM services 
WHERE user_id = 'user-uuid' AND tags @> ARRAY['monitoring', 'api'];
```

### 連接池化配置
```javascript
// 後端連接池配置
const poolConfig = {
  max: 10,           // 最大連接數
  idleTimeoutMillis: 30000, // 空閑超時
  connectionTimeoutMillis: 2000, // 連接超時
};
```

## 監控和日誌

### Supabase 內建監控
- **查詢性能**: 實時監控慢查詢
- **連接數**: 監控數據庫連接數量
- **存儲使用**: 表空間和索引使用情況
- **慢查詢日誌**: 自動記錄超過100ms的查詢

### 自定義監控指標
```sql
-- 服務監控統計
SELECT 
    service_id,
    status,
    COUNT(*) as count,
    AVG(response_time) as avg_response_time,
    MAX(timestamp) as last_check
FROM monitoring_logs 
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY service_id, status;
```

## 故障排除

### 常見問題

#### 1. 連接錯誤
```bash
# 檢查環境變數
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# 測試連接
psql $SUPABASE_URL -c "SELECT 1;"
```

#### 2. 權限問題
```sql
-- 檢查權限
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'profiles';
```

#### 3. 性能問題
```sql
-- 分析慢查詢
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 調試腳本
```bash
# 測試所有表連接
#!/bin/bash
for table in profiles user_settings services notifications monitoring_logs; do
    echo "Testing table: $table"
    psql $SUPABASE_URL -c "SELECT COUNT(*) FROM $table;"
done
```

## 開發指南

### 本地開發
1. 使用提供的 SQL 腳本創建本地數據庫
2. 配置 `.env` 文件中的數據庫連接信息
3. 運行 `npm run dev` 啟動開發服務器

### 數據庫遷移
```bash
# 創建新遷移
npx supabase migration new your_migration_name

# 應用遷移
npx supabase migration up
```

### 種式環境
1. 在 Supabase Dashboard 中執行生產遷移
2. 驗證數據完整性
3. 監控性能指標

---

**文檔版本**: 1.0  
**最後更新**: 2025-09-13  
**維護者**: Personal Service Manager 團隊