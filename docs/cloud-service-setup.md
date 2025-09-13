# 雲端服務設置指南

## 概述

本文檔說明如何為 Personal Service Manager 項目設置所需的雲端服務。

## 服務架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Supabase      │
│   (Vue.js)      │◄──►│   (Node.js)     │◄──►│   (Database)    │
│   Vercel        │    │   Vercel        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ntfy.sh       │    │   GitHub        │    │   Vercel CLI    │
│   Notifications │    │   Repository    │    │   Deployment    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 1. Vercel 帳號設置

### 1.1 註冊 Vercel 帳號

1. 訪問 [Vercel 官網](https://vercel.com)
2. 使用 GitHub 帳號登錄（推薦）
3. 選擇免費計劃（Free Tier）

### 1.2 創建新項目

1. 點擊 "New Project"
2. 連接你的 GitHub 倉庫
3. 選擇 `personal-service-manager` 倉庫
4. 配置框架預設：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build && cd backend && npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install && cd backend && npm install`

### 1.3 環境變數配置

在 Vercel 項目設置中添加以下環境變數：

```bash
# Required for Production
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
SESSION_SECRET=your-super-secret-session-key
JWT_SECRET=your-super-secret-jwt-key
NTFY_TOPIC=your-ntfy-topic
```

### 1.4 安裝 Vercel CLI

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登錄到 Vercel
vercel login

# 連接項目
vercel link
```

## 2. Supabase 帳號設置

### 2.1 註冊 Supabase 帳號

1. 訪問 [Supabase 官網](https://supabase.com)
2. 使用 GitHub 帳號登錄
3. 選擇免費計劃（Free Tier）

### 2.2 創建新項目

1. 點擊 "New Project"
2. 填寫項目信息：
   - **Project Name**: `personal-service-manager`
   - **Database Password**: 創建強密碼並保存
   - **Region**: 選擇離你最近的區域（如：East US (N. Virginia)）

### 2.3 獲取連接信息

創建項目後，複製以下信息：

```bash
# Project Settings > Database
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_DB_HOST=your-project-id.db.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-database-password

# Project Settings > API
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.4 配置認證

在 Supabase Dashboard 中：

1. 前往 Authentication > Providers
2. 啟用 Email 認證（預設啟用）
3. 配置 Site URL：`https://your-app.vercel.app`
4. 配置 Redirect URLs：`https://your-app.vercel.app/**`

## 3. ntfy.sh 通知服務設置

### 3.1 使用公共服務（推薦用於開發）

ntfy.sh 提供免費的公共服務，無需註冊：

```bash
# 發送測試通知
curl -d "測試通知" https://ntfy.sh/your-topic-name
```

### 3.2 自建服務（可選）

如需更高安全性，可以自建 ntfy.sh 服務：

```bash
# 使用 Docker 運行
docker run -p 8080:80 -v /var/lib/ntfy:/var/lib/ntfy binwiederhier/ntfy

# 訪問 http://localhost:8080
```

### 3.3 配置 ntfy.sh 參數

在環境變數中配置：

```bash
NTFY_URL=https://ntfy.sh
NTFY_TOPIC=personal-service-notifications
NTFY_PRIORITY=3
NTFY_USERNAME=  # 如果使用認證
NTFY_PASSWORD=  # 如果使用認證
```

## 4. GitHub 集成

### 4.1 倉庫設置

1. 創建 GitHub 倉庫：`personal-service-manager`
2. 添加 README.md 文件
3. 設置倉庫為 Private 或 Public

### 4.2 Vercel-GitHub 集成

1. 在 Vercel 中連接 GitHub 倉庫
2. 啟用自動部署：
   - **Production Branch**: `main` 或 `master`
   - **Preview Branches**: 所有功能分支
3. 配置部署鉤子

### 4.3 GitHub Actions（可選）

創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: vercel/action@v2
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 5. 部署流程

### 5.1 初始部署

```bash
# 連接 Vercel 項目
vercel link

# 部署到 Production
vercel --prod

# 部署到 Preview
vercel
```

### 5.2 自動部署

設置完成後，每次推送代碼到 main 分支會自動部署：

```bash
git add .
git commit -m "feat: Add new feature"
git push origin main
```

### 5.3 環境管理

- **Production**: `main` 分支自動部署到生產環境
- **Preview**: 功能分支自動部署到預覽環境
- **Development**: 本地開發使用 `vercel dev`

## 6. 驗證設置

### 6.1 測試連接

創建測試腳本 `test-connections.js`：

```javascript
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// 測試 Supabase 連接
async function testSupabase() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  
  const { data, error } = await supabase.from('profiles').select('count').single();
  
  if (error) {
    console.error('❌ Supabase 連接失敗:', error.message);
    return false;
  }
  
  console.log('✅ Supabase 連接成功');
  return true;
}

// 測試 ntfy.sh 連接
async function testNtfy() {
  try {
    await axios.post(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, '測試通知', {
      headers: {
        'Title': 'Personal Service Manager 測試',
        'Priority': process.env.NTFY_PRIORITY || 3
      }
    });
    
    console.log('✅ ntfy.sh 通知發送成功');
    return true;
  } catch (error) {
    console.error('❌ ntfy.sh 通知發送失敗:', error.message);
    return false;
  }
}

// 執行所有測試
async function runTests() {
  console.log('🧪 開始服務連接測試...\n');
  
  const supabaseOk = await testSupabase();
  const ntfyOk = await testNtfy();
  
  console.log('\n📊 測試結果:');
  console.log(`Supabase: ${supabaseOk ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`ntfy.sh: ${ntfyOk ? '✅ 通過' : '❌ 失敗'}`);
  
  if (supabaseOk && ntfyOk) {
    console.log('\n🎉 所有服務連接正常！');
  } else {
    console.log('\n⚠️  部分服務連接失敗，請檢查配置');
  }
}

runTests();
```

### 6.2 運行測試

```bash
# 設置環境變數
export $(cat .env | xargs)

# 運行測試
node test-connections.js
```

## 7. 故障排除

### 7.1 常見問題

**Vercel 部署失敗**
- 檢查 `vercel.json` 配置
- 確認 `package.json` 中的腳本正確
- 查看部署日誌

**Supabase 連接失敗**
- 驗證 API Keys 是否正確
- 檢查項目 URL 是否正確
- 確認網絡連接

**ntfy.sh 通知失敗**
- 檢查 topic 名稱是否正確
- 確認網絡防火牆設置
- 測試公共端點可訪問性

### 7.2 調試命令

```bash
# 檢查 Vercel 部署狀態
vercel ls

# 查看 Supabase 項目信息
vercel env ls

# 測試本地環境變數
printenv | grep SUPABASE

# 測試 ntfy.sh 發送
curl -d "本地測試" https://ntfy.sh/your-topic
```

## 8. 安全最佳實踐

### 8.1 環境變數安全

- 永遠不要將 `.env` 文件提交到版本控制
- 使用 Vercel 的環境變數功能
- 定期輪換 API Keys 和密碼

### 8.2 網絡安全

- 使用 HTTPS
- 配置適當的 CORS 策略
- 啟用 Vercel 的安全頭設置

### 8.3 數據安全

- 定期備份 Supabase 數據
- 使用 Row Level Security (RLS)
- 限制數據庫訪問權限

## 9. 監控和維護

### 9.1 監控設置

- 使用 Vercel Analytics 監控應用性能
- 設置 Supabase 日志監控
- 配置 ntfy.sh 重要通知

### 9.2 定期維護

- 檢查服務使用量
- 更新依賴包
- 備份重要數據

---

## 下一步

完成雲端服務設置後，請參考：

- [部署配置](./deployment.md)
- [外部服務集成指南](./service-integration.md)
- [環境變數管理](./environment-management.md)

如需幫助，請查看項目的 [GitHub Issues](https://github.com/teps3105/personal-service-manager/issues) 或聯繫維護者。