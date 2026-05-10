# TransferIDS_web 產品需求文件 PRD

版本：v1.0  
日期：2026-05-07  
範圍：TransferIDS_web 前端、後端 wrapper、端點/Suricata/NetFlow 匯入、SOC 儀表板、審核與優化閉環  
狀態：Productization baseline

## 1. 產品定位

TransferIDS_web 是 TransferIDS 跨域入侵偵測研究成果的產品化操作層。它不是單純展示模型分數的研究頁面，而是面向 SOC 操作員的決策工作台，負責把原始觀測、物化事件、案件、分析師審核、模型優化建議與部署狀態串成可追蹤閉環。

產品核心主張是：降低警報疲勞，保留安全底線，讓端點與網路感測資料在進入人工工作台之前先完成可信分流。

## 2. 背景與問題

目前端點與網路感測會產生大量日常連線與 discovery noise，例如 mDNS、LLMNR、SSDP、DNS、Office 365、Google、Cloudflare、Microsoft 雲端服務與內網基礎服務流量。若全部物化成 SOC 告警，會導致操作員疲勞、案件優先級失真、儀表板數字膨脹，以及模型誤報被誤解成產品誤報率。

TransferIDS 的研究結果顯示，跨域 IDS 在無監督遷移時不穩定，少量 target-domain supervision 才能帶來可靠增益。因此產品層不能只顯示模型輸出，必須加入決策層防護、人工審核、shadow optimization 與 golden-set regression，讓模型更新不會破壞 SOC 操作穩定性。

## 3. 目標

- 將大量端點觀測分流為 benign ledger、needs_review、malicious、incident 四種操作語義。
- 讓日常網路雜訊不進入高風險處置區，降低不必要人工複核。
- 嚴格保留攻擊疑似流量，不因缺少佐證而草率判定 benign。
- 用 dashboard 將風險、案件壓力、誤報率、模型增益與 shadow optimization 狀態壓縮成一眼可判斷的操作訊號。
- 讓每個產品狀態都有閉環：來源、判定、物化、案件、審核、優化、驗證與部署門檻。

## 4. 非目標

- V1 不承諾自動封鎖流量或直接執行隔離。
- V1 不把 shadow optimizer 的門檻自動套用到 live detection path。
- V1 不把模型分數冒充分析師確認誤報率。
- V1 不要求內建 production ONNX checkpoint；ONNX Runtime 是可選整合。
- V1 暫不修改既有明文密碼兼容流程，密碼雜湊列為後續安全任務。

## 5. 使用者角色

| 角色 | 核心需求 | 成功標準 |
|---|---|---|
| SOC Analyst | 快速知道現在先處理哪一件 | 不需要從大量 raw flow 中人工找高風險事件 |
| SOC Lead | 觀察警報疲勞、案件壓力與誤報趨勢 | 能區分 raw observation、materialized event、incident |
| Security Admin | 管理資料來源、端點 Agent、Suricata、GeoIP、ONNX | 高權限操作都有 admin guard 與可追蹤狀態 |
| ML/Detection Engineer | 比對模型增益、shadow threshold、分歧樣本 | 模型更新前能用 golden-set 與審核資料驗證 |
| Incident Responder | 從事件進入案件與 guided IR | 每個事件都有下一步與處置狀態 |

## 6. 產品範圍

| 模組 | V1 範圍 | 閉環要求 |
|---|---|---|
| 戰情風險 Dashboard | 風險脈動、處置焦點、營運漏斗、誤報率、地理視圖、壓力趨勢、威脅快報 | 每個數字要能追溯後端 API 與時間窗 |
| Data Intake | CSV、NetFlow、Suricata EVE、端點 Agent、PCAP replay | 匯入後要產生觀測統計、物化結果與錯誤訊息 |
| Detection/Triage | endpoint discovery noise 過濾、13 維 canonical feature、C3/C3-2 推論、事件物化 | benign 不開案件，缺佐證攻擊維持 needs_review |
| Incident Center | 開啟案件、優先級、風險分數、攻擊鏈、狀態切換 | 案件狀態更新需要 auth，關鍵操作可審計 |
| Review Loop | 分析師審核、分歧分佈、誤報率、review history | 誤報率只使用人工確認資料 |
| Shadow Optimization | 離線 GA 門檻建議、fitness、權重、歷史演化 | 僅顯示建議，不自動改 live path |
| Platform Integration | Suricata、GeoIP、ONNX、endpoint runtime、Redis optional | 所有高權限 control API 需要 admin guard |

## 7. 核心使用流程

### 7.1 SOC 日常監控流程

