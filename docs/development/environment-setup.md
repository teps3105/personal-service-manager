# Personal Service Manager 開發環境設置指南

## 概述

本文檔提供 Personal Service Manager 項目的完整開發環境設置指南，包括前後端開發工具配置、代碼質量管理、熱重載等功能。

## 🚀 快速開始

### 先決條件
- Node.js 18+ 或更高版本
- npm 或 yarn 包管理器
- Git 版本控制
- VS Code (推薦) 或其他代碼編輯器

### 一鍵設置
```bash
# 克隆項目
git clone https://github.com/teps3105/personal-service-manager.git
cd personal-service-manager

# 安裝依賴 (同時安裝前端和後端依賴）
npm run install:all

# 啟動開發服務器
npm run dev:all
```

## 📁 項目目錄結構

```
personal-service-manager/
├── .env                           # 環境變數配置
├── .eslintrc.js                    # ESLint 配置
├── .prettierrc                     # Prettier 配置
├── .lintstagedrc                   # Lint-staged 配置
├── vercel.json                      # Vercel 部署配置
├──
├── frontend/                        # Vue.js 前端
│   ├── src/
│   │   ├── components/           # Vue 組件
│   │   ├── views/               # 頁面視圖
│   │   ├── stores/              # Pinia 狀態管理
│   │   ├── router/              # Vue Router 配置
│   │   └── assets/              # 靜態資源
│   ├── package.json
│   ├── vite.config.ts            # Vite 配置
│   └── tsconfig.json              # TypeScript 配置
│
├── backend/                         # Node.js 後端
│   ├── src/
│   │   ├── types/               # TypeScript 類型定義
│   │   ├── routes/              # Express 路由
│   │   ├── middleware/          # 中間件
│   │   └── utils/               # 工具函數
│   ├── package.json
│   ├── tsconfig.json            # TypeScript 配置
│   └── server.js                # Express 服務器入口
│
├── docs/                           # 文檔目錄
│   ├── database/                  # 數據庫相關文檔
│   └── development/               # 開發相關文檔
│
├── supabase/                       # Supabase 數據庫遷移
│   └── migrations/
│
└── .claude/                        # Claude AI 配置
```

## 🛠️ 開發工具配置

### 前端開發環境 (Vue.js)

#### 技術棧
- **框架**: Vue 3.5+ with Composition API
- **狀態管理**: Pinia 3.0+
- **路由**: Vue Router 4.5+
- **構建工具**: Vite 7.0+
- **類型檢查**: TypeScript 5.8+
- **樣式**: Tailwind CSS

#### 開發工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Vue DevTools | 內建 | 開發時組件調試 |
| TypeScript | 5.8+ | 類型安全 |
| ESLint | 9.31+ | 代碼質量檢查 |
| Prettier | 3.6+ | 代碼格式化 |
| Vitest | 3.2+ | 單元測試 |

#### 配置文件

**package.json 主要腳本**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "test:unit": "vitest",
    "build-only": "vite build",
    "type-check": "vue-tsc --build",
    "lint": "eslint . --fix",
    "format": "prettier --write src/"
  }
}
```

**TypeScript 配置 (tsconfig.json)**:
```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "include": ["env.d.ts", "src/**/*", "src/**/*.vue"],
  "compilerOptions": {
    "composite": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 後端開發環境 (Node.js + Express.js)

#### 技術棧
- **運行時**: Node.js 18+
- **框架**: Express.js 5.1+
- **數據庫**: Supabase (PostgreSQL)
- **認證**: JWT + bcryptjs
- **API 文檔**: 內建支持
- **類型安全**: TypeScript 5.9+

#### 開發工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Nodemon | 3.1+ | 自動重啟服務器 |
| TypeScript | 5.9+ | 類型安全 |
| ESLint | 9.35+ | 代碼質量檢查 |
| Prettier | 3.6+ | 代碼格式化 |
| ts-node | 10.9+ | TypeScript 執行 |

#### 配置文件

**package.json 主要腳本**:
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.{ts,js,json}\"",
    "type-check": "tsc --noEmit"
  }
}
```

**TypeScript 配置 (tsconfig.json)**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "sourceMap": true,
    "noImplicitAny": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## 🔧 代碼質量管理

### ESLint 配置

**全局配置 (.eslintrc.js)**:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './backend/tsconfig.json'
  },
  env: {
    node: true,
    es2022: true
  },
  rules: {
    // TypeScript 規則
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    
    // JavaScript 規則
    'no-console': 'warn',
    'prefer-const': 'error',
    'object-shorthand': 'error',
    
    // 最佳實踐
    'eqeqeq': 'error',
    'no-eval': 'error'
  }
};
```

