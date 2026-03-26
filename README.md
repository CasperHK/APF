## 🎭 Agentic Persona Factory (APF)
「不只是 AI，是你的專屬明星行銷團隊。」
Agentic Persona Factory 是一個革命性的 Multi-Agent 協作平台。在這裡，你不需要學習複雜的 Prompt，只需從 「角色市場」 挑選頂尖 AI 代理——從「奧格威風格文案師」到「矽谷第一原理策略官」，並讓他們在你的雲端辦公室中協作產出高質量的商業內容。

## ✨ 核心產品亮點

### 🏪 1. 代理角色市場 (Agent Marketplace)
* 明星模板：一鍵僱傭具備經典風格的代理（如：賈伯斯的產品簡報力、奧格威的廣告邏輯、小紅書爆款流量密碼）。
* 社群共享：發現並訂閱由全球創作者調教出的「高轉化率 SEO 專家」或「毒舌科技評論員」。

### 🏗️ 2. 自定義人格 (Custom Persona Creator)
* 品牌語氣克隆：上傳 3 篇你的過往文章，AI 自動提取並鎖定你的專屬「Brand Voice」。
* 動態角色編輯：定義 AI 的背景、目標與性格偏好（例如：追求激進創新 vs. 穩定保守）。

### 🤝 3. 視覺化協作會議室 (Agent War Room)
* 跨角色辯論：看著「SEO 專家」與「創意總監」為了標題爭論，並在碰撞中產生最優解。
* 人類介入 (Human-in-the-Loop)：你可以在協作的中途隨時對特定代理下令，微調產出方向。

### 4. 私人代理秘書（Private Agent Secretary）
最懂你的代理

## 🤖 推薦團隊組合 (The Dream Teams)
| 團隊名稱 | 組成角色 | 適用場景 |
|---|---|---|
| 🚀 矽谷增長鏈 | 增長黑客 + 第一原理策略官 + 簡約設計代理 | 產品發佈、融資簡報、科技評論 |
| 🔥 流量爆款工廠 | 小紅書運營 + 情緒價值文案 + 標題黨專家 | 社群媒體行銷、短影音腳本 |
| 📘 品牌長青組 | 奧格威文案師 + 傳統公關專家 + 內容審核官 | 品牌深度文章、新聞稿、官方網站 |

## 🛠️ 技術架構 (The SaaS Tech Stack)
* 核心大腦: Claude 3.5 Sonnet / DeepSeek v3.2 / Claude Opus 4.6 (優選其角色扮演能力，可以更改)
* 多代理引擎: CrewAI / LangGraph
* 狀態管理: Redis (處理長時任務與代理對話狀態)
* 前端開發: SolidStart + Flowbite Solid + Motion One (打造流暢的 Agent 互動視覺)
* 後端開發: Bun 運行時 + Elysia + Eden Treaty + ArkType
* 向量檢索: Supabase Vector (儲存角色記憶與品牌知識)

---

## 🔒 安全工作空間 (Secure Workspace)
「給 AI 團隊一間獨立的辦公室，而不是整個房子的鑰匙。」

### 核心機制
* 虛擬隔離 (Sandboxed FS)：系統為每個專案自動配置一個受限的磁碟空間。Agent 只能在該路徑下進行 Read/Write，無法存取系統其餘部分。
* MCP 協議集成：透過 Model Context Protocol，實現標準化的檔案存取控制。
* 操作審計 (Audit Log)：記錄每一位 Agent 對 Workspace 內檔案的所有修改歷史，支援一鍵還原 (Version Control)。
* 
### 工作流範例
* 用戶上傳：用戶將「品牌手冊.pdf」與「產品規格.docx」拖入專案 Workspace。
* Agent 讀取：「SEO 策略師」 自動讀取 PDF 內容提取關鍵字。
* Agent 生成：「文案師」 在 Workspace 內自動創建 Social_Post_v1.md。
* 安全執行：若涉及數據分析，「分析官」 會在隔離的 Python 環境中讀取 CSV 並繪製圖表儲存於 Workspace。

---

## 🏗️ 系統架構 (Multi-Container Architecture)

我們採用 Docker Compose / Kubernetes 進行微服務編排多個容器，確保系統的高可用性與安全性：

### 多容器組成 (Container Orchestration)
為了發揮 Bun 的效能並確保 Python AI 邏輯的穩定性，建議採用 Polyglot (多語言) 容器架構：

#### 1. `web-app` (SolidStart + Flowbite)
職責：前端 UI 與 伺服器端渲染 (SSR)。
特性：透過 Eden Treaty 與後端進行類型安全的通訊，利用 Motion One 實現 Agent 動作的流暢動畫（如：Agent 正在打字、切換角色）。

#### 2. `api-server` (Bun + Elysia)
職責：核心調度中樞、用戶認證、ArkType 數據校驗。
特性：利用 Elysia 的高效能處理 WebSocket 連線，將 Agent 的實時日誌 (Logs) 推送至前端。它是整個平台的「交通警察」。

### 3. `agent-worker` (Python + CrewAI/LangGraph)
職責：真正的「大腦執行區」，運行 AI 邏輯與多代理協作。
特性：雖然核心是 Bun，但 AI 框架目前仍以 Python 為主。此容器專門跑任務，並透過 Redis Pub/Sub 與 Bun Server 通訊。

### 4. `sandbox-workspace` (Docker-in-Docker / Isolated Volume)
職責：安全存取空間。
特性：掛載持久化磁碟，供 agent-worker 讀寫檔案。這是一個隔離的環境，Agent 可以在此生成 .md, .pdf 或執行代碼。

### 5. `state-manager` (Redis)
職責：存儲 Agent 對話的「短期記憶」與任務隊列狀態。

### 6. `vector-storage` (Supabase / Postgres + pgvector)
職責：存儲「長期記憶」、品牌知識庫與角色性格設定。

---

## 🗺️ 開發階段 (Development Phases)
* Phase 1: 核心 Multi-Agent 溝通協議開發。
* Phase 2: 角色市場 (v1.0)：上線首批 10 位明星代理模板。
* Phase 3: 品牌克隆系統：支援用戶上傳文獻建立自定義角色。
* Phase 4: API 擴展：開放 API 讓企業將「明星代理團隊」整合進現有工作流。

## 🚀 部署與啟動
```bash
# 安裝依賴
pnpm install && pip install -r requirements.txt

# 啟動 Agent 會議室
python main.py --room "Marketing_War_Room"
```