1. 操作員進入 Dashboard。
2. 先看戰情風險與處置焦點，不先看 raw table。
3. 若風險為低且物化事件為 0，系統只保留 raw observation 與營運漏斗。
4. 若出現高風險事件，威脅快報與案件壓力區塊顯示下一步。
5. 操作員進入 incident 或 response 頁面處置。
6. 處置結果回寫 review history 與 metrics。

### 7.2 端點流量分流流程

1. Endpoint Agent 回傳 flow observation。
2. 系統先做 discovery noise triage。
3. mDNS、LLMNR、SSDP 等日常 multicast 流量預設歸入 benign ledger。
4. 正常雲端服務與內網基礎連線不直接物化。
5. 具攻擊樣態但證據不足的流量進入 needs_review。
6. 高信心且有佐證的攻擊事件才進入 materialized event 或 incident。

### 7.3 模型更新閉環流程

1. Detection Engineer 匯入 pre-finetune 與 post-finetune checkpoint。
2. 系統固定跑 endpoint golden-set flows。
3. 比對 score deviation、verdict deviation、materialization deviation。
4. 超過門檻則 CI fail。
5. 即使模型變激進，決策層 hard rule 仍保護 discovery noise。
6. 微調後最多先升到 needs_review，不直接造成高風險假警報洪水。

## 8. 功能需求

| ID | 功能 | 優先級 | 驗收標準 |
|---|---|---|---|
| FR-001 | Dashboard 顯示戰情風險 | P0 | 顯示嚴重告警、開啟案件、時間窗攻擊比例、高概率待確認 |
| FR-002 | Dashboard 顯示處置焦點 | P0 | 顯示 P1、P2、未解告警、近時間窗已驗證攻擊 |
| FR-003 | 營運漏斗區分 raw/event/incident | P0 | 不把 raw observation 包裝成告警或案件 |
| FR-004 | 誤報率只使用人工確認 | P0 | 無人工確認時不得以模型分數填充誤報率 |
| FR-005 | 地理視圖只使用平台事件與 GeoIP | P1 | 沒有座標時明確標示未解析，不補外部資料 |
| FR-006 | 端點 discovery noise 自動 benign | P0 | mDNS、LLMNR、SSDP 類型不進入高風險隊列 |
| FR-007 | 攻擊疑似但缺佐證維持 needs_review | P0 | 不得直接判 benign 或 confirmed malicious |
| FR-008 | API 寫入與控制需要 auth/admin | P0 | ingestion/review/incident/optimization/control API 有契約測試 |
| FR-009 | Shadow optimization 不自動套用 | P0 | 前端只讀顯示，部署門檻需後端明確流程 |
| FR-010 | 啟動腳本可移植 | P1 | 不依賴本機硬編路徑，可由 env/參數/PATH 解析 |
| FR-011 | ONNX optional | P1 | 未配置模型時 backend 仍可啟動，runtime 頁面顯示 unavailable |
| FR-012 | Golden-set regression | P1 | 固定樣本比對 score/verdict/materialization deviation 並可 fail CI |

## 9. 非功能需求

| 類別 | 需求 | 驗收標準 |
|---|---|---|
| Security | 高風險 API 必須有 auth 或 admin guard | 契約測試列出每個 route function 的 dependency |
| Reliability | 後端缺少 optional integration 不應整體崩潰 | ONNX/GeoIP/Redis/Suricata 不存在時回傳可解釋狀態 |
| Portability | 不允許本機硬編路徑進入產品預設 | 掃描不得出現本機 drive/user profile 依賴 |
| Observability | 每個 dashboard 數字都要能說明來源 | 指標區塊標示時間窗、資料模式與來源 |
| Performance | 高頻 raw observation 不應全部物化 | 物化率需可觀測，且 benign ledger 不製造案件壓力 |
| Auditability | 人工審核與模型分歧可回放 | review history 可供 GA 與審計模組使用 |

## 10. 資料與 API 契約

### 10.1 核心資料物件

| 物件 | 說明 | 必要欄位 |
|---|---|---|
| Observation | 原始或標準化流量觀測 | timestamp、source_ip、destination_ip、features、source_type |
| Event | 值得追蹤的物化事件 | event_id、verdict、confidence、severity、incident_id |
| Incident | 聚合後案件 | incident_id、priority、risk_score、state、event_count |
| Review Record | 分析師審核結果 | reviewer、ai_verdict、human_verdict、disagreement_level |
| Optimization Profile | shadow threshold 建議 | materialization_threshold、attack_threshold、fitness、weights |

### 10.2 API 原則

- Read-only dashboard API 需要 authenticated user。
- 寫入 observation、event、review、incident state 需要 authenticated user。
- optimizer execution、sensor start/stop、platform control 需要 admin。
- Debug API 預設關閉；若啟用仍需 admin。
- WebSocket 使用 token，不允許匿名訂閱事件流。