### Prettier 配置

**全局配置 (.prettierrc)**:
```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Git Hooks (Husky + lint-staged)

**package.json 配置**:
```json
{
  "scripts": {
    "prepare": "husky install",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

**.lintstagedrc 配置**:
```javascript
module.exports = {
  '*.{js,ts,jsx,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,md}': ['prettier --write']
};
```

## 🔄 開發工作流

### 日常開發流程

#### 1. 啟動開發服務器
```bash
# 啟動前端和後端
npm run dev:all

# 或者分別啟動
npm run dev:frontend  # 前端: http://localhost:5173
npm run dev:backend    # 後端: http://localhost:3001
```

#### 2. 代碼編寫
- 使用 VS Code 或其他編輯器
- 安裝推薦擴展：
  - Vue Language Features (Volar)
  - TypeScript Vue Plugin (Volar)
  - ESLint
  - Prettier - Code formatter
  - GitLens

#### 3. 保存時自動格式化
```json
// VS Code settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[vue]": {
    "editor.defaultFormatter": "johnsoncode.vue.volar"
  }
}
```

#### 4. 提交前檢查
```bash
# Git hooks 會自動執行
npm run lint           # 檢查代碼質量
npm run format         # 格式化代碼
```

### 調試流程

#### 前端測試 (Vitest)
```bash
# 運行所有測試
npm run test:unit

# 監聽模式
npm run test:unit -- --watch

# 覆蓋率報告
npm run test:unit -- --coverage
```

#### 後端測試
```bash
# 測試數據庫連接
curl http://localhost:3001/api/test-db

# 測試服務健康狀態
curl http://localhost:3001/api/health

# 測試認證端點
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","name":"Test User"}'
```

## 🔍 調試和調試

### 前端調試

#### Vue DevTools
- 安裝: Vue.js devtools 瀏覽器擴展
- 訪問: http://localhost:5173/__devtools__/
- 功能: 組件檢查、狀態管理、事件監聽

#### TypeScript 開發體驗
```json
// VS Code tsconfig.json 補置
{
  "typescript.preferences.preferTypeOnlyAutoImports": true,
  "typescript.suggest.autoImports": true
}
```

#### 錯誤處理
```javascript
// Vue 組件錯誤邊界
<template>
  <div v-if="error" class="error-message">
    {{ error }}
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<string | null>(null)

onErrorCaptured((err, instance, info) => {
  error.value = err.message
  console.error('Component error:', err, info)
})
</script>
```

### 後端調試

#### API 調試
```bash
# 使用 curl 測試 API
curl -X GET http://localhost:3001/api/health

# 使用 Postman 或 Insomnia
# 導入 Postman 集合文件： docs/postman/psm-collection.json
```

#### 數據庫調試
```bash
# 測試數據庫連接
cd backend && npm run test-db

# 查看 Supabase 日誌
# 訪問: https://supabase.com/dashboard/project/your-project/logs
```

#### 日誌配置
```javascript
// Morgan 日誌配置
const morgan = require('morgan')

// 開發環境 - 詳細日誌
app.use(morgan('dev'))

// 生產環境 - 組合日誌
app.use(morgan('combined'))
```

## 🌐 環境管理

### 開發環境 (.env.development)
```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=dev

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# 前端配置
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=Personal Service Manager (Dev)
```

### 生產環境 (.env.production)
```env
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-app.vercel.app
LOG_LEVEL=combined

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# 前端配置
VITE_API_BASE_URL=https://your-app.vercel.app/api
VITE_APP_TITLE=Personal Service Manager
```

### 測試環境 (.env.test)
```env
NODE_ENV=test
PORT=3002
LOG_LEVEL=error

# 測試數據庫
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_KEY=your-test-service-key
```

## 📦 依賴管理

### 版本鎖定
```bash
# 生成 package-lock.json
npm install

# 更新依賴
npm update

# 安全審計
npm audit
npm audit fix
```

### 共享依賴 (根目錄)
創建 `package.json` 在項目根目錄：
```json
{
  "name": "personal-service-manager",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install",
    "dev:all": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build:all": "cd frontend && npm run build && cd ../backend && npm run build",
    "test:all": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && npm run test:unit",
    "test:backend": "cd backend && npm test",
    "lint:all": "npm run lint:frontend && npm run lint:backend",
    "format:all": "npm run format:frontend && npm run format:backend"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

## 🚀 部署配置

### Vercel 部署
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

### 本地生產環境測試
```bash
# 構建生產版本
npm run build:all

# 啟動生產服務器
npm run start:backend
npm run preview:frontend
```

## 🔧 故障排除

### 常見問題

#### 1. 依賴安裝失敗
```bash
# 清除 npm 緩存
npm cache clean --force

# 刪除 node_modules 重新安裝
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript 編譯錯誤
```bash
# 檢查類型
npm run type-check

# 修復格式
npm run format
```

#### 3. 端口衝突
```bash
# 檢查端口占用
lsof -i :3001  # 後端端口
lsof -i :5173  # 前端端口

# 殺死進程
kill -9 <PID>
```

#### 4. 環境變數未加載
```bash
# 驗證環境變數
echo $NODE_ENV
echo $SUPABASE_URL

# 重新加載 .env 文件
source .env
```

### 調試命令
```bash
# 完整環境測試
npm run test:environment

# 健康檢查
curl -f http://localhost:3001/api/health || echo "Backend not running"
curl -f http://localhost:5173/ || echo "Frontend not running"

# 依賴檢查
npm ls || echo "Dependencies not installed"
```

## 📚 最佳實踐

### 代碼組織
- 使用組件化架構
- 保持單一職責原則
- 遵循 Vue/Express 最佳實踐
- 使用 TypeScript 提供類型安全

### 提交規範
```bash
# 提交消息格式
<type>(<scope>): <description>

# 類型說明
feat: 新功能
fix: Bug 修復
docs: 文檔更新
style: 代碼格式化
refactor: 重構
test: 測試相關
chore: 構建或工具變動

# 示例
feat(auth): 添加 JWT 認證支持
fix(database): 修復用戶創建錯誤
docs: 更新開發環境設置文檔
```

### 性能優化
- 使用代碼分割和懶遠加載
- 實施數據庫查詢優化
- 配置適當的緩存策略
- 使用 CDN 加載靜態資源

### 安全考慮
- 不要提交敏感信息
- 使用環境變數管理密鑰
- 實施適當的 CORS 策略
- 定期更新依賴包

---

## 📞 支持和資源

### 官方文檔
- [Vue.js 文檔](https://vuejs.org/)
- [Express.js 文檔](https://expressjs.com/)
- [Supabase 文檔](https://supabase.com/docs)
- [TypeScript 文檔](https://www.typescriptlang.org/docs/)

### 社群資源
- [Vue Discourse](https://forum.vuejs.org/)
- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Discussions](https://github.com/vuejs/vue/discussions)

### 工具和擴展
- [VS Code Vue 擴展](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [Vue DevTools](https://devtools.vuejs.org/)
- [Postman API 客戶端](https://www.postman.com/)

---

**文檔版本**: 1.0  
**最後更新**: 2025-09-13  
**維護者**: Personal Service Manager 開發團隊