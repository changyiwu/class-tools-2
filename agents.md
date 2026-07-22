# class-tools-2（跨 Agent 開發指南）

> 本檔供不同 Agent 在修改、除錯或新增功能前共同遵循。

## 專案概述

- 專案名稱：`class-tools-2`（ClassHub）
- 用途：課堂教學多功能工具箱，包含抽籤、噪音監測、隨機分組、座位表、計時器與團隊計分板。
- 類型：純前端靜態單頁應用程式（SPA）。
- 技術棧：HTML5、Vanilla CSS、Vanilla JavaScript、Vite；另使用 Canvas Confetti 與 Font Awesome。
- Obsidian 筆記：`class-tools-2/專案工作流程.md`

## 目錄結構

- `index.html`：單一入口網頁與所有視圖的 HTML 骨架。
- `css/style.css`：主題變數、玻璃擬態與全域排版。
- `public/js/app.js`：SPA 視圖切換與全域狀態。
- `public/js/raffle.js`：抽籤功能。
- `public/js/noise.js`：噪音監測器。
- `public/js/groups.js`：隨機分組。
- `public/js/seating.js`：隨機座位表。
- `public/js/timer.js`：計時器與碼表。
- `public/js/scoreboard.js`：小組記分板。
- `public/js/manager.js`：班級與學生名單管理。
- `vite.config.js`：Vite 設定，`base` 維持相對路徑 `./`。

## JavaScript 運作約束

- 專案腳本使用傳統全域函式，並由 inline `onclick` 等事件呼叫。
- 不可隨意為 `<script>` 加上 `type="module"`，否則會破壞 inline 事件綁定。
- 功能邏輯應修改 `public/js/` 下的原始檔；Vite 會把這些檔案原樣複製至 `dist/js/`。

## 設計規範

- 維持暗色調背景、漸層 ambient glow、HSL 主題色與玻璃擬態卡片。
- 互動元件需保有 hover 微動畫、縮放與清楚的操作回饋。
- 版面需同時適配投影幕、筆記型電腦與手機。

## 部署

- 預設分支為 `main`，推送後由 `.github/workflows/deploy.yml` 執行 GitHub Actions。
- 部署流程會安裝依賴、執行 `npm run build`，並將 `dist/` 部署至 GitHub Pages。

## 共通約定

- 回應與文件使用繁體中文；Windows 指令優先使用 PowerShell。
- 修改前先檢查 Git 狀態，只處理本次任務相關變更。

## 最近進度

- 2026-07-22：將專案開發指南整合為跨 Agent `agents.md`，移除舊規則檔；Vite 正式 build 已通過。