## 11. 判定策略

| 條件 | 判定 | 產品行為 |
|---|---|---|
| Discovery multicast noise | benign | 只入 ledger，不顯示為攻擊 |
| 日常 DNS/雲端/內網服務 | benign 或 ledger-only | 不開事件，保留營運統計 |
| 模型高分但缺佐證 | needs_review | 進入待人工確認 |
| 高信心且多證據一致 | malicious | 可物化事件並聚合案件 |
| 模型微調後分數劇烈偏移 | regression risk | CI fail 或後台標記模型行為變動 |

## 12. 成功指標

| 指標 | 目標方向 | 說明 |
|---|---|---|
| 今日物化率 | 下降且可解釋 | raw observation 到 event 的比例需合理 |
| 分析師確認誤報率 | 下降 | 僅使用人工確認誤報 |
| 平均複核量 | 下降 | needs_review 不應被日常雜訊淹沒 |
| 高風險事件漏報 | 不上升 | 降噪不能犧牲安全底線 |
| 模型增益 | 上升 | C3-2 相對 direct transfer 的可觀測增益 |
| Golden-set deviation | 受控 | checkpoint 更新不應造成決策層失穩 |

## 13. 里程碑

| 階段 | 交付 | 閉環門檻 |
|---|---|---|
| M1 Product Shell | Dashboard、Intake、Incidents、Response、Reports、Settings | 前端 build 通過 |
| M2 Secure Wrapper | Auth/admin guard、CORS、debug disable、API docs disable | 契約測試通過 |
| M3 Triage Policy | discovery noise、ledger/needs_review/materialized 分流 | 端點政策測試通過 |
| M4 Sensor Integration | Suricata、NetFlow、Endpoint Agent、GeoIP | 缺整合時可解釋降級 |
| M5 Optimization Loop | review history、shadow GA、model gain | 不自動套用 live threshold |
| M6 Regression Gate | golden-set flows、checkpoint deviation test | 超門檻 fail CI |

## 14. 風險與緩解

| 風險 | 影響 | 緩解 |
|---|---|---|
| 無監督遷移不穩定 | 模型判定失真 | 以 C3-2 target-assisted fine-tuning 作為產品策略 |
| 日常流量大量誤報 | SOC 疲勞 | discovery noise hard rule 與 ledger-only |
| 模型微調後過度激進 | 假警報洪水 | golden-set regression 與 materialization gate |
| optional integration 缺檔 | 部署啟動失敗 | ONNX/GeoIP/Suricata optional degrade |
| 明文密碼兼容 | 安全風險 | 後續任務改 passlib bcrypt 與密碼重設流程 |
| 本機路徑污染 | 離機部署失敗 | env/參數/PATH 解析與路徑掃描測試 |

## 15. 驗收標準

- `npm test` 必須通過。
- `npm run build` 必須通過。
- PowerShell 啟動器可被 Windows parser 正確解析。
- API security contract 必須覆蓋所有 wrapper write/control/read-sensitive route。
- `.env.example` 不得帶本機硬編路徑。
- Dashboard 指標不得混淆 raw observation、event、incident。
- 誤報率不得使用模型分數偽造。
- Shadow optimizer 不得前端直接改 live detection path。
- 每個 deferred item 必須在 closure audit 中明確列出。

## 16. 已知延後項

| 項目 | 原因 | 後續閉環 |
|---|---|---|
| 密碼雜湊 | owner 要求暫保留明文兼容 | 建立 migration 與 reset password 流程後切換 |
| Production ONNX artifact | 目前未提供正式 checkpoint | 交付 checkpoint 後加入 model registry 與 runtime smoke test |
| Release package cleanup | 本機存在 `.env`、`ids.db`、cache | release script 排除 runtime artifacts |
| 真實跨機部署測試 | 需 Windows Agent 與 Npcap/Suricata 環境 | 建立 Windows release checklist 與 smoke test |

## 17. 開放問題

- C3-2 production checkpoint 的正式來源、版本號與簽核流程是什麼？
- Golden-set flows 要由研究資料、端點真實流量，或混合樣本建立？
- 端點 Agent 是否允許在未來版本自動隔離主機，或永遠只提供 guided response？
- Analyst review 是否需要雙人複核規則與 RBAC 權限分層？
- release package 是否要提供 Windows installer，還是先維持 ZIP + PowerShell launcher？

## 18. 附錄：目前閉環狀態

目前已建立 `CLOSURE_AUDIT_20260507.md` 作為產品化閉環記錄。該文件列出已完成項、驗證命令、明確延後項與操作注意事項。未來每次 release 前應更新同一類 closure audit，避免產品狀態只存在聊天紀錄或個人記憶中。

