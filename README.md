# 全家便利商店霜淇淋地圖 (FamilyMart Ice Cream Map)

這是一個簡單的網頁應用程式，用來尋找全台灣販售霜淇淋的全家便利商店 (FamilyMart)。地圖會特別區分販售「單口味」與「雙口味」（包含圓滾滾造型）的店舖，讓您輕鬆找到心儀的口味。

## 功能特色 (Features)

*   **互動式地圖**：使用 Leaflet.js 建立的互動地圖，結合 MarkerCluster 進行叢集顯示，效能流暢。
*   **口味與造型區分**：
    *   **藍色地標 (Blue Marker)**：單口味店舖 (Single Flavor)。
    *   **紅色地標 (Red Marker)**：雙口味店舖 (Dual Flavor)。
    *   **條紋樣式 (Striped)**：代表該店舖提供「特殊造型」霜淇淋 (Special Shape, e.g. 圓滾滾)。
        *   **藍色條紋**：單口味 + 特殊造型。
        *   **紅色條紋**：雙口味 + 特殊造型。
*   **定位功能**：支援使用者地理定位 (Geolocation)，快速顯示您附近的霜淇淋店舖。
*   **詳細資訊**：點擊地標可查看店舖名稱、地址、電話及販售類型，並提供 Google Maps 導航連結。
*   **資料更新時間**：地圖右下角顯示資料最後更新時間。
*   **漸進式網頁應用 (PWA)**：
    *   **可安裝**：支援安裝至桌面或手機主畫面，像原生 App 一樣使用。
    *   **離線支援**：透過 Service Worker 快取資源，無網路時仍可瀏覽地圖與已下載的店舖資料。
*   **效能優化**：使用 Web Worker 在背景執行緒處理大量店舖資料解析，避免阻塞使用者介面。

## 技術棧 (Tech Stack)

*   **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Map Library**: [Leaflet.js](https://leafletjs.com/) + [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)
*   **Performance**: Web Workers (Background Data Processing)
*   **PWA**: Manifest, Service Worker (Offline Capability)

## 專案結構 (Project Structure)

本專案已遷移至 Vite 架構，原始碼位於 `src` 目錄中：

*   `src/`：原始碼目錄
    *   `js/`：JavaScript 模組
        *   `controllers/`：控制 UI 與地圖邏輯 (MVC 架構)
        *   `services/`：處理資料抓取、定位與 Service Worker
        *   `helpers/`：輔助函式
        *   `config.js`：專案設定檔
        *   `main.js`：應用程式入口點
    *   `css/`：樣式表
    *   `worker/`：Web Worker 腳本 (`store.worker.js`)
*   `public/`：靜態資源目錄
    *   `stores.json`：全台店舖資料
    *   `manifest.json`：PWA 設定檔
    *   `icon/`：應用程式圖示
*   `index.html`：網頁入口檔案
*   `vite.config.js`：Vite 設定檔

## 如何安裝與執行 (Installation & Usage)

本專案使用 Node.js 與 Vite 進行開發與建置。請確保您的系統已安裝 [Node.js](https://nodejs.org/)。

1.  **安裝依賴套件 (Install Dependencies)**：
    ```bash
    npm install
    ```

2.  **啟動開發伺服器 (Start Dev Server)**：
    ```bash
    npm run dev
    ```
    開啟瀏覽器存取終端機顯示的網址 (通常為 `http://localhost:5173`)。

3.  **建置生產版本 (Build for Production)**：
    ```bash
    npm run build
    ```
    建置後的檔案將位於 `dist/` 目錄。

4.  **預覽生產版本 (Preview Build)**：
    ```bash
    npm run preview
    ```

## 設定與安全性 (Configuration & Security)

為了確保專案安全性並防止敏感資料外洩，請遵循以下原則：

*   **敏感資訊不提交**：任何 API 金鑰 (API Keys)、憑證 (Credentials) 或私人設定檔不應提交至版本控制系統。
*   **忽略檔案設定**：
    *   `.gitignore` 已設定忽略 `node_modules/`、`dist/`、`.venv/` 及 `build_up/` 等目錄與檔案。
*   **環境變數**：若未來需整合第三方服務 (如 Google Maps API)，建議使用 `.env` 檔案管理環境變數 (例如 `VITE_API_KEY=...`)，並將 `.env` 加入 `.gitignore`。

## 資料來源與聲明 (Data Source & Disclaimer)

*   本專案資料來源為全家便利商店公開查詢系統，資料準確性以官方為準。
*   `public/stores.json` 檔案通常由自動化腳本產生，建議不要手動編輯。
*   地圖圖資由 [CartoDB](https://carto.com/) 提供，基於 [OpenStreetMap](https://www.openstreetmap.org/) 資料。
