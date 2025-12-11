# 全家便利商店霜淇淋地圖 (FamilyMart Ice Cream Map)

這是一個簡單的網頁應用程式，用來尋找全台灣販售霜淇淋的全家便利商店 (FamilyMart)。地圖會特別區分販售「單口味」與「雙口味」（包含圓滾滾造型）的店舖，讓您輕鬆找到心儀的口味。

## 功能特色 (Features)

*   **互動式地圖**：使用 Leaflet.js 建立的互動地圖，顯示全台店舖位置。
*   **口味與造型區分**：
    *   **藍色地標 (Blue Marker)**：單口味店舖 (Single Flavor)。
    *   **紅色地標 (Red Marker)**：雙口味店舖 (Dual Flavor)。
    *   **條紋樣式 (Striped)**：代表該店舖提供「特殊造型」霜淇淋 (Special Shape, e.g. 圓滾滾)。
        *   **藍色條紋**：單口味 + 特殊造型。
        *   **紅色條紋**：雙口味 + 特殊造型。
*   **定位功能**：支援使用者定位，快速顯示您附近的霜淇淋店舖。
*   **詳細資訊**：點擊地標可查看店舖名稱、地址、電話及販售類型，並提供 Google Maps 連結。
*   **資料更新時間**：地圖右下角顯示資料最後更新時間。

## 專案結構 (Project Structure)

*   `index.html`：網頁主要入口檔案。
*   `styles.css`：網頁樣式表。
*   `script.js`：前端程式邏輯，包含地圖初始化與資料載入。
*   `stores.json`：儲存全台店舖資料的 JSON 檔案。

## 技術棧 (Tech Stack)

*   **Frontend**: HTML5, CSS3, JavaScript (ES6+)
*   **Map Library**: [Leaflet.js](https://leafletjs.com/)

## 注意事項 (Notes)

*   本專案資料來源為全家便利商店公開查詢系統，資料準確性以官方為準。
*   `stores.json` 檔案由腳本產生，建議不要手動編輯。