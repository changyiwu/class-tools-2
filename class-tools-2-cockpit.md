# 專案駕駛艙 - class-tools-2

## 📊 專案狀態
- **狀態**：🟢 初始化與同步已完成
- **建立日期**：2026-06-12
- **目前目標**：已成功完成 Git 版本控制、GitHub 公開儲存庫同步，並建立基於 GitHub Actions 的自動化部署 (GitHub Pages)。

---

## 🎯 目標與計畫
- [x] 初始化 Git 儲存庫
- [x] 初始化 NPM 專案並安裝 Vite
- [x] 建立基礎專案文件 (`ANTIGRAVITY.md`, `README.md`)
- [x] 調整結構：將 `js/` 資料夾移至 `public/js/` 以免 Vite 打包遺漏
- [x] 建立 GitHub 公開儲存庫並完成推送
- [x] 設定 GitHub Actions 自動化部署工作流至 GitHub Pages
- [x] 驗證 GitHub Pages 線上部署結果

---

## 📅 進度紀錄

### 2026-06-12
- **初始化與同步完成**：成功完成了本地 Git 儲存庫、NPM Vite 設定，並建置好了 GitHub Pages 自動部署工作流。目前專案已在線運作：[https://changyiwu.github.io/class-tools-2/](https://changyiwu.github.io/class-tools-2/)。

---

## 🔮 下一步計畫
1.  **功能性優化與除錯**：進一步盤點各個工具（如噪音監測、座位表）的運作狀況，優化使用者體驗。
2.  **增強微動畫**：利用 CSS Animations 提升專案整體高級美學感。

---

## ⚠️ 踩坑與注意事項
1.  **Vite 打包與非模組 Script**：
    因為本專案 JS 中包含了大量綁定在 `window` 的全域函式（給 HTML 的 `onclick` 使用），不適合轉換為 `type="module"`。
    *解決方案*：將整個 `js` 目錄移至 `public/` 資料夾。Vite 會在 build 時原封不動地把 `public/js/` 複製到 `dist/js/`。
2.  **GitHub Token 衝突**：
    本機執行 `gh` 命令時，若環境變數存在過期的 `GITHUB_TOKEN` 會導致驗證失敗。
    *解決方案*：在執行 `gh` 相關指令時，先使用 `$env:GITHUB_TOKEN=""` 清空環境變數，讓其使用系統 Keyring 儲存的有效 Token。
3.  **GitHub Workflow Scope 授權**：
    推送包含 `.github/workflows/deploy.yml` 的檔案時，如果登入的 token 沒有 `workflow` scope，會被 GitHub 拒絕推送。
    *解決方案*：執行 `gh auth refresh -s workflow`，並於瀏覽器中輸入對應驗證碼完成權限升級，方可成功推送。
4.  **GitHub Pages Actions 來源啟用**：
    初次使用 GitHub Actions 部署 Pages 時，若無在儲存庫啟用 Pages 會導致 deploy 失敗。
    *解決方案*：使用 API `gh api --method POST /repos/changyiwu/class-tools-2/pages -f build_type=workflow` 啟用 Pages。
