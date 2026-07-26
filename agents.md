# class-tools-2（班級工具箱）（專案藍圖）

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。

## 專案簡介

課堂教學多功能工具箱「班級工具箱」，包含抽籤、噪音監測、隨機分組、座位表、計時器與團隊計分板。純前端靜態單頁應用程式（SPA），技術棧為 HTML5、Vanilla CSS、Vanilla JavaScript、Vite，另使用 Canvas Confetti、HTML2Canvas、Font Awesome 與本機字型套件。

## 關鍵時程

<!-- 目前無固定時程 -->

## 目標與路線圖

- [x] 階段一：六大功能上線（抽籤、噪音監測、分組、座位表、計時器、計分板）
- [x] 階段二：開發指南整合為跨 Agent `agents.md`，移除舊規則檔；Vite 正式 build 通過
- [ ] 階段三：確認 GitHub Pages 部署工作流成功
- [x] 階段四：完成繁中品牌、跨工具串接、每班保存、行動版、無障礙與離線資源強化
- [ ] 階段五：以實際裝置驗證麥克風噪音監測、列印與圖片下載

## 資料夾結構

```
class-tools-2/
├─ index.html            # 單一入口網頁與所有視圖的 HTML 骨架
├─ css/style.css         # 主題變數、玻璃擬態與全域排版
├─ public/js/
│  ├─ app.js             # SPA 視圖切換與全域狀態
│  ├─ raffle.js          # 抽籤
│  ├─ noise.js           # 噪音監測器
│  ├─ groups.js          # 隨機分組
│  ├─ seating.js         # 隨機座位表
│  ├─ timer.js           # 計時器與碼表
│  ├─ scoreboard.js      # 小組記分板
│  └─ manager.js         # 班級與學生名單管理
├─ vendor.mjs            # 本機字型、圖示、彩帶與圖片匯出套件入口
├─ vite.config.js        # Vite 設定，base 維持相對路徑 './'
├─ dist/                 # build 產物
├─ package.json  package-lock.json
├─ README.md
├─ agents.md             # 本檔：專案藍圖
├─ handoff.md            # 交接檔（每次收工必更新）
├─ .github/              # GitHub Actions 部署工作流
└─ .gitignore
```

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地（GDrive） | `agents.md`＋`handoff.md` | 每個 session |
| L2 | GitHub | https://github.com/changyiwu/class-tools-2 （公開） | 指定時 |
| L3 | Obsidian | `class-tools-2/專案工作流程.md` | 有需要時 |

## 工作約定

- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用繁體中文；Windows 指令優先使用 PowerShell
- 修改前先檢查 Git 狀態，只處理本次任務相關變更

## JavaScript 運作約束

- 專案腳本使用傳統全域函式，並由 inline `onclick` 等事件呼叫
- **不可隨意為 `<script>` 加上 `type="module"`**，否則會破壞 inline 事件綁定
- 功能邏輯應修改 `public/js/` 下的原始檔；Vite 會把這些檔案原樣複製至 `dist/js/`

## 設計規範

- 維持暗色調背景、漸層 ambient glow、HSL 主題色與玻璃擬態卡片
- 互動元件需保有 hover 微動畫、縮放與清楚的操作回饋
- 版面需同時適配投影幕、筆記型電腦與手機

## 部署

- 預設分支為 `main`，推送後由 `.github/workflows/deploy.yml` 執行 GitHub Actions
- 部署流程會安裝依賴、執行 `npm run build`，並將 `dist/` 部署至 GitHub Pages

## 最近進度

- 2026-07-22：將專案開發指南整合為跨 Agent `agents.md`，移除舊規則檔；Vite 正式 build 已通過。
- 2026-07-24：專案藍圖改用標準範本格式（補上路線圖 checklist 與同步層級表，目錄結構改為樹狀圖）。
- 2026-07-27：品牌更名為「班級工具箱」；完成行動版與無障礙強化、每班自動保存、跨工具串接、計分回合紀錄、列印／圖片匯出及本機資源化，正式 build 與桌機／手機驗收通過。
