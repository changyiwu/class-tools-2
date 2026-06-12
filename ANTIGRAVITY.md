# AntiGravity 開發者指南 - class-tools-2

本檔案為 AntiGravity 專案助理的開發指南與規則庫。在對本專案進行任何修改、除錯或新增功能之前，請務必先詳讀此檔案。

---

## 專案概述

*   **專案名稱**：class-tools-2 (ClassHub)
*   **用途**：專為課堂教學設計的多功能工具箱，提供抽籤、噪音監測、隨機分組、座位表、計時器、團隊計分板等功能。
*   **專案類型**：純前端靜態網頁（Single-Page Application, SPA）。
*   **技術棧**：
    *   **核心**：HTML5 + 原生 CSS3 (Vanilla CSS) + JavaScript (Vanilla JS)。
    *   **本地開發與打包**：Vite。
    *   **第三方套件**：Canvas Confetti (特效)、FontAwesome (圖標)。

---

## 目錄結構與運作機制

### 1. 目錄結構
*   `index.html`：專案的單一入口網頁，包含所有視圖的 HTML 骨架與控制項。
*   `css/style.css`：專案的主要樣式檔，包含主題變數（暗色調與玻璃擬態 Glassmorphism 風格）、全域排版。
*   `public/js/`：存放所有功能模組的 JavaScript 原始碼。
    *   `app.js`：核心控制，處理視圖切換（SPA 路由）、全域狀態（如班級選擇、音效切換）。
    *   `raffle.js`：幸運抽籤功能（支援轉盤、拉霸、翻牌模式）。
    *   `noise.js`：噪音監測器功能。
    *   `groups.js`：隨機分組功能。
    *   `seating.js`：隨機座位表功能。
    *   `timer.js`：計時器與碼表功能。
    *   `scoreboard.js`：小組記分板功能。
    *   `manager.js`：班級與學生名單管理功能。
*   `vite.config.js`：Vite 設定檔，base 設為相對路徑 `./`。

### 2. 重要機制：非模組 JS 檔案
本專案的 JS 腳本使用傳統的全域函式（例如：按鈕 inline `onclick="switchView('raffle')"` 呼叫）。
**注意事項**：
*   **不可**將 `<script>` 標籤隨意加入 `type="module"`，這會破壞 inline 點擊事件的綁定。
*   所有 JS 檔案均放置在 `public/js/` 目錄下，Vite 打包時會將其原封不動地複製至輸出目錄（`dist/js/`）。
*   若需修改 JS 邏輯，請直接修改 `public/js/` 底下的檔案。

---

## 設計與美學規範

本專案致力於提供最頂級的視覺體驗（Premium Design）：
1.  **色彩與主題**：使用精心調配的暗色調背景（搭配漸層 ambient glow）與 HSL 主題色。
2.  **玻璃擬態 (Glassmorphism)**：使用 `backdrop-filter: blur()` 與半透明邊框建立極具質感的玻璃卡片（`.glass-card`）。
3.  **微互動**：按鈕、選單、切換鈕等互動元素必須加上滑鼠懸停（hover）微動畫與縮放效果，提升回饋感。
4.  **響應式佈局**：確保在投影幕（大螢幕）、筆記型電腦與行動裝置（手機）均有極佳的排版呈現。

---

## 部署流程

本專案採用 GitHub Actions 進行持續部署：
*   **分支**：`master`
*   **目的平台**：GitHub Pages (由 GitHub 託管)
*   **工作流定義**：`.github/workflows/deploy.yml`
*   當推送至 `master` 時，會自動下載依賴、執行 `npm run build` 並部署 `dist/` 目錄的內容。
