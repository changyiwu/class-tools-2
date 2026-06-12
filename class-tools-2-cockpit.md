# 專案駕駛艙 - class-tools-2

## 📊 專案狀態
- **狀態**：🟢 初始化完成
- **建立日期**：2026-06-12
- **目前目標**：建置好 Git、GitHub 同步與 GitHub Actions 自動化部署，並調整 Vite 結構，確保本機開發與線上環境功能完全一致。

---

## 🎯 目標與計畫
- [x] 初始化 Git 儲存庫
- [x] 初始化 NPM 專案並安裝 Vite
- [x] 建立基礎專案文件 (`ANTIGRAVITY.md`, `README.md`)
- [ ] 調整結構：將 `js/` 資料夾移至 `public/js/` 以免 Vite 打包遺漏
- [ ] 建立 GitHub 公開儲存庫並完成推送
- [ ] 設定 GitHub Actions 自動化部署工作流至 GitHub Pages
- [ ] 驗證 GitHub Pages 線上部署結果

---

## 📅 進度紀錄

### 2026-06-12
- **初始化完成**：完成了本地 Git 與 NPM Vite 的配置。
- **結構優化計畫**：發現原本的 JS 是傳統 Script，直接打包會被 Vite 漏掉，因此規劃在執行階段將整個 `js/` 目錄搬移到 `public/js/`。

---

## ⚠️ 踩坑與注意事項
1.  **Vite 打包與非模組 Script**：
    因為本專案 JS 中包含了大量綁定在 `window` 的全域函式（給 HTML 的 `onclick` 使用），不適合轉換為 `type="module"`。
    *解決方案*：將整個 `js` 目錄移至 `public/` 資料夾。Vite 會在 build 時原封不動地把 `public/js/` 複製到 `dist/js/`。
2.  **GitHub Token 衝突**：
    本機執行 `gh` 命令時，若環境變數存在過期的 `GITHUB_TOKEN` 會導致驗證失敗。
    *解決方案*：在執行 `gh` 相關指令時，先使用 `$env:GITHUB_TOKEN=""` 清空環境變數，讓其使用系統 Keyring 儲存的有效 Token。
