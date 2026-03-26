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

