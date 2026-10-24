# elder-match3

## 專案簡介
給玩 Candy Crush 多年的爸媽，做一個 iPhone Safari 打開就能玩的網頁三消遊戲。機制照**現行版** Candy Crush 完整做（特殊糖、組合、關卡目標、障礙、道具），只拿掉生命、體力、廣告、付費。規格與分工見 `PLAN.md`。

## 技術棧
- 純 HTML＋JavaScript（ES module）＋Canvas，不用框架、不用打包工具。
- 部署：GitHub Pages（公開 repo，不放任何個資）。
- 規則層可在 Node 跑單元測試（`node --test`）。

## 目錄結構
- `PLAN.md` — 計畫書（規格、階段、分工表；進度勾在分工表）
- `research/` — 調研與審查原件（`2026-10-24-candy-mechanics/` 機制調研＋FC 錄影；`review/` Fable 審查）
- 程式目錄（規劃）：`rules/`（純邏輯）→ `anim/` → `render/` → `ui/`，關卡為 JSON

## 注意事項
- **使用者是長輩**：只降體力與視覺門檻（大字、大格、顏色＋形狀、慢速開關），**不降遊戲難度**（FC 原話「不希望把機制做得太簡單」）。
- 已拍板（2026-10-24）：照現行版（遊戲中不顯示分數、星星追目標進度、無糖果炸彈）；道具免費但限量；步數用完不送步、輸了免費重來；一人一支 iPhone 14，一機一份進度。
- 不用 Candy Crush 名稱與美術素材（商標）；開源程式只參考寫法、不直接複製。
- 規則依據以 King 官方說明中心為優先，Fandom wiki 次之；未查證的規則在 PLAN 標明。
- 動畫時間做成設定檔常數、用時間驅動不用幀數（iOS 低電量會降到 30fps）。
- 呼叫 Python 用絕對路徑 `C:\Users\FC\AppData\Local\Programs\Python\Python311\python.exe`。

## 待辦去哪了（第一性：CLAUDE.md 零待辦、只放規則）
> 🧊 在做的（接續點＋熱待辦）→ SESSION_LOG.md　🗄️ 想做沒做（冷待辦）→ _BACKLOG.md　📦 完工／砍除 → _archived/
