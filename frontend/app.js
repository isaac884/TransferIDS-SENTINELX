const TOKEN_KEY = "ids_access_token";
const ROLE_KEY = "ids_user_role";
const USERNAME_KEY = "ids_username";

function readExplicitApiBaseOverride() {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = String(params.get("api") || params.get("api_base") || "").trim();
    if (fromQuery) return fromQuery;
  } catch (_error) {
    // Ignore malformed query parsing.
  }
  try {
    const meta = document.querySelector("meta[name='transferids-api-base']");
    const fromMeta = String(meta?.getAttribute("content") || "").trim();
    if (fromMeta) return fromMeta;
  } catch (_error) {
    // Ignore missing document/meta access.
  }
  return "";
}

function inferDefaultApiBase() {
  if (typeof window !== "undefined" && window.location && /^https?:$/i.test(window.location.protocol)) {
    const { protocol, hostname, port, origin } = window.location;
    if ((hostname === "127.0.0.1" || hostname === "localhost") && port === "4173") {
      return `${protocol}//${hostname}:8000/api`;
    }
    return `${origin}/api`;
  }
  return "http://127.0.0.1:8000/api";
}

function shouldRespectStoredApiBase() {
  if (typeof window === "undefined" || !window.location || !/^https?:$/i.test(window.location.protocol)) {
    return false;
  }
  const { hostname, port } = window.location;
  return (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";
}

function normalizeApiBase(raw) {
  const fallback = inferDefaultApiBase();
  const value = String(raw || "").trim();
  if (!value) return fallback;
  try {
    const url = new URL(value, fallback);
    if ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.port === "4173") {
      url.port = "8000";
    }
    const pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "/") {
      url.pathname = "/api";
    } else if (!pathname.endsWith("/api")) {
      url.pathname = `${pathname}/api`;
    } else {
      url.pathname = pathname;
    }
    return `${url.origin}${url.pathname}`;
  } catch (_error) {
    const trimmed = value.replace(/\/+$/, "");
    if (!trimmed) return fallback;
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
}

const EXPLICIT_API_BASE = readExplicitApiBaseOverride();
const STORED_API_BASE = localStorage.getItem("transferids_api_base") || "";
const RUNTIME_API_BASE_INPUT =
  EXPLICIT_API_BASE ||
  (shouldRespectStoredApiBase() || (typeof window !== "undefined" && window.location && !/^https?:$/i.test(window.location.protocol))
    ? STORED_API_BASE
    : "");
const API_BASE = normalizeApiBase(RUNTIME_API_BASE_INPUT);
try {
  if (EXPLICIT_API_BASE && STORED_API_BASE !== API_BASE) {
    localStorage.setItem("transferids_api_base", API_BASE);
  } else if (shouldRespectStoredApiBase() && STORED_API_BASE !== API_BASE) {
    localStorage.setItem("transferids_api_base", API_BASE);
  }
} catch (_error) {
  // Ignore storage failures and keep using the normalized runtime base.
}
let lastApiErrorMessage = "";

function migrateLegacyAuthState() {
  try {
    const hasSessionAuth =
      Boolean(sessionStorage.getItem(TOKEN_KEY)) ||
      Boolean(sessionStorage.getItem(ROLE_KEY)) ||
      Boolean(sessionStorage.getItem(USERNAME_KEY));
    if (hasSessionAuth) return;
    const legacyToken = localStorage.getItem(TOKEN_KEY) || "";
    const legacyRole = localStorage.getItem(ROLE_KEY) || "";
    const legacyUsername = localStorage.getItem(USERNAME_KEY) || "";
    if (legacyToken) sessionStorage.setItem(TOKEN_KEY, legacyToken);
    if (legacyRole) sessionStorage.setItem(ROLE_KEY, legacyRole);
    if (legacyUsername) sessionStorage.setItem(USERNAME_KEY, legacyUsername);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
  } catch (_error) {
    // Ignore storage access issues and fall back to runtime defaults.
  }
}

migrateLegacyAuthState();

function buildEnglishDisplayTranslations(entries) {
  const translations = new Map();
  entries.forEach(([english, localized]) => {
    translations.set(english, english);
    translations.set(localized, english);
  });
  return translations;
}

const UI_TRANSLATIONS = buildEnglishDisplayTranslations([
  ["TransferIDS SENTINEL-X — Login", "TransferIDS SENTINEL-X — 登入"],
  ["TransferIDS SENTINEL-X — Dashboard", "TransferIDS SENTINEL-X — 儀表板"],
  ["TransferIDS SENTINEL-X — Data Intake", "TransferIDS SENTINEL-X — 資料匯入"],
  ["TransferIDS SENTINEL-X — Incidents", "TransferIDS SENTINEL-X — 事件案件"],
  ["TransferIDS SENTINEL-X — Response Center", "TransferIDS SENTINEL-X — 應變中心"],
  ["TransferIDS SENTINEL-X — Learning Queue", "TransferIDS SENTINEL-X — 學習佇列"],
  ["TransferIDS SENTINEL-X — Insights", "TransferIDS SENTINEL-X — 分析洞察"],
  ["TransferIDS SENTINEL-X — Reports", "TransferIDS SENTINEL-X — 報表與匯出"],
  ["TransferIDS SENTINEL-X — Settings", "TransferIDS SENTINEL-X — 設定"],
  ["TransferIDS // Secure Access", "TransferIDS // 安全營運入口"],
  ["TransferIDS // SOC", "TransferIDS // SOC"],
  ["Cross-domain intrusion detection and guided incident response", "跨域入侵偵測與引導式事件應變"],
  ["Transform live traffic and imported telemetry into events, incidents, response guidance, diagnostics, and exportable security evidence.", "將即時流量與匯入遙測轉換為事件、案件、應變建議、診斷結果與可匯出的安全證據。"],
  ["Connect the product UI to the live detection backend.", "將平台入口連接到即時偵測後端。"],
  ["Use a valid platform account to unlock Dashboard, Data Intake, Incidents, Response, Insights, Reports, and Settings.", "使用有效的平台帳號以進入安全總覽、資料匯入、事件案件、應變中心、分析洞察、報表與設定。"],
  ["SOC Workflow", "威脅總覽"],
  ["Cross-Domain Detection", "攻擊事件帳本"],
  ["Incident-Centric", "處置決策"],
  ["Model Diagnostics", "模型優化"],
  ["Authentication", "身分驗證"],
  ["Platform Login", "平台登入"],
  ["Backend auth", "後端驗證"],
  ["Sign In", "登入"],
  ["Create Account", "建立帳號"],
  ["Username", "使用者名稱"],
  ["Password", "密碼"],
  ["Confirm Password", "確認密碼"],
  ["Use an existing platform account to continue.", "登入後將直接進入安全總覽。"],
  ["Log Out", "登出"],
  ["Dashboard", "儀表板"],
  ["Incidents", "事件案件"],
  ["Response Center", "應變中心"],
  ["Learning Queue", "學習佇列"],
  ["Insights", "分析洞察"],
  ["Settings", "設定"],
  ["Data Intake", "資料匯入"],
  ["Reports", "報表"],
  ["Reports & Export", "報表與匯出"],
  ["Live", "即時"],
  ["Queue", "佇列"],
  ["Act", "處置"],
  ["Train", "訓練"],
  ["Model", "模型"],
  ["Ctrl", "控制"],
  ["Input", "輸入"],
  ["Export", "匯出"],
  ["Mission", "任務"],
  ["Core Workspace", "核心工作區"],
  ["Operations", "操作功能"],
  ["Support", "支援"],
  ["Logs", "日誌"],
  ["Stream Active", "串流啟用"],
  ["Security Overview", "安全總覽"],
  ["Monitor current risk, watch active attack paths, and decide whether to move into incidents or response.", "監看當前風險、追蹤攻擊路徑，並決定是否進入事件案件或應變處置。"],
  ["Search incidents, IPs, services", "搜尋事件、IP、服務"],
  ["Search sources, jobs, schemas", "搜尋來源、工作、結構"],
  ["Search incident, IP, assignee", "搜尋事件案件、IP、指派人"],
  ["Search incident, action, playbook", "搜尋事件案件、動作、劇本"],
  ["Search strategy, drift, metric", "搜尋策略、漂移、指標"],
  ["Search user, collector, model", "搜尋使用者、收集器、模型"],
  ["Notifications", "通知"],
  ["Platform Risk", "平台風險"],
  ["Real-time Risk Score", "即時風險分數"],
  ["Weighted from critical alerts, open incidents, SLA breaches, average risk score, and recent high-confidence attacks.", "依據嚴重警報、開啟中的案件、SLA 違反、平均風險分數與近期高信心攻擊綜合計算。"],
  ["Priority Snapshot", "重點快照"],
  ["Operational KPI Board", "營運 KPI 看板"],
  ["Focus the first decision on pressure, response speed, and queue volume before opening detailed cases.", "在打開詳細案件前，先聚焦在壓力、應變速度與佇列量。"],
  ["Geographic Attack View", "地理攻擊視圖"],
  ["Global / Regional Attack Map", "全球／區域攻擊地圖"],
  ["See where suspicious traffic is coming from, which protected zones it is reaching, and where containment should start.", "查看可疑流量來自哪裡、抵達哪些受保護區域，以及應從哪裡開始控制。"],
  ["Threat Momentum", "威脅動態"],
  ["Threat Trend Chart", "威脅趨勢圖"],
  ["Track recent attack pressure, alert mix, and drift-affected event movement without opening technical diagnostics.", "不用打開技術診斷也能追蹤近期攻擊壓力、警報組成與受漂移影響的事件變化。"],
  ["Immediate Attention", "即時關注"],
  ["Threat Ticker", "威脅快報"],
  ["Latest critical or high-severity alerts. Select one to jump straight into incident review or response.", "顯示最新的嚴重或高風險警報。可直接點選進入案件審查或應變。"],
  ["Adaptive Posture", "自適應態勢"],
  ["Strategy Shift Monitor", "策略切換監視"],
  ["Latest Event Feed", "最新事件資料流"],
  ["Recent Events", "近期事件"],
  ["Map Data Mode", "地圖資料模式"],
  ["Coordinate Provenance", "座標來源"],
  ["Regional Context", "區域情境"],
  ["Current focus", "目前焦點"],
  ["Platform Login", "平台登入"],
  ["Source Control", "來源控制"],
  ["Data Intake is the operational entry point for CSV, NetFlow, Suricata, packet capture, and endpoint telemetry.", "資料匯入是 CSV、NetFlow、Suricata、封包擷取與端點遙測的操作入口。"],
  ["Step 1", "步驟 1"],
  ["Select Data Source", "選擇資料來源"],
  ["Pick the feed you want to analyze. This page should feel like operations, not backend plumbing.", "選擇你要分析的資料流。這一頁應該像操作介面，而不是後端管線。"],
  ["Step 2", "步驟 2"],
  ["Choose Detection Mode", "選擇偵測模式"],
  ["Select the depth of analysis. Research detail stays in Insights, not in the operator workflow.", "選擇分析深度。研究細節應放在分析洞察，而不是操作流程中。"],
  ["Detection Strategy", "偵測策略"],
  ["Model Backbone", "模型骨幹"],
  ["Transfer Route", "遷移路徑"],
  ["Task Type", "任務類型"],
  ["Standard (Direct Transfer Baseline)", "標準（直接遷移基線）"],
  ["Adaptive (Enhanced Cross-Domain Detection)", "自適應（增強型跨域偵測）"],
  ["Enhanced (Autoencoder-Enhanced Target-Assisted Fine-Tuning)", "增強（自編碼器強化目標輔助微調）"],
  ["Binary", "二元分類"],
  ["Harmonized Multiclass", "統一多分類"],
  ["Enable AE Enhancement", "啟用 AE 強化"],
  ["Enable Guided Review", "啟用引導式審查"],
  ["Operational Sensor", "營運感測器"],
  ["Suricata Sensor Runtime", "Suricata 感測器執行狀態"],
  ["See whether the live IDS sensor is really running, which adapter it is bound to, and whether new telemetry is arriving.", "查看平台後端主機上的即時 IDS 感測器是否真的在執行、綁定到哪張網卡，以及是否有新遙測資料進來。"],
  ["User Control", "平台控制"],
  ["Live Sensor Console", "後端感測器控制台"],
  ["Start live capture directly from the product. Replay datasets are uploaded into the platform library automatically.", "直接從產品介面啟動即時擷取。重播資料集會自動上傳到平台資料庫。"],
  ["Live Interface", "後端感測網卡"],
  ["Replay Dataset (Optional)", "重播資料集（選填）"],
  ["If you upload a replay dataset here, the platform stores it in a managed replay library and starts the sensor without asking for a filesystem path.", "若你在此上傳重播資料集，平台會將其存入受管控的重播庫，並在不要求檔案路徑的情況下啟動感測器。"],
  ["Start Live Sensor", "啟動即時感測器"],
  ["Stop Sensor", "停止感測器"],
  ["Refresh Sensor Status", "重新整理感測器狀態"],
  ["Upload and Analyze", "上傳並分析"],
  ["Run Detection", "執行偵測"],
  ["Upload a file or start live capture, then review what the platform detected immediately.", "上傳檔案或啟動即時擷取後，立即查看平台偵測到的結果。"],
  ["Analyze CSV", "分析 CSV"],
  ["Analyze NetFlow", "分析 NetFlow"],
  ["Start Live Capture", "開始即時擷取"],
  ["Stop & Analyze", "停止並分析"],
  ["CSV File", "CSV 檔案"],
  ["NetFlow File", "NetFlow 檔案"],
  ["Bring in data", "匯入資料"],
  ["Score suspicious traffic", "評分可疑流量"],
  ["Open incidents", "建立事件案件"],
  ["Analysis Snapshot", "分析快照"],
  ["What the Platform Just Found", "平台剛偵測到的內容"],
  ["Show the useful result: how many events were created, what they were, and which incidents were opened.", "顯示真正有用的結果：建立了多少事件、事件內容是什麼，以及開啟了哪些案件。"],
  ["Waiting for input", "等待輸入"],
  ["Data Integrity", "資料完整性"],
  ["Operational Input Boundary", "營運輸入邊界"],
  ["Only persisted telemetry and operator-submitted files are allowed into the detection path.", "偵測路徑只接受已持久化遙測與操作員主動提交的檔案。"],
  ["Attack Type", "攻擊類型"],
  ["Intensity", "強度"],
  ["Port Scan", "連接埠掃描"],
  ["Brute Force", "暴力破解"],
  ["Infiltration", "入侵滲透"],
  ["Case Workflow", "案件流程"],
  ["Incidents should become the working queue where low-level detections are translated into prioritized cases.", "事件案件頁應成為工作佇列，將低階偵測結果轉成有優先順序的案件。"],
  ["Incident Queue", "事件案件佇列"],
  ["Case Management", "案件管理"],
  ["This page turns raw detection results into actionable cases. Analysts should use it to decide what to handle first, not to re-read every event.", "此頁會把原始偵測結果轉成可處理的案件。分析師應用它決定先處理什麼，而不是重讀每一筆事件。"],
  ["Search", "搜尋"],
  ["Priority", "優先級"],
  ["SLA Status", "SLA 狀態"],
  ["Assignee", "指派人"],
  ["Status", "狀態"],
  ["All priorities", "全部優先級"],
  ["All SLA states", "全部 SLA 狀態"],
  ["All assignees", "全部指派人"],
  ["All statuses", "全部狀態"],
  ["SLA Watch Panel", "SLA 監看面板"],
  ["Use this strip to understand queue pressure before going into any individual case.", "在進入個別案件前，先用這個區塊理解整體佇列壓力。"],
  ["Response Candidate Queue", "應變候選佇列"],
  ["Immediate Handling Targets", "優先處理目標"],
  ["These are the incidents most likely to need analyst attention first.", "這些是最需要分析師優先關注的案件。"],
  ["Decision Unit", "決策單位"],
  ["Incident Queue Table", "事件案件表"],
  ["Events are data. Incidents are the decision unit. This table should reduce noise and surface what actually matters.", "事件是資料；案件才是決策單位。這張表應該降低噪音，只呈現真正重要的內容。"],
  ["Open Response Center", "開啟應變中心"],
  ["View Drift Detail", "查看漂移細節"],
  ["Incident ID", "事件案件 ID"],
  ["Risk", "風險"],
  ["Attack Label", "攻擊標籤"],
  ["Events", "事件數"],
  ["Detection Strategy", "偵測策略"],
  ["Drift Count", "漂移數量"],
  ["Updated", "更新時間"],
  ["Incident Drill-down", "事件案件深查"],
  ["Selected Incident Detail", "已選事件案件詳情"],
  ["Move from grouped case to story: source, target, event count, timeline, and case lifecycle.", "把聚合案件轉成可閱讀的故事：來源、目標、事件數、時間線與案件生命週期。"],
  ["Select an incident", "請選擇事件案件"],
  ["Time", "時間"],
  ["Event ID", "事件 ID"],
  ["Action", "動作"],
  ["Confidence", "信心值"],
  ["Note", "備註"],
  ["Case Evidence", "案件證據"],
  ["Why This Is One Incident", "為何這是一個事件案件"],
  ["Keep the grouping evidence short and visual. Analysts should validate the case quickly, not read a correlation essay.", "讓分組證據保持精簡且可視化。分析師應快速確認案件，而不是閱讀冗長的關聯說明。"],
  ["Compact view", "精簡檢視"],
  ["Response Goal", "應變目標"],
  ["Move from detection to action using incident context, response guidance, firewall rules, and evidence export.", "利用案件情境、應變建議、防火牆規則與證據匯出，從偵測走向實際處置。"],
  ["Context Panel", "情境面板"],
  ["Incident Context", "事件案件情境"],
  ["Load the selected case and keep the full operational context visible so the analyst does not need to jump back to the queue.", "載入選定案件並保留完整操作情境，讓分析師不必跳回佇列。"],
  ["Workflow Panel", "工作流程面板"],
  ["Operational Status", "營運狀態"],
  ["Track assignee, case status, SLA, next step, and operational readiness from one place.", "在同一處追蹤指派人、案件狀態、SLA、下一步與操作準備度。"],
  ["Investigating", "調查中"],
  ["Contained", "已控制"],
  ["Resolved", "已解決"],
  ["Attack Story", "攻擊故事線"],
  ["Timeline and Evidence", "時間線與證據"],
  ["Evidence chain", "證據鏈"],
  ["Advanced Layer", "進階層"],
  ["Insights should contain the technical detail that proves model reliability without overloading the operational dashboard.", "分析洞察應承載證明模型可靠度的技術細節，同時不讓操作儀表板過載。"],
  ["Current Detection Setup", "目前偵測配置"],
  ["Runtime Context", "執行情境"],
  ["Diagnostic Summary", "診斷摘要"],
  ["Model Health", "模型健康度"],
  ["Drift Analysis", "漂移分析"],
  ["Feature Drift Profile", "特徵漂移輪廓"],
  ["Confidence Breakdown", "信心值拆解"],
  ["Prediction Reliability", "預測可靠度"],
  ["Research Evidence", "研究證據"],
  ["Strategy Comparison", "策略比較"],
  ["Top Contributing Features", "主要貢獻特徵"],
  ["Feature Importance", "特徵重要度"],
  ["Interpretation", "解讀"],
  ["What This Means", "這代表什麼"],
  ["Control Plane", "控制平面"],
  ["Settings should expose collector state, active detection strategy, and platform configuration without becoming a raw debugging console.", "設定頁應呈現收集器狀態、啟用中的偵測策略與平台配置，而不是變成原始除錯主控台。"],
  ["Platform Administration", "平台管理"],
  ["Control Summary", "控制摘要"],
  ["Keep the admin layer focused on platform identity, collector readiness, and active model lineage instead of turning it into a raw debug console.", "讓管理層聚焦在平台身分、收集器就緒度與目前模型譜系，而不是變成除錯介面。"],
  ["Runtime Actions", "執行動作"],
  ["Refresh and Verify", "重新整理與驗證"],
  ["Expose a simple operational check so the product visibly supports management tasks without pretending to be a full infrastructure console.", "提供簡單的操作檢查，讓產品能支援管理工作，而不假裝成完整的基礎設施主控台。"],
  ["Refresh System State", "重新整理系統狀態"],
  ["Sensor Runtime", "感測器執行狀態"],
  ["Suricata Live Sensor", "Suricata 即時感測器"],
  ["Separate raw collector health from the actual IDS sensor process so operators can tell whether the platform is only polling a file or actively watching an interface.", "將原始收集器健康度與實際 IDS 感測器程序區分開來，讓操作員知道平台只是輪詢檔案，還是真的在監看網卡。"],
  ["Sensor Control", "感測器控制"],
  ["Interface Selection", "介面選擇"],
  ["Give administrators a simple runtime control for starting or stopping the live Suricata sensor without exposing raw shell commands.", "提供管理員簡單的執行期控制，可啟動或停止 Suricata 即時感測器，而不暴露原始 shell 指令。"],
  ["Preferred Interface", "偏好介面"],
  ["Replay datasets are managed from Data Intake. Settings keeps sensor control focused on live operations.", "重播資料集由資料匯入頁管理；設定頁則讓感測器控制專注於即時操作。"],
  ["Start Sensor", "啟動感測器"],
  ["GeoIP Runtime", "GeoIP 執行狀態"],
  ["Geographic Enrichment", "地理增補"],
  ["Show whether the attack map is driven by a real GeoIP database or only by protected-site fallback anchors.", "顯示攻擊地圖是由真實 GeoIP 資料庫驅動，還是僅依靠受保護站點錨點。"],
  ["Map Coverage", "地圖覆蓋率"],
  ["Dashboard Geolocation Coverage", "儀表板地理定位覆蓋率"],
  ["Expose how many nodes in the current dashboard scope are actually geolocated, not just visually projected.", "顯示目前儀表板範圍內有多少節點是真正完成地理定位，而不是只有視覺投影。"],
  ["Users Panel", "使用者面板"],
  ["Roles and Access", "角色與權限"],
  ["Show who is allowed to operate the platform and what role they hold in the product workflow.", "顯示誰有權操作平台，以及他們在產品流程中擔任的角色。"],
  ["Collectors Panel", "收集器面板"],
  ["Data Source Status", "資料來源狀態"],
  ["Track whether the product’s input paths are healthy, active, and ready to feed the detection pipeline.", "追蹤產品輸入路徑是否健康、啟用且可供偵測流程使用。"],
  ["Collector ID", "收集器 ID"],
  ["Source Type", "來源類型"],
  ["Interval", "間隔"],
  ["Last Run", "上次執行"],
  ["Model Registry", "模型登錄"],
  ["Active Model Configuration", "目前模型配置"],
  ["Connect the deployed product view to the research lifecycle by exposing active strategy, schema version, and model version.", "透過顯示目前策略、特徵結構版本與模型版本，把已部署產品與研究生命週期連起來。"],
  ["Model Lineage", "模型譜系"],
  ["TransferIDS Evolution Path", "TransferIDS 演進路徑"],
  ["The key value of this page is not general settings. It is showing how the model evolves from direct transfer to adaptive and feedback-assisted versions.", "這一頁的核心價值不是一般設定，而是展示模型如何從直接遷移演進到自適應與回饋輔助版本。"],
  ["Model Registry History", "模型登錄歷史"],
  ["Registered Versions", "已登錄版本"],
  ["Show the actual deployment history so the product lifecycle stays auditable.", "顯示真實部署歷史，讓產品生命週期保持可稽核。"],
  ["Detection Strategy", "偵測策略"],
  ["Source Job", "來源工作"],
  ["Created", "建立時間"],
  ["Fine-Tuning Jobs", "微調工作"],
  ["Training Lifecycle", "訓練生命週期"],
  ["Track which candidate queues were promoted into training jobs and which of those jobs produced a registered model version.", "追蹤哪些候選佇列被提升為訓練工作，以及哪些工作產出了已登錄模型版本。"],
  ["Job ID", "工作 ID"],
  ["Scope", "範圍"],
  ["Candidate Count", "候選數量"],
  ["Requested Version", "請求版本"],
  ["Output Version", "輸出版本"],
  ["Authenticate against the current FastAPI backend at", "請輸入平台帳號與密碼以繼續。"],
  ["Register a new analyst account against the current FastAPI backend at", "建立平台帳號後即可開始使用。"],
  ["New accounts are created with the default user role, then signed in automatically.", "新帳號會先以預設使用者角色建立，之後自動登入。"],
  ["Critical", "嚴重"],
  ["High", "高"],
  ["Medium", "中"],
  ["Low", "低"],
  ["Ready", "就緒"],
  ["Idle", "閒置"],
  ["Running", "執行中"],
  ["Configured", "已設定"],
  ["Unavailable", "不可用"],
  ["Enabled", "已啟用"],
  ["Disabled", "已停用"],
  ["Manual", "手動"],
  ["Operational", "運作中"],
  ["Present", "已存在"],
  ["Missing", "缺失"],
  ["Installed", "已安裝"],
  ["Admin", "管理員"],
  ["Researcher", "研究員"],
  ["Viewer", "檢視者"],
  ["User", "使用者"],
  ["Operator", "操作員"],
  ["Real GeoIP", "真實 GeoIP"],
  ["Protected anchor", "受保護站點錨點"],
  ["Protected site anchor", "受保護站點錨點"],
  ["Fallback placement", "備援落點"],
  ["GeoIP unavailable", "GeoIP 不可用"],
  ["GeoIP online", "GeoIP 已上線"],
  ["No active incident path", "目前沒有啟用中的事件路徑"],
  ["Backend unavailable", "後端不可用"],
  ["Telemetry source", "遙測來源"],
  ["Live backend incidents", "後端即時事件案件"],
  ["Fallback / unavailable", "備援／不可用"],
  ["Route count", "路徑數量"],
  ["External sources", "外部來源"],
  ["Protected targets", "受保護目標"],
  ["Global regions", "全球區域"],
  ["Protected zones", "受保護區域"],
  ["Critical path", "嚴重路徑"],
  ["Immediate containment", "立即控制"],
  ["High path", "高風險路徑"],
  ["Rapid review", "快速審查"],
  ["Medium path", "中風險路徑"],
  ["Monitor closely", "密切監控"],
  ["No live incident route is active right now.", "目前沒有即時事件案件路徑。"],
  ["Map is waiting for live backend telemetry.", "地圖正在等待後端即時遙測。"],
  ["Current focus", "目前焦點"],
  ["Awaiting live target", "等待即時目標"],
  ["Global Attack Spread", "全球攻擊分布"],
  ["Regional Focus", "區域焦點"],
  ["Legend", "圖例"],
  ["Projection", "投影"],
  ["Lat / Lon anchor map", "經緯度錨點地圖"],
  ["High Confidence", "高信心"],
  ["Low Confidence", "低信心"],
  ["Adaptive active", "自適應已啟用"],
  ["Action required", "需要處置"],
  ["Telemetry only", "僅限真實遙測"],
  ["Product-facing", "產品化操作"],
  ["Near-real-time feed", "近即時資料流"],
  ["Admin / Researcher", "管理員／研究員"],
  ["Operational control plane", "營運控制平面"],
  ["Control plane", "控制平面"],
  ["RBAC visible", "角色權限可見"],
  ["Collectors visible", "收集器可見"],
  ["Registry-backed", "由登錄支援"],
  ["Lifecycle tracked", "生命週期追蹤中"],
  ["Lineage tracked", "譜系已追蹤"],
  ["Research linkage", "研究連結"],
  ["Map-aware", "地圖感知"],
  ["Critical posture", "嚴重態勢"],
  ["Awaiting telemetry", "等待遙測資料"],
  ["Interactive map unavailable. Falling back to telemetry summary.", "互動地圖暫時不可用，已切換為遙測摘要。"],
  ["Last 60 minutes", "最近 60 分鐘"],
  ["Live feed", "即時資料流"],
  ["Model stable", "模型穩定"],
  ["Recent High-Risk Events", "近期高風險事件"],
  ["Latest Escalation Feed", "最新升級資料流"],
  ["Recent events that are already strong enough to influence operator attention and queue order.", "顯示已足以影響操作員注意力與案件排序的近期事件。"],
  ["Open Intake", "前往匯入"],
  ["Open Incidents", "開啟事件案件"],
  ["Incident Center Queue", "事件案件中心佇列"],
  ["This table answers the operator question that matters on the dashboard: what should be handled first right now?", "這張表直接回答儀表板上最重要的問題：此刻最該先處理什麼？"],
  ["View Detailed Drift Analysis", "查看詳細漂移分析"],
  ["Threat detail", "威脅詳情"],
  ["Threat detail content.", "威脅詳情內容。"],
  ["Incident Route", "事件案件路徑"],
  ["Move directly into grouped case investigation if the analyst needs more evidence and timeline context.", "若分析師需要更多證據與時間線情境，可直接進入分組案件調查。"],
  ["Quick Response Context", "快速應變情境"],
  ["Response guidance.", "應變指引。"],
  ["This quick card is the bridge between detection and immediate handling.", "這張快速卡片是偵測與立即處置之間的橋梁。"],
  ["Go to Incident", "前往事件案件"],
  ["Quick Response", "快速應變"],
  ["P1 / Critical", "P1／嚴重"],
  ["Recommended Actions", "建議動作"],
  ["Action Playbook", "處置劇本"],
  ["Move from label prediction into guided containment. This is where the system becomes a decision support product instead of a detector only.", "從標籤預測進入引導式控制。這一區讓系統從單純偵測器變成決策支援產品。"],
  ["Response ready", "可立即應變"],
  ["Analyst Feedback Loop", "分析師回饋循環"],
  ["Decision + Learning", "決策＋學習"],
  ["The most important action on this page is not only to respond, but to teach the system whether the detection was correct.", "這一頁最重要的動作不只是回應事件，更是告訴系統這次偵測是否正確。"],
  ["Feedback enabled", "回饋已啟用"],
  ["True Positive", "標為攻擊"],
  ["False Positive", "標為正常"],
  ["Uncertain", "待人工確認"],
  ["Feedback Type", "回饋類型"],
  ["Analyst Validation", "分析師確認"],
  ["Quality Review", "品質審查"],
  ["Training Candidate", "訓練候選"],
  ["Confidence Override", "信心值覆寫"],
  ["Analyst Note", "分析師備註"],
  ["Write why this incident should be confirmed, rejected, or sent for future adaptation.", "請說明為何此事件案件應被確認、駁回，或送入後續自適應流程。"],
  ["Add to Weak-Supervision Review Queue", "加入弱監督審查佇列"],
  ["Add to Target-Assisted Fine-Tuning Queue", "加入目標輔助微調佇列"],
  ["Submit Feedback and Update Case", "提交回饋並更新案件"],
  ["Artifact Export", "證據匯出"],
  ["Response Output", "應變輸出"],
  ["Prepare incident report content, firewall rule text, and evidence bundle output for downstream handling.", "準備事件案件報告內容、防火牆規則文字與證據封包，供後續處置使用。"],
  ["Export ready", "可匯出"],
  ["Learning Path", "學習路徑"],
  ["Track which analyst-reviewed incidents become weak-supervision review candidates and which ones are ready for target-assisted fine-tuning.", "追蹤哪些經分析師審查的案件會成為弱監督審查候選，以及哪些已可進入目標輔助微調。"],
  ["Review Queue", "審查佇列"],
  ["Fine-Tuning Queue", "微調佇列"],
  ["Tracked", "已追蹤"],
  ["Candidate Summary", "候選摘要"],
  ["Supervision Readiness", "監督就緒度"],
  ["This page separates operational feedback records into review and fine-tuning candidate queues so the future model update path stays visible and traceable.", "此頁將操作回饋紀錄分流為審查與微調候選佇列，讓後續模型更新路徑保持可見且可追蹤。"],
  ["Feedback persisted", "回饋已持久化"],
  ["Queue Controls", "佇列控制"],
  ["Export and Orchestrate", "匯出與編排"],
  ["Filter candidates, export the current set, trigger a real fine-tuning job record, and register the next model version when a job is ready.", "篩選候選資料、匯出當前集合、觸發真實微調工作紀錄，並在工作完成後登錄下一個模型版本。"],
  ["Review before train", "訓練前先審查"],
  ["Pool Scope", "佇列範圍"],
  ["All Queues", "全部佇列"],
  ["All Labels", "全部標籤"],
  ["Training Status", "訓練狀態"],
  ["All States", "全部狀態"],
  ["Pending", "待處理"],
  ["Used for Training", "已用於訓練"],
  ["Model Version", "模型版本"],
  ["Export Candidate Set", "匯出候選集合"],
  ["Trigger Fine-Tuning Job", "觸發微調工作"],
  ["Register Model Version", "登錄模型版本"],
  ["Weak-Supervision Candidates", "弱監督候選"],
  ["Cases staged for analyst-guided review before they are promoted into stronger target-domain supervision.", "這些案件會先進入分析師引導審查，再被提升為更強的目標域監督資料。"],
  ["Review path", "審查路徑"],
  ["Target-Assisted Candidates", "目標輔助候選"],
  ["Cases that already passed analyst review and can later feed supervised model refinement on the target environment.", "這些案件已通過分析師審查，後續可用於目標環境的監督式模型微調。"],
  ["Fine-tuning path", "微調路徑"],
  ["Training Orchestration Status", "訓練編排狀態"],
  ["Track when candidate sets were exported, queued for training, and later registered as deployable model versions.", "追蹤候選集合何時被匯出、排入訓練，以及何時登錄為可部署模型版本。"],
  ["Job traceability", "工作可追蹤"],
  ["Queue Notes", "佇列說明"],
  ["Why This Queue Exists", "為何需要此佇列"],
  ["The platform should not pretend retraining already happens automatically. This queue exists to make candidate supervision visible before full orchestration is added.", "平台不應假裝重訓已經完全自動化。此佇列的存在是為了在完整編排上線前，讓候選監督流程清楚可見。"],
  ["Traceable learning path", "可追蹤的學習路徑"],
  ["Report Preview", "報表預覽"],
  ["Selected Incident Export", "已選事件案件匯出"],
  ["Review the core case context before generating a human-readable or machine-readable evidence package.", "在產出可讀或可機讀的證據封包前，先檢視核心案件情境。"],
  ["Export Controls", "匯出控制"],
  ["Bundle Generator", "封包產生器"],
  ["Choose report scope, output format, and evidence type before exporting the final artifact bundle.", "在匯出最終證據封包前，先選擇報表範圍、輸出格式與證據類型。"],
  ["Time Range", "時間範圍"],
  ["Last 1 hour", "最近 1 小時"],
  ["Last 24 hours", "最近 24 小時"],
  ["Custom Range", "自訂範圍"],
  ["Export Format", "匯出格式"],
  ["Generate Incident Report", "產生事件案件報告"],
  ["Attack Timeline Scatter", "攻擊時間散點圖"],
  ["Incident Event Story", "事件案件事件故事線"],
  ["Use a time-based visual to show when the incident accelerated and which event types drove the case into response.", "用時間視覺化方式呈現事件案件何時升高，以及哪些事件類型推動案件進入應變。"],
  ["Mitigation Radar", "緩解雷達圖"],
  ["Response Performance", "應變成效"],
  ["Summarize how the current handling performed across detection speed, confidence, SLA, and analyst certainty.", "摘要目前處置在偵測速度、信心值、SLA 與分析師確定度上的表現。"],
  ["Evidence Package Contents", "證據封包內容"],
  ["Bundle the case, response, and model evidence together so the output is readable by humans and useful to downstream systems.", "將案件、應變與模型證據整合在一起，讓輸出同時便於人員閱讀與下游系統使用。"],
  ["Structured output", "結構化輸出"],
  ["Export History", "匯出歷史"],
  ["Artifact Log", "證據紀錄"],
  ["Track previous report generations so outputs become traceable evidence instead of one-off downloads.", "追蹤過去的報表產生紀錄，讓輸出成為可追溯證據，而不是一次性下載。"],
  ["Traceable", "可追溯"],
  ["Report ID", "報表 ID"],
  ["Created By", "建立者"],
  ["Download", "下載"],
  ["Range", "範圍"],
  ["Bundle Scope", "封包範圍"],
  ["The time window applied to the generated evidence set.", "套用於產出證據集合的時間視窗。"],
  ["Human-readable for PDF, analysis-friendly for CSV, integration-ready for JSON.", "PDF 適合人工閱讀、CSV 便於分析、JSON 則可直接整合。"],
  ["Incident Selected", "已選事件案件"],
  ["Collect Related Data", "收集相關資料"],
  ["Generate Report Structure", "產生報表結構"],
  ["Artifact Stored", "證據已儲存"],
  ["Attack timeline chart", "攻擊時間線圖"],
  ["Mitigation radar chart", "緩解雷達圖"],
  ["Current Incident", "目前事件案件"],
  ["Review Candidates", "審查候選"],
  ["Analyst-validated cases staged for weak-supervision review.", "經分析師確認的案件已排入弱監督審查。"],
  ["Fine-Tuning Candidates", "微調候選"],
  ["Target-domain cases staged for future target-assisted fine-tuning.", "目標域案件已排入後續目標輔助微調流程。"],
  ["Confirmed Positives", "已確認陽性"],
  ["Signals most suitable for supervised learning and reliability tracking.", "這些訊號最適合用於監督式學習與可靠度追蹤。"],
  ["Records already marked as consumed by a future model update workflow.", "這些紀錄已標示為後續模型更新流程所使用。"],
  ["Fine-tuning jobs already triggered from the candidate queues.", "這些微調工作已由候選佇列觸發。"],
  ["Review Queue Skipped", "已略過審查佇列"],
  ["Fine-Tuning Skipped", "已略過微調佇列"],
  ["Queue Logic", "佇列邏輯"],
  ["Decision to Learning", "從決策到學習"],
  ["Current Scope", "目前範圍"],
  ["Real Feedback and Real Job Records", "真實回饋與真實工作紀錄"],
  ["Only analyst-reviewed cases enter this queue. The page separates weak-supervision review from target-assisted fine-tuning so the training path remains traceable.", "只有經分析師審查的案件才會進入此佇列。此頁將弱監督審查與目標輔助微調分開，讓訓練路徑保持可追蹤。"],
  ["This queue now uses persisted analyst feedback, exported candidate snapshots, and real fine-tuning job records. Actual model training still depends on the external training runner.", "此佇列目前使用已持久化的分析師回饋、匯出的候選快照與真實微調工作紀錄；實際模型訓練仍依賴外部訓練執行器。"],
  ["System Status", "系統狀態"],
  ["Runtime Source", "執行來源"],
  ["FastAPI-ready / local bridge", "FastAPI 即時後端／本地橋接"],
  ["Sensor Mode", "感測器模式"],
  ["Live capture", "即時擷取"],
  ["PCAP replay", "PCAP 重播"],
  ["Sensor Target", "感測器目標"],
  ["Active Route", "啟用路徑"],
  ["Last Registry Update", "上次登錄更新"],
  ["Admin Scope", "管理範圍"],
  ["Users / Collectors / Registry", "使用者／收集器／登錄"],
  ["Connected APIs", "已連接 API"],
  ["Fallback anchor only", "僅使用備援錨點"],
  ["Real GeoIP + protected-site anchor", "真實 GeoIP＋受保護站點錨點"],
  ["Protected-site anchor only", "僅使用受保護站點錨點"],
  ["GeoIP Database", "GeoIP 資料庫"],
  ["Provider", "提供者"],
  ["Runtime Mode", "執行模式"],
  ["Protected Site", "受保護站點"],
  ["Anchor Region", "錨點區域"],
  ["Anchor Coordinates", "錨點座標"],
  ["City DB Path", "城市資料庫路徑"],
  ["Not configured", "尚未設定"],
  ["GeoIP Library", "GeoIP 函式庫"],
  ["Geolocated Nodes", "已定位節點"],
  ["Unique source and destination nodes on the current dashboard map with usable coordinates.", "目前儀表板地圖上具備可用座標的唯一來源與目標節點數。"],
  ["Source Nodes", "來源節點"],
  ["Distinct external origins in the current priority incident set.", "目前高優先案件集合中的不同外部來源。"],
  ["Protected Targets", "受保護目標"],
  ["Internal destinations currently resolved through the protected-site anchor.", "目前透過受保護站點錨點解析出的內部目標。"],
  ["Unresolved Public Sources", "未解析的公開來源"],
  ["Public source nodes still missing real GeoIP coordinates and will remain hidden on the map.", "仍缺少真實 GeoIP 座標的公開來源節點，地圖將暫不繪製。"],
  ["Dashboard Paths", "儀表板路徑"],
  ["Attack paths currently visualized on the geographic dashboard view.", "目前在地理儀表板上可視化的攻擊路徑。"],
  ["Coverage Health", "覆蓋健康度"],
  ["Map coverage is fully resolved for the current incident set.", "目前事件案件集合的地圖覆蓋已完全解析。"],
  ["Users", "使用者"],
  ["Visible platform identities and role assignments.", "可見的平台身分與角色指派。"],
  ["Active Collectors", "啟用中的收集器"],
  ["Data source paths currently feeding or ready to feed the platform.", "目前正在供應或已準備供應平台的資料來源路徑。"],
  ["Live Sensor", "即時感測器"],
  ["No live interface bound yet.", "尚未綁定即時介面。"],
  ["Persisted lifecycle entries in the model registry.", "模型登錄中的已持久化生命週期紀錄。"],
  ["The active product-facing adaptation path.", "目前面向產品的自適應路徑。"],
  ["Active Model", "目前模型"],
  ["Schema Version", "結構版本"],
  ["Last Updated", "上次更新"],
  ["Transfer Direction", "遷移方向"],
  ["Lineage Stage", "譜系階段"],
  ["Review Pool", "審查池"],
  ["Fine-Tuning Pool", "微調池"],
  ["Used", "已使用"],
  ["Healthy", "健康"],
  ["At Risk", "有風險"],
  ["Breached", "已違反"],
  ["Open", "開啟中"],
  ["Connected", "已連線"],
  ["Fallback", "備援"],
  ["Updating", "更新中"],
  ["EVE File", "EVE 檔案"],
  ["Mode", "模式"],
  ["Adaptive Detection", "自適應偵測"],
  ["Incident", "事件案件"],
  ["Manual Suricata Poll", "手動 Suricata 輪詢"],
  ["Redirecting to Data Intake", "重新導向至資料匯入"],
  ["Redirecting to", "正在重新導向至"],
  ["intake.html", "資料匯入頁面"],
  ["Data Intake Role", "資料匯入定位"],
  ["This page is the real detection entry point. It receives CSV, NetFlow, Suricata, and live capture telemetry before forwarding data into feature alignment and the detection strategy.", "此頁是真正的偵測入口。它會接收 CSV、NetFlow、Suricata 與即時擷取遙測，再把資料送入特徵對齊與偵測策略。"],
  ["Next Build Items", "下一步建置項目"],
  ["Source selector with CSV, NetFlow, Suricata, and Capture.", "提供 CSV、NetFlow、Suricata 與擷取的來源選擇器。"],
  ["Pre-ingestion validation and schema summary.", "匯入前驗證與結構摘要。"],
  ["Persisted intake validation tied to the active backend schema.", "與目前後端結構綁定的持久化匯入驗證。"],
  ["Detection strategy selector linked to TransferIDS stages.", "與 TransferIDS 階段連動的偵測策略選擇器。"],
  ["Incident Queue Role", "事件案件佇列定位"],
  ["This page will prioritize grouped cases using incident risk, SLA pressure, adaptation context, and response readiness so analysts can decide what to handle first.", "此頁會根據事件案件風險、SLA 壓力、自適應情境與應變就緒度排序，讓分析師決定先處理什麼。"],
  ["Table-first incident queue with filter bar.", "以表格為主的事件案件佇列與篩選列。"],
  ["SLA watch strip and response candidate queue.", "SLA 監看列與應變候選佇列。"],
  ["Drill-down into incident details and case header view.", "深入查看事件案件細節與案件標頭。"],
  ["Integration with feedback loop and target review pool.", "與回饋循環及目標審查池整合。"],
  ["Response Center Role", "應變中心定位"],
  ["This page will turn selected incidents into containment tasks, rule generation, response notes, exportable evidence, and analyst feedback actions.", "此頁會把已選事件案件轉成控制任務、規則產生、應變備註、可匯出證據與分析師回饋動作。"],
  ["Action queue with priority ordering.", "具優先排序的動作佇列。"],
  ["Firewall rule preview and export panel.", "防火牆規則預覽與匯出面板。"],
  ["Playbook guidance and artifact bundle generation.", "劇本引導與證據封包產生。"],
  ["Feedback loop into weak-supervision review and target-assisted fine-tuning queues.", "把回饋送入弱監督審查與目標輔助微調佇列。"],
  ["Insights Role", "分析洞察定位"],
  ["This page will hold advanced diagnostics only. It keeps research detail away from the main dashboard while still exposing confidence, drift, comparative performance, and adaptation evidence.", "此頁只承載進階診斷。它把研究細節留在這裡，同時仍呈現信心值、漂移、比較表現與自適應證據。"],
  ["Confidence breakdown and data health summaries.", "信心值拆解與資料健康摘要。"],
  ["Adaptation gain drill-down with stage comparison.", "含階段比較的自適應增益深查。"],
  ["Drift diagnostics and reliability warnings.", "漂移診斷與可靠度警示。"],
  ["Autoencoder-enhanced performance context for research users.", "提供研究使用者的自編碼器強化效能情境。"],
  ["Reports Role", "報表定位"],
  ["This page will produce operator-facing and research-facing outputs, including incident summaries, exported evidence, firewall rule sets, and model comparison reports.", "此頁將產出面向操作員與研究人員的輸出，包括事件案件摘要、匯出證據、防火牆規則集與模型比較報告。"],
  ["Artifact bundle history table.", "證據封包歷史表。"],
  ["TXT / PDF incident report export panel.", "TXT／PDF 事件案件報告匯出面板。"],
  ["Firewall rule export templates.", "防火牆規則匯出範本。"],
  ["Research report output for thesis-linked diagnostics.", "供論文診斷使用的研究報表輸出。"],
  ["Settings Role", "設定定位"],
  ["This page will monitor users, collectors, active detection strategy, and operational controls without exposing deep research detail to everyday users.", "此頁將監看使用者、收集器、啟用中的偵測策略與操作控制，同時不向一般使用者暴露過深的研究細節。"],
  ["User roles and access scope.", "使用者角色與存取範圍。"],
  ["Collector health and ingestion status.", "收集器健康度與匯入狀態。"],
  ["Detection strategy registry and runtime health.", "偵測策略登錄與執行健康度。"],
  ["Operational refresh actions and thresholds.", "操作性重新整理動作與門檻。"],
]);
const UI_TRANSLATION_PATTERNS = [
  [/^(\d+)\s+live path(?:s)?$/u, (_, count) => `${count} live path${Number(count) === 1 ? "" : "s"}`],
  [/^(\d+)\s+Active$/u, (_, count) => `${count} active`],
  [/^(\d+)\s+min remaining$/u, (_, count) => `${count} min remaining`],
  [/^Detection strategy updated to (.+)\.$/u, (_, value) => `Detection strategy updated to ${translateUiString(value)}.`],
  [/^Replay upload selected: (.+)\.$/u, (_, name) => `Replay upload selected: ${name}.`],
  [/^Replay selection cleared\. Live capture mode restored\.$/u, () => "Replay selection cleared. Live capture mode restored."],
  [/^Suricata sensor refresh failed: (.+)\.$/u, (_, error) => `Suricata sensor refresh failed: ${error}.`],
  [/^Suricata sensor status refreshed: (.+)\.$/u, (_, status) => `Suricata sensor status refreshed: ${translateUiString(status)}.`],
  [/^Suricata live sensor start failed: (.+)\.$/u, (_, error) => `Suricata live sensor start failed: ${error}.`],
  [/^Suricata live sensor stop failed: (.+)\.$/u, (_, error) => `Suricata live sensor stop failed: ${error}.`],
  [/^Inference completed under (.+) strategy\.$/u, (_, strategy) => `Inference completed under ${translateUiString(strategy)} strategy.`],
  [/^Events created: (\d+)\.$/u, (_, count) => `Events created: ${count}.`],
  [/^CSV uploaded: (\d+) rows ingested\.$/u, (_, count) => `CSV uploaded: ${count} rows ingested.`],
  [/^NetFlow rows ingested: (\d+)\.$/u, (_, count) => `NetFlow rows ingested: ${count}.`],
  [/^Packet capture produced (\d+) events\.$/u, (_, count) => `Packet capture produced ${count} events.`],
  [/^Materialized attack events: (\d+)\.$/u, (_, count) => `Materialized attack events: ${count}.`],
  [/^Packet capture observed (\d+) flows\.$/u, (_, count) => `Packet capture observed ${count} flows.`],
  [/^Collector (.+) started\.$/u, (_, id) => `Collector ${id} started.`],
  [/^Collector (.+) stopped\.$/u, (_, id) => `Collector ${id} stopped.`],
  [/^Collector (.+) completed a polling cycle\.$/u, (_, id) => `Collector ${id} completed a polling cycle.`],
  [/^Collector (.+) auto-started by backend startup\.$/u, (_, id) => `Collector ${id} auto-started by backend startup.`],
  [/^Collector (.+) processed (\d+) observations and materialized (\d+) events\.$/u, (_, id, obs, events) => `Collector ${id} processed ${obs} observations and materialized ${events} events.`],
  [/^Collector (.+) failed: (.+)$/u, (_, id, error) => `Collector ${id} failed: ${error}`],
  [/^Suricata sensor started from the product control plane\.$/u, () => "Suricata sensor started from the product control plane."],
  [/^Sensor status refreshed: (.+)\.$/u, (_, status) => `Sensor status refreshed: ${translateUiString(status)}.`],
  [/^Sensor refresh failed: (.+)\.$/u, (_, error) => `Sensor refresh failed: ${error}.`],
  [/^Sensor started on (.+)\.$/u, (_, target) => `Sensor started on ${target}.`],
  [/^Sensor stop failed: (.+)\.$/u, (_, error) => `Sensor stop failed: ${error}.`],
  [/^Sensor stopped from Settings control plane\.$/u, () => "Sensor stopped from Settings control plane."],
  [/^Assignee updated to (.+)\.$/u, (_, assignee) => `Assignee updated to ${assignee}.`],
  [/^Incident status changed to (.+)\.$/u, (_, status) => `Incident status changed to ${translateUiString(status)}.`],
  [/^Analyst feedback submitted as (.+)\.$/u, (_, label) => `Analyst feedback submitted as ${translateUiString(label)}.`],
  [/^Feedback stored: (.+)\.$/u, (_, id) => `Feedback stored: ${id}.`],
  [/^Export action triggered: (.+)\.$/u, (_, action) => `Export action triggered: ${translateUiString(action)}.`],
  [/^Artifact bundle created: (.+)\.$/u, (_, name) => `Artifact bundle created: ${name}.`],
  [/^Playbook export preview loaded \((\d+) lines\)\.$/u, (_, count) => `Playbook export preview loaded (${count} lines).`],
  [/^Recommended action selected: (.+)\.$/u, (_, action) => `Recommended action selected: ${translateUiString(action)}.`],
  [/^Candidate export created: (.+)\.$/u, (_, name) => `Candidate export created: ${name}.`],
  [/^Candidate export failed or returned no artifact\.$/u, () => "Candidate export failed or returned no artifact."],
  [/^Fine-tuning job queued: (.+)\.$/u, (_, id) => `Fine-tuning job queued: ${id}.`],
  [/^Fine-tuning job trigger failed\. Check pending candidates in this queue\.$/u, () => "Fine-tuning job trigger failed. Check pending candidates in this queue."],
  [/^Model registry updated: (.+) activated\.$/u, (_, version) => `Model registry updated: ${version} activated.`],
  [/^Model registration skipped: no fine-tuning job available\.$/u, () => "Model registration skipped: no fine-tuning job available."],
  [/^Model registration failed\.$/u, () => "Model registration failed."],
  [/^Model registry active entry: (.+) \((.+)\)\.$/u, (_, version, stage) => `Model registry active entry: ${version} (${stage}).`],
  [/^Model registry fallback data in use\.$/u, () => "Model registry fallback data in use."],
  [/^Latest fine-tuning job: (.+) -> (.+)\.$/u, (_, jobId, status) => `Latest fine-tuning job: ${jobId} -> ${translateUiString(status)}.`],
  [/^No fine-tuning job has been triggered yet\.$/u, () => "No fine-tuning job has been triggered yet."],
  [/^Suricata sensor active on (.+)\.$/u, (_, target) => `Suricata sensor active on ${target}.`],
  [/^GeoIP runtime online via (.+); (\d+)\/(\d+) current map node\(s\) resolved\.$/u, (_, provider, resolved, total) => `GeoIP runtime online via ${provider}; ${resolved}/${total} current map nodes resolved.`],
  [/^GeoIP runtime is in protected-site fallback mode; public source nodes without coordinates will remain hidden on the map\.$/u, () => "GeoIP runtime is in protected-site fallback mode; public source nodes without coordinates will remain hidden on the map."],
];

const ENGLISH_TEXT_REPLACEMENTS = [
  ["前往案件", "Open incident"],
  ["快速應變", "Quick response"],
  ["目前還沒有任何即時事件寫入平台。", "No real-time events have been written to the platform yet."],
  ["等待分析師回饋與微調候選資料。", "Waiting for analyst feedback and fine-tuning candidates."],
  ["待人工確認", "Needs review"],
  ["端點 Agent 流量", "Endpoint agent traffic"],
  ["待複核流量", "Review traffic"],
  ["尚無", "No"],
  ["未知", "Unknown"],
  ["目前", "Current"],
  ["攻擊", "attack"],
  ["事件", "event"],
  ["案件", "incident"],
  ["流量", "traffic"],
  ["資料", "data"],
  ["偵測", "detection"],
  ["感測器", "sensor"],
  ["應變", "response"],
  ["模型", "model"],
  ["風險", "risk"],
  ["信心值", "confidence"],
  ["嚴重", "critical"],
  ["高風險", "high-risk"],
  ["分析師", "analyst"],
  ["誤報", "false positive"],
  ["漂移", "drift"],
  ["佇列", "queue"],
  ["回饋", "feedback"],
  ["證據", "evidence"],
  ["來源", "source"],
  ["目標", "target"],
  ["時間", "time"],
  ["分鐘", "minutes"],
  ["小時", "hours"],
  ["筆", "records"],
  ["件", "items"],
  ["已", ""],
  ["未", "not"],
  ["正常", "normal"],
  ["可用", "available"],
  ["不可用", "unavailable"],
  ["後端", "backend"],
  ["啟動", "start"],
  ["停止", "stop"],
  ["重新整理", "refresh"],
  ["建立", "create"],
  ["匯出", "export"],
  ["下載", "download"],
  ["複製", "copy"],
  ["設定", "settings"],
  ["管理", "admin"],
  ["權限", "permission"],
  ["等待", "waiting"],
  ["確認", "confirmed"],
  ["複核", "review"],
  ["審查", "review"],
  ["地圖", "map"],
  ["地理", "geo"],
  ["真實", "real"],
  ["受保護", "protected"],
  ["外部", "external"],
  ["內部", "internal"],
  ["區域", "region"],
  ["全球", "global"],
].sort((left, right) => right[0].length - left[0].length);
let localizationObserver = null;
let localizationQueued = false;

function runWhenIdle(callback, timeout = 500) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout });
    return;
  }
  window.setTimeout(callback, Math.min(timeout, 250));
}

function normalizeEnglishDisplayText(value) {
  let text = String(value || "");
  ENGLISH_TEXT_REPLACEMENTS.forEach(([source, replacement]) => {
    if (text.includes(source)) text = text.split(source).join(replacement);
  });
  text = text
    .replace(/（/g, " (")
    .replace(/）/g, ")")
    .replace(/，/g, ", ")
    .replace(/。/g, ".")
    .replace(/：/g, ": ")
    .replace(/；/g, "; ")
    .replace(/／/g, "/")
    .replace(/->/g, "->");
  if (/[\u3400-\u9fff]/u.test(text)) {
    text = text.replace(/[\u3400-\u9fff]+/gu, "").replace(/\s{2,}/g, " ");
  }
  return text.replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim() || value;
}

function translateUiString(value) {
  if (!value) return value;
  let translated = UI_TRANSLATIONS.has(value) ? UI_TRANSLATIONS.get(value) : value;
  for (const [pattern, replacer] of UI_TRANSLATION_PATTERNS) {
    if (pattern.test(translated)) {
      translated = translated.replace(pattern, replacer);
      break;
    }
  }
  return normalizeEnglishDisplayText(translated);
}

function preserveWhitespaceTranslation(original) {
  if (!original || !original.trim()) return original;
  const match = original.match(/^(\s*)(.*?)(\s*)$/su);
  if (!match) return original;
  const [, leading, core, trailing] = match;
  const translated = translateUiString(core);
  if (translated === core) return original;
  return `${leading}${translated}${trailing}`;
}

function localizeAttributes(root) {
  if (!(root instanceof Element || root instanceof Document)) return;
  const targets = [];
  if (root instanceof Element && root.matches("[placeholder],[title],[aria-label]")) {
    targets.push(root);
  }
  targets.push(...root.querySelectorAll("[placeholder],[title],[aria-label]"));
  targets.forEach((element) => {
    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;
      const translated = translateUiString(value);
      if (translated !== value) {
        element.setAttribute(attr, translated);
      }
    });
  });
}

function localizeTextNodes(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TITLE"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".text-code, script, style, svg")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const translated = preserveWhitespaceTranslation(node.textContent || "");
    if (translated !== node.textContent) {
      node.textContent = translated;
    }
  });
}

function applyLocalization(root = document.body) {
  document.documentElement.lang = "en";
  document.title = translateUiString(document.title);
  localizeTextNodes(root);
  localizeAttributes(root instanceof Document ? root.documentElement : root);
}

function scheduleLocalizationPass() {
  if (localizationQueued) return;
  localizationQueued = true;
  runWhenIdle(() => {
    localizationQueued = false;
    applyLocalization(document.body);
  }, 300);
}

function startLocalization() {
  if (localizationObserver) return;
  applyLocalization(document.body);
  localizationObserver = new MutationObserver(() => {
    scheduleLocalizationPass();
  });
  localizationObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });
}
const realtimeState = {
  lastSeq: 0,
  timer: null,
  inFlight: false,
  websocket: null,
  websocketRetryTimer: null,
  websocketActive: false,
};
const autoDetectionState = {
  bootstrapped: false,
  inFlight: false,
  retryTimer: null,
  integrations: null,
};

function clearAuthState() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(USERNAME_KEY);
  } catch (_error) {
    // Ignore storage failures during logout.
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
  } catch (_error) {
    // Ignore legacy storage cleanup failures.
  }
}

function setAuthState({ token = "", role = "user", username = "user" } = {}) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token || "");
    sessionStorage.setItem(ROLE_KEY, role || "user");
    sessionStorage.setItem(USERNAME_KEY, username || "user");
  } catch (_error) {
    // Ignore storage failures; runtime will behave as unauthenticated.
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
  } catch (_error) {
    // Ignore legacy cleanup failures.
  }
}

function stopRealtimeActivity() {
  if (realtimeState.timer) {
    clearInterval(realtimeState.timer);
    realtimeState.timer = null;
  }
  if (realtimeState.websocketRetryTimer) {
    clearTimeout(realtimeState.websocketRetryTimer);
    realtimeState.websocketRetryTimer = null;
  }
  if (realtimeState.websocket) {
    try {
      realtimeState.websocket.close();
    } catch (_error) {
      // ignore close errors during logout
    }
    realtimeState.websocket = null;
  }
  realtimeState.websocketActive = false;
  realtimeState.inFlight = false;
}

function logout() {
  stopRealtimeActivity();
  clearAuthState();
  window.location.href = "index.html";
}

function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch (_error) {
    return "";
  }
}

function getRole() {
  try {
    return sessionStorage.getItem(ROLE_KEY) || "操作員";
  } catch (_error) {
    return "操作員";
  }
}

function currentUserIsAdmin() {
  return String(getRole() || "").trim().toLowerCase() === "admin";
}

function getUsername() {
  try {
    return sessionStorage.getItem(USERNAME_KEY) || "訪客";
  } catch (_error) {
    return "訪客";
  }
}

function isLoginPage() {
  return (document.body?.dataset?.page || "login") === "login";
}

function isAuthenticated() {
  return Boolean(getToken());
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiRequest(path, options = {}, expect = "json") {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: authHeaders(options.headers || {}),
    });
  } catch (_error) {
    lastApiErrorMessage = `無法連線到後端 API：${API_BASE}`;
    throw new Error(lastApiErrorMessage);
  }
  const payload = expect === "text" ? await response.text() : await response.json().catch(() => null);
  if (!response.ok) {
    lastApiErrorMessage = String(payload?.detail || payload || `${response.status} ${response.statusText}`);
    if (response.status === 401 && !isLoginPage()) {
      logout();
    }
    throw new Error(lastApiErrorMessage);
  }
  lastApiErrorMessage = "";
  return payload;
}

function unwrapApiData(payload) {
  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

function parseApiPath(path) {
  try {
    return new URL(path, "http://transferids.local");
  } catch (_error) {
    return new URL("/", "http://transferids.local");
  }
}

function web3RiskScore(item = {}) {
  const explicit = Number(item.risk_score);
  if (Number.isFinite(explicit)) return explicit;
  const confidence = Number(item.confidence);
  if (Number.isFinite(confidence)) return Math.round(confidence * 100);
  return 0;
}

function web3PriorityLevel(item = {}) {
  const severity = String(item.severity || "").toLowerCase();
  if (severity === "critical") return "P1";
  if (severity === "high") return "P2";
  if (severity === "medium") return "P3";
  return "P4";
}

function web3AttackLabel(item = {}) {
  return item.attack_family || item.predicted_label || item.verdict || "Detection Event";
}

function web3IncidentIdForEvent(item = {}) {
  const eventId = item.id || item.event_id || "";
  return item.incident_id || (eventId ? `inc_${String(eventId).replace(/^evt_/, "")}` : "--");
}

function web3EventToNdrEvent(item = {}) {
  const eventId = item.event_id || item.id || "--";
  return {
    ...item,
    event_id: eventId,
    incident_id: item.incident_id || web3IncidentIdForEvent(item),
    source_ip: item.source_ip || "--",
    destination_ip: item.destination_ip || "--",
    predicted_label: web3AttackLabel(item),
    confidence_score: Number(item.confidence || 0),
    risk_score: web3RiskScore(item),
    severity: item.severity || "low",
    ingestion_source_type: item.source || "uploaded_file",
    verification: {
      verdict_tier: item.verdict === "attack" ? "confirmed_attack" : "benign_or_low_risk",
      decision_summary: item.verdict === "attack" ? "Model inference classified this uploaded record as attack." : "Model inference did not classify this uploaded record as attack.",
      analyst_label_suggestion: item.verdict === "attack" ? "attack" : "benign",
      analyst_guidance: item.verdict === "attack" ? "Review event context before response." : "No incident is opened unless attack evidence is present.",
      followup_checks: [],
    },
    experiment_context: {
      model_stage: item.model_name || "transferids_c3",
      model_stage_label: item.model_version || item.model_name || "TransferIDS C3",
    },
  };
}

function web3IncidentToNdrIncident(item = {}, relatedEvent = null) {
  const event = relatedEvent || {};
  const incidentId = item.incident_id || web3IncidentIdForEvent(event);
  const riskScore = web3RiskScore(item.risk_score != null ? item : event);
  const createdAt = item.created_at || event.timestamp || new Date(0).toISOString();
  return {
    ...item,
    incident_id: incidentId,
    event_id: item.event_id || event.event_id || event.id || "--",
    title: item.title || `Investigation from ${event.event_id || event.id || "uploaded event"}`,
    predicted_label: item.predicted_label || web3AttackLabel(event) || web3AttackLabel(item),
    severity: item.severity || event.severity || "low",
    risk_score: riskScore,
    confidence: Number(item.confidence ?? event.confidence ?? 0),
    event_count: Number(item.event_count || 1),
    source_ip: item.source_ip || event.source_ip || "--",
    destination_ip: item.destination_ip || event.destination_ip || "--",
    status: item.status || "New",
    priority_level: item.priority_level || web3PriorityLevel(item.severity ? item : event),
    sla_status: item.sla_status || "healthy",
    assignee_username: item.assignee_username || "Unassigned",
    first_seen_at: item.first_seen_at || createdAt,
    last_seen_at: item.last_seen_at || item.updated_at || createdAt,
    updated_at: item.updated_at || item.created_at || createdAt,
  };
}

function eventsFromWeb3Payload(payload) {
  const data = unwrapApiData(payload) || {};
  return data.events || payload?.events || [];
}

function incidentsFromWeb3Payload(payload) {
  const data = unwrapApiData(payload) || {};
  return data.incidents || payload?.incidents || [];
}

async function loadWeb3Events(limit = 100) {
  const payload = await apiRequest(`/events?limit=${encodeURIComponent(limit)}`);
  return eventsFromWeb3Payload(payload).map(web3EventToNdrEvent);
}

async function loadWeb3Incidents() {
  const payload = await apiRequest("/incidents");
  return incidentsFromWeb3Payload(payload).map((incident) => web3IncidentToNdrIncident(incident));
}

async function loadWeb3DashboardCompat(search = "") {
  const params = new URLSearchParams(search || "");
  const windowMinutes = Number(params.get("window_minutes") || dashboardState?.windowMinutes || 15);
  const [summaryPayload, events, incidents] = await Promise.all([
    apiRequest("/dashboard/summary"),
    loadWeb3Events(50),
    loadWeb3Incidents(),
  ]);
  const summary = unwrapApiData(summaryPayload) || {};
  const activeIncidents = incidents.filter((item) => !["Resolved", "False Positive"].includes(String(item.status || "")));
  const p1 = activeIncidents.filter((item) => item.priority_level === "P1").length;
  const p2 = activeIncidents.filter((item) => item.priority_level === "P2").length;
  const p3 = activeIncidents.filter((item) => item.priority_level === "P3").length;
  const eventCount = Number(summary.event_count || events.length || 0);
  const confirmedAttacks = Number(summary.confirmed_attacks || events.filter((item) => item.verdict === "attack").length || 0);
  return {
    overview: {
      observation_window_minutes: windowMinutes,
      recent_observations: eventCount,
      recent_materialized_events: eventCount,
      recent_confirmed_attack_events: confirmedAttacks,
      recent_probable_attack_events: 0,
      recent_eventization_rate: eventCount ? confirmedAttacks / eventCount : 0,
      high_severity_alerts: Number(summary.high_severity_events || 0),
      active_incidents: activeIncidents.length,
      open_alerts: Number(summary.high_severity_events || 0),
      active_p1_incidents: p1,
      active_p2_incidents: p2,
      active_p3_incidents: p3,
    },
    priority_incidents: incidents,
    recent_events: events.slice(0, 10),
    recent_alerts: (summary.recent_alerts || []).map(web3EventToNdrEvent),
    trend: { labels: [], critical: [], high: [], medium: [], driftAffected: [] },
    empty: Boolean(summary.empty || eventCount === 0),
  };
}

async function loadWeb3RuntimeCompat() {
  const payload = await apiRequest("/detection/model/status");
  const status = unwrapApiData(payload) || {};
  const metadata = status.metadata || {};
  return {
    connected: Boolean(status.available),
    runtime_mode: status.available ? (metadata.model_name || "TransferIDS production ONNX") : "Model unavailable",
    model_stage: metadata.model_stage || metadata.stage || "C3",
    model_stage_label: metadata.model_version || metadata.model_name || "TransferIDS C3",
    transfer_direction: metadata.transfer_direction || "Canonical 13-feature input",
    task_type: metadata.task_type || "binary",
    feature_schema_version: status.feature_order_available ? "feature_order.json" : "missing feature_order.json",
    canonical_feature_space: Array.isArray(status.feature_order) ? `${status.feature_order.length} canonical features` : "unknown",
    ae_enabled: Boolean(metadata.ae_enabled),
    threshold: status.threshold,
  };
}

async function uploadWeb3DetectionFile(options = {}) {
  const sourceType = options?.body?.get ? options.body.get("source_type") : "canonical_upload";
  const payload = await apiRequest("/intake/upload", options);
  const events = (payload?.events || unwrapApiData(payload)?.events || []).map(web3EventToNdrEvent);
  return {
    count: Number(payload?.events_created || events.length || 0),
    observation_count: Number(payload?.records_processed || events.length || 0),
    source_type: sourceType || "canonical_upload",
    items: events,
  };
}

async function loadWeb3IncidentDetailCompat(incidentId) {
  const incidentPayload = await apiRequest(`/incidents/${encodeURIComponent(incidentId)}`);
  const incident = unwrapApiData(incidentPayload)?.incident || incidentPayload?.incident;
  const timelinePayload = await apiRequest(`/incidents/${encodeURIComponent(incidentId)}/timeline`).catch(() => null);
  const timeline = unwrapApiData(timelinePayload)?.timeline || timelinePayload?.timeline || [];
  let relatedEvent = null;
  if (incident?.event_id) {
    const eventPayload = await apiRequest(`/events/${encodeURIComponent(incident.event_id)}`).catch(() => null);
    relatedEvent = unwrapApiData(eventPayload)?.event || eventPayload?.event || null;
  }
  const ndrIncident = web3IncidentToNdrIncident(incident || {}, relatedEvent ? web3EventToNdrEvent(relatedEvent) : null);
  const ndrEvents = relatedEvent ? [web3EventToNdrEvent(relatedEvent)] : [];
  return {
    incident: ndrIncident,
    events: ndrEvents,
    timeline: timeline.map((item) => ({
      timestamp: item.timestamp,
      event_id: ndrIncident.event_id,
      attack_stage: item.type || item.title,
      predicted_label: item.details?.verdict || ndrIncident.predicted_label,
      risk_score: ndrIncident.risk_score,
      summary: item.title || "Incident timeline event",
    })),
    sla: { status: "healthy", remaining_minutes: 0 },
    playbook: { actions: ["Review uploaded evidence", "Validate source and destination context"], firewall_rule: "" },
    response_actions: [],
    feedback: [],
    exports: [],
  };
}

async function tryMappedWeb3Api(path, options = {}, expect = "json") {
  if (expect !== "json") return { mapped: false, data: null };
  const method = String(options.method || "GET").toUpperCase();
  const parsed = parseApiPath(path);
  const pathname = parsed.pathname;

  if (pathname === "/ndr/dashboard" && method === "GET") {
    return { mapped: true, data: await loadWeb3DashboardCompat(parsed.search) };
  }
  if (pathname === "/ndr/runtime-status" && method === "GET") {
    return { mapped: true, data: await loadWeb3RuntimeCompat() };
  }
  if (pathname === "/ndr/events" && method === "GET") {
    const limit = Number(parsed.searchParams.get("limit") || 100);
    return { mapped: true, data: { items: await loadWeb3Events(limit) } };
  }
  if (pathname === "/ndr/incidents" && method === "GET") {
    return { mapped: true, data: { items: await loadWeb3Incidents() } };
  }
  if (pathname.startsWith("/ndr/incidents/") && method === "GET") {
    const incidentId = decodeURIComponent(pathname.replace("/ndr/incidents/", "").split("/")[0]);
    return { mapped: true, data: await loadWeb3IncidentDetailCompat(incidentId) };
  }
  if (pathname === "/ndr/events/upload-csv" && method === "POST") {
    return { mapped: true, data: await uploadWeb3DetectionFile(options) };
  }
  if (pathname === "/metrics/summary" && method === "GET") {
    const dashboard = await loadWeb3DashboardCompat("");
    const integrityPayload = await apiRequest("/metrics/detection-integrity").catch(() => null);
    const integrity = unwrapApiData(integrityPayload) || {};
    const materialized = Number(dashboard.overview.recent_materialized_events || 0);
    const confirmed = Number(dashboard.overview.recent_confirmed_attack_events || 0);
    return {
      mapped: true,
      data: {
        today: {
          raw_observation_count: materialized,
          materialized_event_count: materialized,
          confirmed_attack_count: confirmed,
          false_positive_count: 0,
          alert_count: Number(dashboard.overview.high_severity_alerts || 0),
          incident_count: Number(dashboard.overview.active_incidents || 0),
          analyst_confirmed_false_positive_rate: 0,
          materialization_rate: materialized ? 1 : 0,
        },
        all_time: {
          raw_observation_count: materialized,
          materialized_event_count: materialized,
          confirmed_attack_count: confirmed,
          false_positive_count: 0,
          alert_count: Number(dashboard.overview.high_severity_alerts || 0),
          incident_count: Number(dashboard.overview.active_incidents || 0),
          analyst_confirmed_false_positive_rate: 0,
          materialization_rate: materialized ? 1 : 0,
        },
        trend: [],
        detection_integrity: integrity,
        metadata: { source: "web3-dashboard-summary" },
      },
    };
  }
  if (pathname === "/admin/users" && method === "GET") {
    return { mapped: true, data: { items: [{ username: getUsername(), role: getRole(), is_active: true }] } };
  }
  if (pathname === "/ndr/agents" && method === "GET") {
    const payload = await apiRequest("/agents").catch(() => null);
    const data = unwrapApiData(payload) || {};
    const agents = data.agents || data.items || [];
    return { mapped: true, data: { items: agents, agents, count: agents.length } };
  }
  if (pathname === "/ndr/agents/summary" && method === "GET") {
    const payload = await apiRequest("/agents/summary").catch(() => null);
    return { mapped: true, data: unwrapApiData(payload) || {} };
  }
  if (pathname === "/platform/integrations" && method === "GET") {
    const status = await apiRequest("/integrations/status").catch(() => null);
    return { mapped: true, data: unwrapApiData(status) || {} };
  }
  return { mapped: false, data: null };
}

async function syncAuthenticatedUser() {
  if (!isAuthenticated()) return false;
  try {
    const payload = await apiRequest("/auth/me");
    setAuthState({
      token: getToken(),
      role: payload?.role || "user",
      username: payload?.username || getUsername() || "user",
    });
    return true;
  } catch (_error) {
    if (!isLoginPage()) logout();
    return false;
  }
}

function isProtectedPage() {
  return !isLoginPage();
}

function formatRealtimeFeedMessage(item) {
  const time = formatClockTime(item?.timestamp);
  const level = String(item?.level || "info").toUpperCase();
  const message = translateUiString(String(item?.message || "").trim());
  return `[${level}] ${time} ${message}`;
}

function buildWebSocketUrl() {
  const base = new URL(API_BASE);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${base.host}/ws/events?token=${encodeURIComponent(getToken())}&after_seq=${realtimeState.lastSeq}`;
}

function hydrateUserPills() {
  document.querySelectorAll(".user-pill strong").forEach((node) => {
    node.textContent = getUsername();
  });
  document.querySelectorAll(".user-pill span").forEach((node) => {
    node.textContent = getRole();
  });
}

function ensureLogoutControls() {
  if (isLoginPage()) return;
  document.querySelectorAll(".topbar-right").forEach((container) => {
    if (container.querySelector("[data-action='logout']")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "logout-button";
    button.dataset.action = "logout";
    button.textContent = "登出";
    button.addEventListener("click", logout);
    container.appendChild(button);
  });
}

function requireAuth() {
  if (!isLoginPage() && !isAuthenticated()) {
    window.location.href = "index.html";
  }
}

function applyRoleBasedUiAccess() {
  const isAdmin = currentUserIsAdmin();
  document.querySelectorAll("[data-admin-only='true']").forEach((node) => {
    node.hidden = !isAdmin;
  });

  const page = document.body?.dataset?.page || "";
  const subtitle = document.getElementById("pageSubtitle");

  if (!isAdmin && page === "settings" && subtitle) {
    subtitle.textContent = "此頁只保留一般工作流程與平台狀態摘要。";
  }
  if (!isAdmin && page === "intake" && subtitle) {
    subtitle.textContent = "可直接上傳資料進行分析。";
  }
}

function formatClockTime(iso) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const scaled = bytes / (1024 ** power);
  return `${scaled >= 100 || power === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[power]}`;
}

function normalizeSuricataSensorStatus(payload = {}) {
  const eve = payload?.eve || {};
  const autoStart = payload?.auto_start || {};
  sensorRuntimeData.available = Boolean(payload?.available);
  sensorRuntimeData.controlAvailable = Boolean(payload?.control_available);
  sensorRuntimeData.running = Boolean(payload?.running);
  sensorRuntimeData.processId = payload?.process_id || null;
  sensorRuntimeData.mode = String(payload?.mode || "idle");
  sensorRuntimeData.message = String(payload?.message || "");
  sensorRuntimeData.interfaceName = String(payload?.interface_name || "");
  sensorRuntimeData.interfaceDescription = String(payload?.interface_description || "");
  sensorRuntimeData.interfaceIp = String(payload?.interface_ip || "");
  sensorRuntimeData.replayFile = String(payload?.replay_file || "");
  sensorRuntimeData.configPath = String(payload?.config_path || "");
  sensorRuntimeData.logDir = String(payload?.log_dir || "");
  sensorRuntimeData.eveFile = String(payload?.eve_file || eve?.path || "");
  sensorRuntimeData.eveExists = Boolean(eve?.exists);
  sensorRuntimeData.eveSizeBytes = Number(eve?.size_bytes || 0);
  sensorRuntimeData.eveLastWriteTime = String(eve?.last_write_time || "");
  sensorRuntimeData.recommendedInterfaceName = String(payload?.recommended_interface_name || "");
  sensorRuntimeData.recommendedInterfaceIp = String(payload?.recommended_interface_ip || "");
  sensorRuntimeData.interfaces = Array.isArray(payload?.interfaces) ? payload.interfaces : [];
  sensorRuntimeData.autoStartEnabled = Boolean(autoStart?.enabled);
  sensorRuntimeData.autoStartInterfaceName = String(autoStart?.interface_name || "");
  sensorRuntimeData.autoStartInterfaceIp = String(autoStart?.interface_ip || "");
  sensorRuntimeData.autoStartReplayFile = String(autoStart?.replay_file || "");
  sensorRuntimeData.replayLibrary = Array.isArray(payload?.replay_library) ? payload.replay_library : [];
  sensorRuntimeData.error = String(payload?.runtime_error || payload?.status_error || "");
}

function getSensorRuntimeTone() {
  if (!sensorRuntimeData.available || sensorRuntimeData.error) return "critical";
  if (sensorRuntimeData.running) return "good";
  return "warn";
}

function getSensorRuntimeLabel() {
  if (!sensorRuntimeData.available) return "Live control unavailable";
  if (sensorRuntimeData.running) {
    if (sensorRuntimeData.mode === "pcap_replay") return "Replay running";
    return "Live sensor running";
  }
  return sensorRuntimeData.controlAvailable ? "Sensor idle" : "Control unavailable";
}

function syncIntakeAutomationState() {
  intakeState.autoDetectionActive = Boolean(
    sensorRuntimeData.running ||
    autoDetectionState.integrations?.suricata?.auto_start?.enabled ||
    autoDetectionState.integrations?.netflow?.auto_start?.enabled,
  );
}

function renderSuricataInterfaceSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const previousValue = select.value;
  const options = ['<option value="">Auto-select recommended live adapter</option>'];
  if (!sensorRuntimeData.controlAvailable) {
    select.innerHTML = '<option value="" disabled selected>Live sensor control unavailable in this build</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  sensorRuntimeData.interfaces.forEach((item) => {
    const labelParts = [item.name || item.interface_alias || "Unknown adapter"];
    if (item.ipv4_address) labelParts.push(item.ipv4_address);
    if (item.recommended) labelParts.push("Recommended");
    options.push(`<option value="${item.name || ""}">${labelParts.join(" · ")}</option>`);
  });

  if (!sensorRuntimeData.interfaces.length) {
    options.push('<option value="" disabled>No active IPv4 adapter detected</option>');
  }

  select.innerHTML = options.join("");
  const preferredValue =
    previousValue ||
    sensorRuntimeData.interfaceName ||
    sensorRuntimeData.autoStartInterfaceName ||
    sensorRuntimeData.recommendedInterfaceName ||
    "";
  select.value = Array.from(select.options).some((option) => option.value === preferredValue) ? preferredValue : "";
}

function renderSuricataInterfaceCards(targetId) {
  const root = document.getElementById(targetId);
  if (!root) return;

  if (!sensorRuntimeData.interfaces.length) {
    if (!sensorRuntimeData.controlAvailable) {
      root.innerHTML = `
        <article class="mapping-card">
          <span>Control Plane</span>
          <strong>Unavailable in This Build</strong>
          <div class="mapping-divider"></div>
          <p>Live Suricata process control is not connected. Use Data Intake Suricata EVE upload or distributed agent observations.</p>
        </article>
      `;
      return;
    }
    root.innerHTML = `
      <article class="mapping-card">
        <span>Live Adapter Discovery</span>
        <strong>No Active Adapter</strong>
        <div class="mapping-divider"></div>
        <p>The platform could not detect an active IPv4 network adapter. Start replay mode or verify Windows adapter state.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = sensorRuntimeData.interfaces
    .slice(0, 4)
    .map(
      (item) => `
        <article class="mapping-card">
          <span>${item.recommended ? "Recommended Adapter" : "Available Adapter"}</span>
          <strong>${item.name || item.interface_alias || "Unnamed Adapter"}</strong>
          <div class="mapping-divider"></div>
          <p>${item.interface_description || "No adapter description available."}</p>
          <p>${item.ipv4_address || "--"}${item.has_gateway ? " / default gateway" : ""}${item.is_virtual ? " / virtual" : ""}</p>
        </article>
      `,
    )
    .join("");
}

function renderReplayLibrary(targetId) {
  const root = document.getElementById(targetId);
  if (!root) return;

  if (!sensorRuntimeData.replayLibrary.length) {
    root.innerHTML = `
      <article class="replay-card replay-card--empty">
        <span>Replay Library</span>
        <strong>No stored replay yet</strong>
        <p>Upload a PCAP or PCAPNG file above and the platform will keep it here for reuse.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = sensorRuntimeData.replayLibrary
    .map(
      (item) => `
        <button
          class="replay-card ${intakeState.selectedReplayPath === item.file_path ? "selected" : ""}"
          type="button"
          data-replay-path="${item.file_path}"
          data-replay-name="${item.display_name || item.file_name}"
        >
          <span>Replay Dataset</span>
          <strong>${item.display_name || item.file_name}</strong>
          <p>${formatBytes(item.size_bytes)} · updated ${formatDateTime(item.updated_at)}</p>
        </button>
      `,
    )
    .join("");

  root.querySelectorAll("[data-replay-path]").forEach((button) => {
    button.addEventListener("click", () => {
      intakeState.selectedReplayPath = button.dataset.replayPath || "";
      const fileInput = document.getElementById("suricataReplayFileInput");
      if (fileInput) fileInput.value = "";
      renderReplayLibrary(targetId);
      pushIntakeLog(`已選擇重播資料集：${button.dataset.replayName || "平台已存重播檔"}。`);
    });
  });
}

function renderSuricataSensorConsole() {
  const statusChip = document.getElementById("suricataSensorStatusChip");
  const runtimeGrid = document.getElementById("suricataSensorRuntimeGrid");

  if (statusChip) {
    statusChip.className = `status-chip ${getSensorRuntimeTone()}`;
    statusChip.textContent = getSensorRuntimeLabel();
  }

  if (runtimeGrid) {
    const runtimeMode =
      sensorRuntimeData.mode === "live_capture"
        ? "即時擷取"
        : sensorRuntimeData.mode === "pcap_replay"
          ? "PCAP 重播"
          : "待命";
    const boundTarget =
      sensorRuntimeData.mode === "pcap_replay"
        ? (sensorRuntimeData.replayFile || "--")
        : (sensorRuntimeData.interfaceName || sensorRuntimeData.recommendedInterfaceName || "--");
    runtimeGrid.innerHTML = `
      <div class="detail-card"><span>感測器狀態</span><strong>${getSensorRuntimeLabel()}</strong></div>
      <div class="detail-card"><span>模式</span><strong>${runtimeMode}</strong></div>
      <div class="detail-card"><span>後端感測目標</span><strong>${boundTarget}</strong></div>
      <div class="detail-card"><span>EVE 檔案</span><strong>${sensorRuntimeData.eveExists ? "持續更新" : "找不到"}</strong></div>
      <div class="detail-card"><span>EVE 大小</span><strong>${formatBytes(sensorRuntimeData.eveSizeBytes)}</strong></div>
      <div class="detail-card"><span>最近更新</span><strong>${formatDateTime(sensorRuntimeData.eveLastWriteTime)}</strong></div>
    `;
  }

  renderSuricataInterfaceSelect("suricataInterfaceSelect");
  renderReplayLibrary("suricataReplayLibrary");
  renderSuricataInterfaceCards("suricataInterfaceCards");
}

function renderSettingsSensorPanel() {
  const statusChip = document.getElementById("settingsSensorStatusChip");
  const runtimeGrid = document.getElementById("settingsSensorRuntimeGrid");

  if (statusChip) {
    statusChip.className = `status-chip ${getSensorRuntimeTone()}`;
    statusChip.textContent = getSensorRuntimeLabel();
  }

  if (runtimeGrid) {
    runtimeGrid.innerHTML = `
      <div class="detail-card"><span>Sensor Process</span><strong>${sensorRuntimeData.running ? `PID ${sensorRuntimeData.processId || "--"}` : "Not running"}</strong></div>
      <div class="detail-card"><span>Control Plane</span><strong>${sensorRuntimeData.controlAvailable ? "Available" : "Unavailable"}</strong></div>
      <div class="detail-card"><span>Mode</span><strong>${sensorModeDisplayLabel(sensorRuntimeData.mode)}</strong></div>
      <div class="detail-card"><span>Backend Interface</span><strong>${sensorRuntimeData.interfaceName || sensorRuntimeData.recommendedInterfaceName || "--"}</strong></div>
      <div class="detail-card"><span>EVE Ingestion</span><strong>/api/intake/suricata/eve</strong></div>
      <div class="detail-card"><span>Status Message</span><strong>${escapeHtml(sensorRuntimeData.error || sensorRuntimeData.message || "--")}</strong></div>
    `;
  }

  renderSuricataInterfaceSelect("settingsSuricataInterfaceSelect");
  renderSuricataInterfaceCards("settingsSensorInterfaces");
  const startBtn = document.getElementById("settingsStartSensorBtn");
  const stopBtn = document.getElementById("settingsStopSensorBtn");
  if (startBtn) {
    startBtn.disabled = !sensorRuntimeData.controlAvailable;
    startBtn.title = sensorRuntimeData.controlAvailable ? "" : "Live sensor control is unavailable in this build.";
  }
  if (stopBtn) {
    stopBtn.disabled = !sensorRuntimeData.controlAvailable;
    stopBtn.title = sensorRuntimeData.controlAvailable ? "" : "Live sensor control is unavailable in this build.";
  }
}

async function refreshSuricataSensorStatus({ integrations = null } = {}) {
  const payload = integrations?.suricata_sensor || await tryApi("/platform/suricata-sensor/status");
  if (!payload) return null;
  normalizeSuricataSensorStatus(payload);
  syncIntakeAutomationState();
  updateIntakeSourceStatus("suricata", {
    status: sensorRuntimeData.running ? "執行中" : sensorRuntimeData.available ? "已設定" : "不可用",
    detail: sensorRuntimeData.running
      ? `後端感測 / ${sensorRuntimeData.interfaceName || sensorRuntimeData.interfaceIp || "啟用中"}`
      : sensorRuntimeData.autoStartEnabled
        ? "監看就緒 / 感測器待命"
        : "IDS 來源",
    tone: sensorRuntimeData.running ? "good" : sensorRuntimeData.available ? "warn" : "critical",
  });
  renderSuricataSensorConsole();
  renderSettingsSensorPanel();
  renderStrategySummary();
  return payload;
}

function buildSuricataSensorPayload({ interfaceSelectId, replayPath = "" }) {
  const interfaceValue = document.getElementById(interfaceSelectId)?.value?.trim() || "";
  const replayValue = replayPath.trim();
  return {
    interface_name: replayValue ? null : (interfaceValue || null),
    replay_file: replayValue || null,
    force_restart: false,
  };
}

async function uploadReplayDataset(file) {
  if (!file) return null;
  const form = new FormData();
  form.append("file", file);
  return tryApi("/platform/suricata-sensor/replays", {
    method: "POST",
    body: form,
  });
}

async function startSuricataSensorFromControls({ interfaceSelectId, replayUploadInputId, logPrefix = "" } = {}) {
  if (!sensorRuntimeData.controlAvailable) {
    lastApiErrorMessage = "Live sensor control is unavailable in this build. Use Data Intake Suricata EVE upload or distributed agent observations.";
    return null;
  }
  let replayPath = intakeState.selectedReplayPath || "";
  const replayFile = replayUploadInputId ? document.getElementById(replayUploadInputId)?.files?.[0] : null;
  if (replayFile) {
    const uploaded = await uploadReplayDataset(replayFile);
    if (!uploaded?.replay?.file_path) {
      return null;
    }
    replayPath = uploaded.replay.file_path;
    intakeState.selectedReplayPath = replayPath;
    sensorRuntimeData.replayLibrary = Array.isArray(uploaded.replay_library) ? uploaded.replay_library : sensorRuntimeData.replayLibrary;
    renderReplayLibrary("suricataReplayLibrary");
    if (logPrefix && document.body.dataset.page === "intake") {
      pushIntakeLog(`${logPrefix} replay uploaded: ${uploaded.replay.display_name || uploaded.replay.file_name}.`);
    }
  }

  const payload = buildSuricataSensorPayload({ interfaceSelectId, replayPath });
  const result = await tryApi("/platform/suricata-sensor/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result) return null;

  normalizeSuricataSensorStatus(result);
  renderSuricataSensorConsole();
    renderSettingsSensorPanel();
    syncIntakeAutomationState();
    updateIntakeSourceStatus("suricata", {
    status: "執行中",
    detail: `後端感測 / ${sensorRuntimeData.interfaceName || sensorRuntimeData.interfaceIp || "啟用中"}`,
    tone: "good",
  });
  intakeState.autoDetectionActive = true;
  renderStrategySummary();

  if (logPrefix && document.body.dataset.page === "intake") {
    pushIntakeLog(
      sensorRuntimeData.mode === "pcap_replay"
        ? `${logPrefix} 已用 ${sensorRuntimeData.replayFile || "平台重播資料集"} 啟動重播。`
        : `${logPrefix} 已在後端主機的 ${sensorRuntimeData.interfaceName || sensorRuntimeData.interfaceIp || "所選網卡"} 上開始執行。`,
      "alert",
    );
    if (result.auto_selected) {
      pushIntakeLog("平台已自動選擇推薦的 live interface。");
    }
  }
  return result;
}

async function stopSuricataSensorFromControls({ logPrefix = "" } = {}) {
  if (!sensorRuntimeData.controlAvailable) {
    lastApiErrorMessage = "Live sensor control is unavailable in this build. No sensor process was changed.";
    return null;
  }
  const result = await tryApi("/platform/suricata-sensor/stop", {
    method: "POST",
  });
  if (!result) return null;

  normalizeSuricataSensorStatus(result);
  renderSuricataSensorConsole();
  renderSettingsSensorPanel();
  syncIntakeAutomationState();
  updateIntakeSourceStatus("suricata", {
    status: "已設定",
    detail: sensorRuntimeData.autoStartEnabled ? "監看就緒 / 感測器已停止" : "感測器已停止",
    tone: sensorRuntimeData.autoStartEnabled ? "warn" : "warn",
  });
  renderStrategySummary();

  if (logPrefix && document.body.dataset.page === "intake") {
    pushIntakeLog(`${logPrefix} 已停止。EVE watcher 目前為 ${sensorRuntimeData.autoStartEnabled ? "就緒" : "手動"} 狀態。`, "warning");
  }
  return result;
}

function severityLabelFromScore(score) {
  if (score >= 90) return "嚴重";
  if (score >= 75) return "高";
  if (score >= 60) return "中";
  return "低";
}

function severityFromRiskScore(score) {
  if (score >= 90) return "critical";
  if (score >= 75) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function priorityFromRisk(score) {
  if (score >= 90) return "P1";
  if (score >= 75) return "P2";
  if (score >= 60) return "P3";
  return "P4";
}

function priorityDisplayLabel(priority) {
  return {
    P1: "緊急處理",
    P2: "優先處理",
    P3: "持續觀察",
    P4: "低度關注",
  }[priority] || priority || "--";
}

function priorityTone(priority) {
  if (priority === "P1") return "critical";
  if (priority === "P2") return "high";
  if (priority === "P3") return "medium";
  return "low";
}

function severityDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    critical: "嚴重",
    high: "高",
    medium: "中",
    low: "低",
  }[raw] || value || "--";
}

function incidentStatusDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    open: "待處理",
    new: "新進案件",
    investigating: "調查中",
    contained: "已控制",
    resolved: "已結案",
    active: "進行中",
  }[raw] || value || "--";
}

function slaDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    breached: "已超時",
    "at risk": "接近超時",
    healthy: "正常",
  }[raw] || value || "--";
}

function systemStateDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    active: "啟用中",
    enabled: "啟用中",
    running: "執行中",
    ready: "就緒",
    idle: "待命",
    queued: "排隊中",
    completed: "已完成",
    failed: "失敗",
    unavailable: "不可用",
  }[raw] || value || "--";
}

function sensorModeDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    live_capture: "Live capture",
    pcap_replay: "Replay mode",
    unavailable: "Unavailable",
    idle: "Idle",
  }[raw] || value || "--";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function copyTextToClipboard(value) {
  const text = String(value || "");
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  textarea.remove();
  return Boolean(success);
}

function attackLabelDisplay(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    "port scan": "連接埠掃描",
    "brute force": "暴力破解",
    infiltration: "入侵滲透",
    reconnaissance: "偵察探測",
    ddos: "阻斷服務流量",
    "ddos-like flood": "阻斷服務洪流",
    exploit: "疑似利用行為",
    malicious: "未歸類攻擊",
    benign: "正常流量",
    incident: "安全事件",
  }[raw] || value || "未分類";
}

function isGenericAttackBucket(value) {
  const raw = String(value || "").trim().toLowerCase();
  return new Set([
    "",
    "malicious",
    "attack",
    "anomaly",
    "exploit",
    "unclassified attack",
    "unknown attack",
    "suspicious",
    "suspected attack",
    "review",
    "needs review",
    "under review",
    "未歸類攻擊",
    "未分类攻击",
    "可疑流量",
    "可疑攻擊",
    "需複核",
    "待人工確認",
  ]).has(raw);
}

function displayThreatLabel(predictedLabel, verificationTier, fallback = "未分類") {
  const tier = String(verificationTier || "").trim().toLowerCase();
  if (isGenericAttackBucket(predictedLabel)) {
    if (tier === "confirmed_attack") return "已驗證攻擊";
    if (tier === "probable_attack") return "高概率攻擊";
    if (tier === "suspicious_attack") return "可疑待複核";
    if (tier === "benign") return "正常流量";
    if (tier === "needs_review") return "待複核流量";
  }
  return attackLabelDisplay(predictedLabel || fallback);
}

function attackLabelDescription(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    "port scan": "同一來源短時間測試多個服務或連接埠，常見於探測階段。",
    "brute force": "反覆嘗試登入或憑證組合，目標通常是帳號密碼。",
    infiltration: "疑似已取得部分存取後，進一步深入內部、橫向移動或嘗試外傳資料的行為。",
    reconnaissance: "在正式攻擊前蒐集目標資訊，例如服務、主機與開放面。",
    ddos: "大量流量或請求壓向目標，意圖拖垮服務可用性。",
    "ddos-like flood": "流量型態接近阻斷服務攻擊，但仍需結合上下文複核。",
    exploit: "偵測到疑似利用弱點或異常攻擊載荷的行為，但仍需結合上下文複核。",
    malicious: "模型已判定為惡意，但目前還沒有更細的攻擊家族名稱，因此先以未歸類攻擊呈現。",
    benign: "目前看起來像正常流量。",
  }[raw] || "這是平台的偵測標籤，用來描述目前最接近的攻擊型態。";
}

function verificationTierDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    confirmed_attack: "已驗證攻擊",
    probable_attack: "高概率攻擊",
    suspicious_attack: "可疑待複核",
    benign: "偏向正常",
    needs_review: "需要複核",
  }[raw] || value || "未標示";
}

function verificationTierTone(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "confirmed_attack") return "critical";
  if (raw === "probable_attack") return "high";
  if (raw === "suspicious_attack") return "medium";
  return "low";
}

function analystSuggestionDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    attack: "建議標為攻擊",
    benign: "建議標為正常",
    review: "待人工確認",
  }[raw] || value || "待人工確認";
}

function analystSuggestionTone(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "attack") return "critical";
  if (raw === "benign") return "good";
  return "warn";
}

function feedbackLabelDisplayLabel(value) {
  const raw = String(value || "").trim();
  return {
    "True Positive": "標為攻擊",
    "False Positive": "標為正常",
    Uncertain: "待人工確認",
  }[raw] || value || "待人工確認";
}

function reviewDecisionLabelDisplay(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    attack: "攻擊",
    benign: "正常",
    needs_review: "待複核",
    review: "待複核",
    unknown: "未知",
  }[raw] || value || "未知";
}

function suggestedActionDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    contain: "立即控制",
    monitor: "持續監看",
    review: "補充複核",
    escalate: "升級複核",
  }[raw] || value || "持續監看";
}

function suggestedActionButtonLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    contain: "立即產生控制動作",
    monitor: "保持觀察",
    review: "補充證據後複核",
    escalate: "升級高級複核",
  }[raw] || "套用建議動作";
}

function suggestedActionNextStep(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    contain: "產生防火牆規則",
    monitor: "持續監看",
    review: "補充證據並複核",
    escalate: "升級高級複核",
  }[raw] || "持續監看";
}

function suggestedActionTone(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "contain" || raw === "escalate") return "critical";
  if (raw === "review") return "warn";
  return "good";
}

function disagreementSeverityDisplayLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    none: "一致",
    low: "低分歧",
    medium: "中度分歧",
    high: "高度分歧",
    critical: "關鍵分歧",
  }[raw] || value || "一致";
}

function disagreementSeverityTone(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "critical") return "critical";
  if (raw === "high" || raw === "medium") return "warn";
  return "good";
}

function feedbackLabelToReviewDecision(value) {
  const raw = String(value || "").trim();
  if (raw === "True Positive") return "attack";
  if (raw === "False Positive") return "benign";
  if (raw === "Uncertain") return "needs_review";
  return null;
}

function calculateReviewDisagreementPreview(aiLabel, analystLabel, aiConfidence) {
  const normalizedAi = String(aiLabel || "").trim().toLowerCase();
  const normalizedAnalyst = String(analystLabel || "").trim().toLowerCase();
  const confidence = Number.isFinite(Number(aiConfidence)) ? Math.max(0, Math.min(1, Number(aiConfidence))) : null;
  const disagreementFlag = Boolean(normalizedAi && normalizedAnalyst && normalizedAi !== normalizedAnalyst);
  let disagreementSeverity = "none";
  if (disagreementFlag) {
    if (confidence == null || confidence < 0.65) disagreementSeverity = "low";
    else if (confidence < 0.8) disagreementSeverity = "medium";
    else if (confidence < 0.85) disagreementSeverity = "high";
    else disagreementSeverity = "critical";
  }
  return {
    disagreement_flag: disagreementFlag,
    disagreement_severity: disagreementSeverity,
    second_review_required: Boolean(disagreementFlag && confidence != null && confidence >= 0.85),
  };
}

function percentDisplay(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${(numeric * 100).toFixed(digits)}%`;
}

function shortDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function ingestionSourceDisplay(value) {
  const raw = String(value || "").trim().toLowerCase();
  return {
    suricata_eve_flow: "Suricata 即時偵測",
    netflow_basic: "NetFlow 匯入",
    packet_capture: "即時封包擷取",
    endpoint_agent_flow: "端點 Agent 流量",
    transferids_csv: "CSV 匯入",
  }[raw] || value || "--";
}

const STAGE_DISPLAY = {
  C0: "同域基準",
  C1: "直接轉移基準",
  C2: "傳統式領域適應",
  C3: "自適應跨域偵測",
  C3_1: "弱監督審查適應",
  C3_2: "目標輔助微調",
  AE_C3_2: "AE 強化目標輔助微調",
};

function canonicalStageKey(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("same-domain") || value.startsWith("c0")) return "C0";
  if (value.includes("direct transfer") || value.startsWith("c1")) return "C1";
  if (value.includes("domain adaptation") || value.startsWith("c2")) return "C2";
  if (value.includes("weak") || value.includes("review adaptation") || value.startsWith("c3-1")) return "C3_1";
  if ((value.includes("autoencoder") || value.includes("ae")) && (value.includes("fine") || value.startsWith("c3-2"))) return "AE_C3_2";
  if (value.includes("fine-tuning") || value.includes("fine tuning") || value.includes("target-assisted") || value.startsWith("c3-2")) return "C3_2";
  if (value.includes("cross-domain") || value.includes("icdif") || value.startsWith("c3")) return "C3";
  return "";
}

function stageDisplayName(raw, fallback = "自適應偵測") {
  const key = canonicalStageKey(raw);
  return STAGE_DISPLAY[key] || raw || fallback;
}

function productStrategyLabel(raw) {
  const key = canonicalStageKey(raw);
  if (key === "C1") return "標準偵測";
  if (key === "C3_2" || key === "AE_C3_2" || key === "C3_1") return "強化偵測";
  if (key === "C2" || key === "C3") return "自適應偵測";
  if (key === "C0") return "基準驗證";
  return raw || "自適應偵測";
}

function learningPoolLabel(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value.includes("review") || value.includes("weak")) return "弱監督審查佇列";
  if (value.includes("fine") || value.includes("target")) return "目標輔助微調佇列";
  return "全部候選佇列";
}

const INSIGHT_STAGE_OPTIONS = [
  { key: "C0", label: STAGE_DISPLAY.C0 },
  { key: "C1", label: STAGE_DISPLAY.C1 },
  { key: "C3", label: STAGE_DISPLAY.C3 },
];

const pageMeta = {
  login: {
    title: "安全營運入口",
    subtitle: "TransferIDS SOC 分析平台",
  },
  dashboard: {
    title: "SENTINEL-X Threat Command Center",
    subtitle:
      "Incident-first SOC cockpit for active threats, SLA pressure, analyst workload, model stability, and response decisions.",
  },
  incidents: {
    title: "事件案件佇列",
    subtitle:
      "檢視聚合案件、排序分析師工作優先順序，並將高壓案件導入結構化處理。",
  },
  intake: {
    title: "資料匯入",
    subtitle:
      "上傳遙測資料、啟動即時監控，並將新流量轉成可見的事件案件。",
  },
  response: {
    title: "應變中心",
    subtitle:
      "將偵測結果轉成控制決策、應變紀錄、規則產生與可匯出的證據。",
  },
  "learning-queue": {
    title: "學習佇列",
    subtitle:
      "檢視分析師標記的候選資料，供弱監督與後續目標域微調使用。",
  },
  insights: {
    title: "分析洞察",
    subtitle:
      "檢視信心值、漂移、適應表現與進階診斷，同時避免干擾操作流程。",
  },
  reports: {
    title: "報表與匯出",
    subtitle:
      "產生事件案件報表、下載證據包，並準備給分析師、管理者或研究審閱的輸出。",
  },
  settings: {
    title: "設定",
    subtitle:
      "檢視平台設定、啟用中的收集器、目前模型選擇與系統控制項。",
  },
};

const dashboardData = {
  liveTelemetryLoaded: false,
  observationWindowMinutes: 15,
  riskScore: 0,
  riskStatus: "低",
  riskDrivers: [
    { label: "嚴重告警", value: 0 },
    { label: "開啟案件", value: 0 },
    { label: "近 15 分鐘已驗證攻擊比例", value: "0%" },
    { label: "高概率待確認", value: "0 筆" },
  ],
  kpis: [
    {
      title: "緊急處理",
      value: "0",
      metaLeft: "開啟中的 P1",
      metaRight: "0 件",
      className: "priority-critical",
    },
    {
      title: "優先處理",
      value: "0",
      metaLeft: "開啟中的 P2",
      metaRight: "0 件",
      className: "priority-high",
    },
    {
      title: "持續觀察",
      value: "0",
      metaLeft: "未解告警",
      metaRight: "0",
      className: "priority-medium",
    },
    {
      title: "近 15 分鐘觀測",
      value: "0",
      metaLeft: "已驗證攻擊",
      metaRight: "0 筆",
      className: "priority-volume",
    },
  ],
  topology: {
    nodes: [],
    links: [],
    sourceMode: "等待即時案件資料",
  },
  ticker: [],
  adaptation: {
    activeStrategy: "等待模型狀態",
    baseline: "直接轉移基準",
    current: "等待模型狀態",
    gain: 0,
    baselineScore: 0,
    currentScore: 0,
    status: "等待資料",
  },
  trend: {
    labels: ["00", "10", "20", "30", "40", "50", "60"],
    critical: [0, 0, 0, 0, 0, 0, 0],
    high: [0, 0, 0, 0, 0, 0, 0],
    medium: [0, 0, 0, 0, 0, 0, 0],
    driftAffected: [0, 0, 0, 0, 0, 0, 0],
  },
  incidents: [],
  recentEvents: [],
  metricsSummary: {
    today: {
      raw_observation_count: 0,
      materialized_event_count: 0,
      confirmed_attack_count: 0,
      false_positive_count: 0,
      alert_count: 0,
      incident_count: 0,
      analyst_confirmed_false_positive_rate: 0,
      materialization_rate: 0,
    },
    all_time: {
      raw_observation_count: 0,
      materialized_event_count: 0,
      confirmed_attack_count: 0,
      false_positive_count: 0,
      alert_count: 0,
      incident_count: 0,
      analyst_confirmed_false_positive_rate: 0,
      materialization_rate: 0,
    },
    trend: [],
    metadata: {
      days: 7,
    },
  },
  distributedSensors: {
    total_agents: 0,
    online_agents: 0,
    offline_agents: 0,
    observations_received: 0,
    events_created: 0,
    last_seen_at: null,
    agents: [],
    empty: true,
  },
  optimization: {
    profile: null,
    metadata: {},
  },
  reviewAudit: {
    items: [],
    history: [],
    metadata: {
      days: 7,
      record_count: 0,
      history_count: 0,
      severity_distribution: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
    },
  },
  optimizationHistory: {
    items: [],
    metadata: {},
  },
};

const dashboardState = {
  windowMinutes: 15,
};

const topologyMapState = {
  map: null,
  markersLayer: null,
  linksLayer: null,
  signature: "",
};

const intakeData = {
  sources: [
    {
      id: "csv",
      title: "CSV 上傳",
      status: "可用",
      description: "手動上傳已整理好的 flow rows，適合測試、重播與受控展示。",
      detail: "快速驗證",
    },
    {
      id: "netflow",
      title: "NetFlow",
      status: "可匯入",
      tone: "warn",
      description: "匯入 flow 型態遙測資料，適合企業網路流量分析。",
      detail: "流量匯入",
    },
    {
      id: "suricata",
      title: "Suricata",
      status: "監看就緒",
      tone: "warn",
      description: "讀取 Suricata EVE 記錄，轉成 TransferIDS 可直接使用的偵測輸入。",
      detail: "IDS 來源",
    },
    {
      id: "capture",
      title: "即時擷取",
      status: "待命",
      tone: "warn",
      description: "直接看網卡流量，聚合成 flow 後再送進偵測引擎。",
      detail: "近即時",
    },
  ],
  alignment: [
    ["Flow Duration", "flow_duration"],
    ["Total Fwd Packets", "total_fwd_pkts"],
    ["Total Bwd Packets", "total_bwd_pkts"],
    ["Total Fwd Bytes", "total_fwd_bytes"],
    ["Fwd IAT Mean", "fwd_iat_mean"],
    ["Init Win Forward", "init_win_fwd"],
  ],
  methodMapping: [
    {
      product: "標準偵測",
      thesis: "直接轉移基準",
      purpose: "目標域標記不足時的快速冷啟動方案。",
    },
    {
      product: "自適應偵測",
      thesis: "自適應跨域偵測",
      purpose: "異質環境下的主力跨域偵測策略。",
    },
    {
      product: "強化偵測",
      thesis: "AE 強化目標輔助微調",
      purpose: "結合目標域輔助監督與表徵強化的進階方案。",
    },
  ],
  logs: [
    "[INFO] 資料匯入工作台已就緒。",
    "[INFO] 等待 CSV、NetFlow、Suricata 或即時擷取資料輸入。",
  ],
};

const intakeState = {
  source: "suricata",
  strategy: "adaptive",
  model: "tabtransformer",
  route: "cicids_to_unsw",
  task: "binary",
  ae: true,
  guidedReview: true,
  attack: "port_scan",
  intensity: "medium",
  target: "10.0.0.8",
  service: "HTTPS",
  autoDetectionActive: false,
  selectedReplayPath: "",
};

const sensorRuntimeData = {
  available: false,
  controlAvailable: false,
  running: false,
  processId: null,
  mode: "idle",
  message: "Sensor runtime state has not been loaded.",
  interfaceName: "",
  interfaceDescription: "",
  interfaceIp: "",
  replayFile: "",
  configPath: "",
  logDir: "",
  eveFile: "",
  eveExists: false,
  eveSizeBytes: 0,
  eveLastWriteTime: "",
  recommendedInterfaceName: "",
  recommendedInterfaceIp: "",
  interfaces: [],
  autoStartEnabled: false,
  autoStartInterfaceName: "",
  autoStartInterfaceIp: "",
  autoStartReplayFile: "",
  replayLibrary: [],
  error: "",
};

function resetSensorRuntimeData() {
  Object.assign(sensorRuntimeData, {
    available: false,
    controlAvailable: false,
    running: false,
    processId: null,
    mode: "idle",
    message: "Administrator-only runtime controls are hidden.",
    interfaceName: "",
    interfaceDescription: "",
    interfaceIp: "",
    replayFile: "",
    configPath: "",
    logDir: "",
    eveFile: "",
    eveExists: false,
    eveSizeBytes: 0,
    eveLastWriteTime: "",
    recommendedInterfaceName: "",
    recommendedInterfaceIp: "",
    interfaces: [],
    autoStartEnabled: false,
    autoStartInterfaceName: "",
    autoStartInterfaceIp: "",
    autoStartReplayFile: "",
    replayLibrary: [],
    error: "",
  });
}

const intakeResultState = {
  sourceLabel: "尚無最近分析",
  observations: 0,
  events: 0,
  incidents: 0,
  dominantLabel: "--",
  highestConfidence: "--",
  createdAt: "",
  items: [],
  labels: [],
};

const incidentData = {
  queue: [],
};

const incidentState = {
  search: "",
  priority: "all",
  sla: "all",
  assignee: "all",
  status: "all",
  selectedId: "",
};

const incidentEventLedgerState = {
  items: [],
  lastUpdated: "",
};

const incidentEventLedgerFilterState = {
  mode: "all",
  search: "",
  selectedEventId: "",
};

const responseState = {
  incidentId: "",
  primaryEventId: "",
  verificationTier: "needs_review",
  analystLabelSuggestion: "review",
  analystGuidance: "先從事件案件佇列選擇案件",
  followupChecks: [],
  assigneeOptions: [],
  savedFeedback: [],
  riskScore: 0,
  severity: "低",
  attackType: "尚無案件",
  events: 0,
  detectionMode: "等待案件",
  driftImpact: "未知",
  assignee: "未指派",
  status: "等待案件",
  sla: "等待案件",
  nextStep: "先從事件案件佇列選擇案件",
  feedbackLabel: "Uncertain",
  feedbackType: "analyst_validation",
  confidenceOverride: "",
  addReviewPool: true,
  addFinetunePool: true,
  feedbackNote: "",
  timeline: [],
  playbook: [],
  actions: [],
  artifacts: [],
  auditTrail: [],
  advisor: {
    ai_recommendation_label: null,
    ai_confidence: null,
    analysis_brief: "",
    suggested_action: "monitor",
    analyst_decision_label: null,
    disagreement_flag: false,
    disagreement_severity: "none",
    second_review_required: false,
    final_resolution_label: null,
    final_reviewer: null,
    final_override_reason: null,
    metadata: {},
  },
  reviewHistory: [],
};

const insightsData = {
  setup: {
    activeModel: "等待模型狀態",
    thesisStage: "等待模型狀態",
    transferDirection: "等待後端回報",
    taskType: "等待後端回報",
    featureSchema: "等待 feature_order.json",
    ae: "不可用",
    guidedReview: "等待資料",
    monitoringType: "等待真實匯入資料",
  },
  summary: {
    driftLevel: "Unavailable",
    driftScore: 0,
    affectedFeatures: 0,
    adaptationGain: 0,
    highConfidenceRatio: 0,
    lowConfidenceRatio: 0,
  },
  driftFeatures: [],
  confidence: {
    high: 0,
    medium: 0,
    low: 0,
    notes: [
      "No real confidence distribution is available until uploaded data has been processed.",
    ],
  },
  strategies: {
    C0: {
      label: "同域基準",
      balAcc: 0,
      f1: 0,
      precision: 0,
      recall: 0,
      note: "等待實驗指標匯入。",
      evidence: [],
    },
    C1: {
      label: "直接轉移基準",
      balAcc: 0,
      f1: 0,
      precision: 0,
      recall: 0,
      note: "等待實驗指標匯入。",
      evidence: [],
    },
    C3: {
      label: "自適應跨域偵測",
      balAcc: 0,
      f1: 0,
      precision: 0,
      recall: 0,
      note: "等待實驗指標匯入。",
      evidence: [],
    },
  },
  featureImportance: [],
  conclusions: [
    "No real model intelligence has been loaded yet. Upload data or connect a supported ingestion source.",
  ],
};

const insightsState = {
  selectedStage: "C3",
};

const reportsData = {
  preview: {
    incidentId: "--",
    attackType: "尚無案件",
    risk: "--",
    status: "等待資料",
    assignee: "未指派",
    timeWindow: "尚無時間窗",
  },
  exportSummary: {
    eventCount: 0,
    actionCount: 0,
    diagnostics: "Drift + Confidence + Adaptation Gain",
  },
  bundle: [
    {
      title: "Incident Report",
      description: "Executive summary, affected assets, attack timeline, and final case outcome.",
      type: "Human-readable",
    },
    {
      title: "Event Summary",
      description: "Structured event list with timestamps, labels, confidence, and grouped case metadata.",
      type: "Machine-readable",
    },
    {
      title: "Response Actions",
      description: "Containment steps, workflow changes, generated firewall rules, and analyst notes.",
      type: "Operational",
    },
    {
      title: "Model Explanation",
      description: "Detection mode, confidence context, drift impact, and adaptation evidence snapshot.",
      type: "Research evidence",
    },
    {
      title: "Drift Summary",
      description: "Shift-sensitive features, drift level, and target-domain reliability comments.",
      type: "Diagnostics",
    },
  ],
  timeline: [],
  radar: {
    indicators: [
      { name: "Detection Speed", max: 100 },
      { name: "Accuracy", max: 100 },
      { name: "SLA Compliance", max: 100 },
      { name: "Analyst Confidence", max: 100 },
      { name: "Evidence Quality", max: 100 },
    ],
    values: [0, 0, 0, 0, 0],
  },
  history: [],
};

const reportsState = {
  range: "24h",
  format: "pdf",
};

const settingsData = {
  users: [],
  collectors: [],
  agents: [],
  agentHostRuntime: {
    available: false,
    adminSession: false,
    adminRequiredForService: true,
    service: {
      installed: false,
      running: false,
      status: "not-installed",
      startMode: null,
    },
    python: {
      path: "",
      exists: false,
      scapyInstalled: false,
      pywin32Installed: false,
    },
    npcap: {
      installed: false,
      serviceStatus: null,
      startType: null,
      pathExists: false,
    },
    config: {
      backendUrl: "",
      enrollmentSecretConfigured: false,
      preferredInterface: null,
    },
    files: {
      agentRoot: "",
      agentScript: "",
      agentScriptExists: false,
      configExample: "",
      configExampleExists: false,
      envFile: "",
      credentialsFile: "",
      credentialsExists: false,
      queueFile: "",
      queueExists: false,
      logFile: "",
      logExists: false,
      lastLogLine: "",
      installAdminScript: "",
      installServiceScript: "",
      uninstallServiceScript: "",
      startAgentScript: "",
      smokeTestScript: "",
    },
    commands: {
      installAdmin: "",
      uninstallService: "",
      smokeTest: "",
    },
  },
  registry: {
    activeModel: "Adaptive Detection",
    detectionStrategy: "Enhanced Cross-Domain Detection",
    schemaVersion: "transferids-v1",
    modelVersion: "c3_icdif_v1.2.4",
    lastUpdated: "2026-04-27 03:40",
    transferDirection: "CICIDS2017 -> UNSW-NB15",
  },
  registryEntries: [],
  jobs: [],
  geoip: {
    enabled: false,
    provider: "unavailable",
    cityDbExists: false,
    cityDbPath: "",
    libraryInstalled: false,
      protectedSiteAnchor: {
      site_name: "Protected Site",
      country: "Taiwan",
      region: "Taipei",
      latitude: 25.033,
      longitude: 121.5654,
    },
  },
  geoCoverage: {
    totalNodes: 0,
    geolocatedNodes: 0,
    sourceNodes: 0,
    targetNodes: 0,
    unresolvedPublicSources: 0,
    protectedInternalTargets: 0,
    pathCount: 0,
  },
  lineage: [
    {
      stage: "Direct Transfer Baseline",
      description: "Cold-start deployment path used before strong target-domain adaptation is available.",
    },
    {
      stage: "Enhanced Cross-Domain Detection",
      description: "Adaptive alignment stage that restores reliability under heterogeneous network conditions.",
    },
    {
      stage: "Target-Assisted Fine-Tuning with Analyst Feedback",
      description: "Future supervised refinement path using reviewed target-domain cases from the response workflow.",
    },
  ],
  actionLog: [
    "04:26 - Runtime status loaded from platform control layer.",
    "04:27 - Model registry verified: Enhanced Cross-Domain Detection remains the active deployment strategy.",
  ],
};

function hasGeoCoordinates(payload = {}) {
  return Number.isFinite(Number(payload?.latitude)) && Number.isFinite(Number(payload?.longitude));
}

function normalizeProtectedSiteAnchor(anchor = {}) {
  return {
    site_name: String(anchor.site_name || "Protected Site"),
    country: String(anchor.country || "--"),
    region: String(anchor.region || "--"),
    latitude: Number.isFinite(Number(anchor.latitude)) ? Number(anchor.latitude) : null,
    longitude: Number.isFinite(Number(anchor.longitude)) ? Number(anchor.longitude) : null,
  };
}

function buildGeoCoverageFromIncidents(items = []) {
  const seenSources = new Set();
  const seenTargets = new Set();
  let sourceNodes = 0;
  let targetNodes = 0;
  let geolocatedNodes = 0;
  let unresolvedPublicSources = 0;
  let protectedInternalTargets = 0;

  items.forEach((item) => {
    const sourceIp = String(item?.source_ip || "").trim();
    const destinationIp = String(item?.destination_ip || "").trim();
    const sourceGeo = item?.source_geo || {};
    const destinationGeo = item?.destination_geo || {};

    if (sourceIp && !seenSources.has(sourceIp)) {
      seenSources.add(sourceIp);
      sourceNodes += 1;
      if (hasGeoCoordinates(sourceGeo)) {
        geolocatedNodes += 1;
      } else if (String(sourceGeo.network_type || "").toLowerCase() === "public") {
        unresolvedPublicSources += 1;
      }
    }

    if (destinationIp && !seenTargets.has(destinationIp)) {
      seenTargets.add(destinationIp);
      targetNodes += 1;
      if (hasGeoCoordinates(destinationGeo)) {
        geolocatedNodes += 1;
      }
      if (Boolean(destinationGeo.is_internal)) {
        protectedInternalTargets += 1;
      }
    }
  });

  return {
    totalNodes: sourceNodes + targetNodes,
    geolocatedNodes,
    sourceNodes,
    targetNodes,
    unresolvedPublicSources,
    protectedInternalTargets,
    pathCount: items.length,
  };
}

const learningQueueData = {
  items: [],
  jobs: [],
  actionLog: [
    "等待分析師回饋與微調候選資料。",
  ],
};

const learningQueueState = {
  search: "",
  pool: "all",
  label: "all",
  training: "all",
};

async function tryApi(path, options = {}, expect = "json") {
  try {
    const mapped = await tryMappedWeb3Api(path, options, expect);
    if (mapped.mapped) return mapped.data;
    return await apiRequest(path, options, expect);
  } catch (error) {
    console.warn(`API fallback for ${path}:`, error.message);
    return null;
  }
}

function scheduleAutoDetectionRetry() {
  if (autoDetectionState.retryTimer || autoDetectionState.bootstrapped || !isProtectedPage()) return;
  autoDetectionState.retryTimer = setTimeout(() => {
    autoDetectionState.retryTimer = null;
    bootstrapAutomaticDetection();
  }, 5000);
}

function updateIntakeSourceStatus(sourceId, { status, detail, tone } = {}) {
  const source = intakeData.sources.find((item) => item.id === sourceId);
  if (!source) return;
  if (status) source.status = status;
  if (detail) source.detail = detail;
  if (tone) source.tone = tone;
  if (document.body.dataset.page === "intake") {
    renderSourceCards();
    renderStrategySummary();
  }
}

function syncAutoDetectionInputs(integrations) {
  if (!integrations) return;
  if (!sensorRuntimeData.eveFile && integrations?.suricata?.eve_file) {
    sensorRuntimeData.eveFile = integrations.suricata.eve_file;
  }
}

async function bootstrapAutomaticDetection() {
  if (!isProtectedPage() || autoDetectionState.inFlight || autoDetectionState.bootstrapped || !currentUserIsAdmin()) return;
  autoDetectionState.inFlight = true;
  try {
    const integrations = await tryApi("/platform/integrations");
    if (!integrations) {
      scheduleAutoDetectionRetry();
      return;
    }

    autoDetectionState.integrations = integrations;
    syncAutoDetectionInputs(integrations);
    await refreshSuricataSensorStatus({ integrations });

    const suricataAuto = integrations?.suricata?.auto_start || {};
    const suricataPath = integrations?.suricata?.eve_file || "";
    if (suricataPath) {
      updateIntakeSourceStatus("suricata", {
        status: sensorRuntimeData.running ? "Running" : suricataAuto.enabled ? "Configured" : "Manual",
        detail: sensorRuntimeData.running
          ? `Live sensor / ${sensorRuntimeData.interfaceName || sensorRuntimeData.interfaceIp || "active"}`
          : suricataAuto.enabled
            ? `Auto watcher / ${suricataAuto.interval_seconds}s`
            : "IDS feed",
        tone: sensorRuntimeData.running || suricataAuto.enabled ? "good" : "warn",
      });
    }

    const netflowAuto = integrations?.netflow?.auto_start || {};
    const netflowPath = integrations?.netflow?.file_path || "";
    if (netflowPath) {
      updateIntakeSourceStatus("netflow", {
        status: netflowAuto.enabled ? "Configured" : "Manual",
        detail: netflowAuto.enabled ? `Auto watcher / ${netflowAuto.interval_seconds}s` : "Flow ingestion",
        tone: netflowAuto.enabled ? "good" : "warn",
      });
    }

    intakeState.autoDetectionActive = Boolean(
      sensorRuntimeData.running ||
      suricataAuto.enabled ||
      netflowAuto.enabled,
    );
    autoDetectionState.bootstrapped = true;
  } finally {
    autoDetectionState.inFlight = false;
  }
}

function buildTopologyFromIncidents(items = []) {
  const seenSources = new Map();
  const seenTargets = new Map();
  const nodes = [];
  const links = [];
  const targetSlots = [
    { lat: 25.033, lon: 121.5654, region: "受保護站點（台北）", theater: "Regional" },
    { lat: 24.1477, lon: 120.6736, region: "受保護站點（台中）", theater: "Regional" },
    { lat: 22.6273, lon: 120.3014, region: "受保護站點（高雄）", theater: "Regional" },
    { lat: 24.8138, lon: 120.9675, region: "受保護站點（新竹）", theater: "Regional" },
  ];
  let unresolvedPublicSources = 0;
  let suppressedLinks = 0;

  items.slice(0, 4).forEach((item, index) => {
    const source = item.source_ip || `source-${index + 1}`;
    const target = item.destination_ip || `target-${index + 1}`;
    const sourceGeo = item.source_geo || {};
    const targetGeo = item.destination_geo || {};
    const sourceHasGeo = hasGeoCoordinates(sourceGeo);
    const targetHasGeo = hasGeoCoordinates(targetGeo);

    if (!seenSources.has(source)) {
      if (sourceHasGeo) {
        const sourceId = `src-${seenSources.size + 1}`;
        seenSources.set(source, sourceId);
        nodes.push({
          id: sourceId,
          lat: Number(sourceGeo.latitude),
          lon: Number(sourceGeo.longitude),
          label: source,
          region: sourceGeo.display_name || sourceGeo.city || sourceGeo.region || "公開來源",
          theater: "Global",
          type: "source",
          risk: riskClass(item.risk_score || 0),
          provenance: String(sourceGeo.source || "geoip_city_db"),
          provenanceLabel: "真實 GeoIP",
          networkType: String(sourceGeo.network_type || "public"),
          isInternal: Boolean(sourceGeo.is_internal),
          isEnriched: Boolean(sourceGeo.is_enriched),
          country: sourceGeo.country || "--",
          city: sourceGeo.city || "",
        });
      } else if (String(sourceGeo.network_type || "").toLowerCase() === "public") {
        seenSources.set(source, null);
        unresolvedPublicSources += 1;
      } else {
        seenSources.set(source, null);
      }
    }

    if (!seenTargets.has(target)) {
      const slot = targetSlots[seenTargets.size] || {
        lat: 24 - seenTargets.size * 0.8,
        lon: 121 - seenTargets.size * 0.3,
        region: `受保護區域 ${seenTargets.size + 1}`,
        theater: "Regional",
      };
      const targetId = `dst-${seenTargets.size + 1}`;
      seenTargets.set(target, targetId);
      nodes.push({
        id: targetId,
        lat: targetHasGeo ? Number(targetGeo.latitude) : slot.lat,
        lon: targetHasGeo ? Number(targetGeo.longitude) : slot.lon,
        label: target,
        region: targetGeo.display_name || targetGeo.city || targetGeo.region || slot.region,
        theater: slot.theater,
        type: "target",
        risk: riskClass(item.risk_score || 0),
        provenance: targetHasGeo ? String(targetGeo.source || "protected_site_anchor") : "fallback_slot",
        provenanceLabel:
          String(targetGeo.source || "") === "protected_site_anchor"
            ? "受保護站點錨點"
            : targetHasGeo
              ? "已解析座標"
              : "備援投影",
        networkType: String(targetGeo.network_type || (targetHasGeo ? "internal" : "internal")),
        isInternal: Boolean(targetGeo.is_internal),
        isEnriched: Boolean(targetGeo.is_enriched),
        country: targetGeo.country || "--",
        city: targetGeo.city || "",
      });
    }

    const fromId = seenSources.get(source);
    const toId = seenTargets.get(target);
    if (fromId && toId) {
      links.push({
        from: fromId,
        to: toId,
        severity: riskClass(item.risk_score || 0),
        label: attackLabelDisplay(item.predicted_label || "Suspicious Flow"),
        riskScore: Math.round(Number(item.risk_score || 0)),
        incidentId: item.incident_id || "--",
      });
    } else {
      suppressedLinks += 1;
    }
  });

  return {
    nodes,
    links,
    unresolvedPublicSources,
    suppressedLinks,
    sourceMode: items.length ? "平台即時事件" : "目前沒有即時事件",
  };
}

async function loadDashboardFromApi() {
  const [dashboard, runtime, metricsSummary, optimizationProfile, reviewHistory, optimizationHistory, agentSummary] = await Promise.all([
    tryApi(`/ndr/dashboard?window_minutes=${dashboardState.windowMinutes}`),
    tryApi("/ndr/runtime-status"),
    tryApi("/metrics/summary?days=7"),
    tryApi("/optimization/best_profile"),
    tryApi("/review/history?days=7&limit=200"),
    tryApi("/optimization/history?limit=12"),
    tryApi("/agents/summary"),
  ]);
  dashboardData.metricsSummary = metricsSummary?.today
    ? metricsSummary
    : {
      today: {
        raw_observation_count: 0,
        materialized_event_count: 0,
        confirmed_attack_count: 0,
        false_positive_count: 0,
        alert_count: 0,
        incident_count: 0,
        analyst_confirmed_false_positive_rate: 0,
        materialization_rate: 0,
      },
      all_time: {
        raw_observation_count: 0,
        materialized_event_count: 0,
        confirmed_attack_count: 0,
        false_positive_count: 0,
        alert_count: 0,
        incident_count: 0,
        analyst_confirmed_false_positive_rate: 0,
        materialization_rate: 0,
      },
      trend: [],
      metadata: { days: 7 },
    };
  dashboardData.optimization = optimizationProfile?.profile
    ? optimizationProfile
    : {
      profile: null,
      metadata: {},
    };
  dashboardData.reviewAudit = reviewHistory?.ok
    ? reviewHistory
    : {
      items: [],
      history: [],
      metadata: {
        days: 7,
        record_count: 0,
        history_count: 0,
        severity_distribution: { none: 0, low: 0, medium: 0, high: 0, critical: 0 },
      },
    };
  dashboardData.optimizationHistory = optimizationHistory?.ok
    ? optimizationHistory
    : {
      items: [],
      metadata: {},
    };
  const distributedSensorSummary = unwrapApiData(agentSummary) || agentSummary;
  dashboardData.distributedSensors = distributedSensorSummary
    ? {
      total_agents: Number(distributedSensorSummary.total_agents || 0),
      online_agents: Number(distributedSensorSummary.online_agents || 0),
      offline_agents: Number(distributedSensorSummary.offline_agents || 0),
      observations_received: Number(distributedSensorSummary.observations_received || 0),
      events_created: Number(distributedSensorSummary.events_created || 0),
      last_seen_at: distributedSensorSummary.last_seen_at || null,
      agents: Array.isArray(distributedSensorSummary.agents) ? distributedSensorSummary.agents : [],
      empty: Boolean(distributedSensorSummary.empty || !Number(distributedSensorSummary.total_agents || 0)),
    }
    : {
      total_agents: 0,
      online_agents: 0,
      offline_agents: 0,
      observations_received: 0,
      events_created: 0,
      last_seen_at: null,
      agents: [],
      empty: true,
    };
  if (!dashboard) {
    dashboardData.liveTelemetryLoaded = false;
    dashboardData.observationWindowMinutes = dashboardState.windowMinutes;
    dashboardData.riskScore = 0;
    dashboardData.riskStatus = "低";
    dashboardData.topology = { nodes: [], links: [], sourceMode: "等待即時案件資料" };
    dashboardData.ticker = [];
    dashboardData.incidents = [];
    dashboardData.recentEvents = [];
    return;
  }
  dashboardData.liveTelemetryLoaded = true;

  const overview = dashboard.overview || {};
  const incidents = dashboard.priority_incidents || [];
  const latestEvents = dashboard.recent_events || [];
  const observationWindowMinutes = Number(overview.observation_window_minutes || 15);
  dashboardData.observationWindowMinutes = observationWindowMinutes;
  const recentObservations = Number(overview.recent_observations || 0);
  const recentConfirmedAttackEvents = Number(overview.recent_confirmed_attack_events || overview.recent_materialized_events || 0);
  const recentProbableAttackEvents = Number(overview.recent_probable_attack_events || 0);
  const eventizationRatePercent = Math.round(Number(overview.recent_eventization_rate || 0) * 100);
  const highSeverityAlerts = Number(overview.high_severity_alerts || 0);
  const activeIncidents = Number(overview.active_incidents || 0);
  const openAlerts = Number(overview.open_alerts || 0);
  const avgRisk =
    incidents.length > 0
      ? Math.round(incidents.reduce((sum, item) => sum + Number(item.risk_score || 0), 0) / incidents.length)
      : 0;

  dashboardData.riskScore = Math.min(
    100,
    Math.max(
      avgRisk,
      Math.round(
        Math.min(highSeverityAlerts, 5) * 8
        + Math.min(activeIncidents, 5) * 8
        + Math.min(openAlerts, 10) * 1
        + Math.min(eventizationRatePercent, 100) * 0.12
        + Math.min(recentProbableAttackEvents, 10) * 0.8,
      ),
    ),
  );
  dashboardData.riskStatus = severityLabelFromScore(dashboardData.riskScore);
  dashboardData.riskDrivers = [
    { label: "嚴重告警", value: highSeverityAlerts },
    { label: "開啟案件", value: activeIncidents },
    { label: `近 ${observationWindowMinutes} 分鐘已驗證攻擊比例`, value: `${eventizationRatePercent}%` },
    { label: "高概率待確認", value: `${recentProbableAttackEvents} 筆` },
  ];
  dashboardData.kpis = [
    {
      title: "緊急處理",
      value: `${Number(overview.active_p1_incidents || 0)}`,
      metaLeft: "開啟中的 P1",
      metaRight: `${Number(overview.active_p1_incidents || 0)} 件`,
      className: "priority-critical",
    },
    {
      title: "優先處理",
      value: `${Number(overview.active_p2_incidents || 0)}`,
      metaLeft: "開啟中的 P2",
      metaRight: `${Number(overview.active_p2_incidents || 0)} 件`,
      className: "priority-high",
    },
    {
      title: "持續觀察",
      value: `${Number(overview.active_p3_incidents || 0)}`,
      metaLeft: "未解告警",
      metaRight: `${openAlerts} 筆`,
      className: "priority-medium",
    },
    {
      title: `近 ${observationWindowMinutes} 分鐘觀測`,
      value: `${recentObservations}`,
      metaLeft: "已驗證攻擊",
      metaRight: `${recentConfirmedAttackEvents} 筆`,
      className: "priority-volume",
    },
  ];
  dashboardData.topology = buildTopologyFromIncidents(incidents);
  dashboardData.ticker = (dashboard.recent_alerts || []).slice(0, 5).map((alert, index) => ({
    id: alert.incident_id || alert.alert_id,
    severity: String(alert.severity || "medium").toLowerCase(),
    title: `[${String(alert.severity || "medium").toUpperCase()}] ${alert.incident_id || alert.alert_id} · ${alert.event_id}`,
    detail: (alert.resolution_recommendation?.recommended_actions || []).join(" · ") || "Review associated event and incident context.",
    incident: alert.incident_id || incidents[index]?.incident_id || "N/A",
    response: alert.resolution_recommendation?.primary_action || "Open incident and evaluate response options.",
  }));
  if (!dashboardData.ticker.length) dashboardData.ticker = [];

  if (runtime) {
    const currentStage = runtime.model_stage_label || runtime.model_stage || dashboardData.adaptation.current;
    const baselineScore = 0;
    const currentScore = 0;
    dashboardData.adaptation = {
      activeStrategy: stageDisplayName(runtime.model_stage_label || runtime.model_stage || runtime.runtime_mode, dashboardData.adaptation.activeStrategy),
      baseline: STAGE_DISPLAY.C1,
      current: stageDisplayName(currentStage, dashboardData.adaptation.current),
      gain: 0,
      baselineScore,
      currentScore,
      status: runtime.connected ? "已連線" : "備援模式",
    };
  }

  if (dashboard.trend) {
    dashboardData.trend = {
      labels: dashboard.trend.labels || [],
      critical: dashboard.trend.critical || [],
      high: dashboard.trend.high || [],
      medium: dashboard.trend.medium || [],
      driftAffected: dashboard.trend.driftAffected || [],
    };
  }

  dashboardData.incidents = incidents.slice(0, 5).map((item) => ({
    id: item.incident_id,
    updated: formatClockTime(item.updated_at || item.last_seen_at),
    priority: item.priority_level || priorityFromRisk(item.risk_score || 0),
    risk: Math.round(Number(item.risk_score || 0)),
    chain: attackLabelDisplay(item.predicted_label || item.title || "Incident"),
    events: item.event_count || 0,
    assignee: item.assignee_username || "Unassigned",
    sla: item.sla_status === "breached" ? "Breached" : item.sla_status === "at_risk" ? "At Risk" : "Healthy",
    status: item.status || "Open",
  }));
  dashboardData.recentEvents = latestEvents.map((item) => ({
    id: item.event_id,
    timestamp: item.timestamp,
    time: formatClockTime(item.timestamp),
    source: item.source_ip,
    destination: item.destination_ip,
    sourceReference: item.ingestion_source_type || item.source || "uploaded_file",
    agentId: item.agent_id || "",
    verdict: item.verdict || (item.predicted_label === "attack" ? "attack" : "benign"),
    label: displayThreatLabel(
      item.predicted_label,
      item.verification?.verdict_tier || item.experiment_context?.verification?.verdict_tier,
    ),
    confidence: Number(item.confidence_score || 0).toFixed(2),
    severity: String(item.severity || "").toLowerCase() || severityFromRiskScore(Number(item.risk_score || 0)),
    severityLabel: severityDisplayLabel(String(item.severity || "").toLowerCase() || severityFromRiskScore(Number(item.risk_score || 0))),
    risk: Math.round(Number(item.risk_score || 0)),
  }));
}

async function loadIncidentsFromApi() {
  const payload = await tryApi("/ndr/incidents");
  if (!payload?.items?.length) {
    incidentData.queue = [];
    incidentState.selectedId = "";
    return;
  }
  incidentData.queue = payload.items.map((item) => ({
    id: item.incident_id,
    priority: item.priority_level || priorityFromRisk(item.risk_score || 0),
    risk: Math.round(Number(item.risk_score || 0)),
    label: attackLabelDisplay(item.predicted_label || item.title || "Incident"),
    events: item.event_count || 0,
    mode: "Adaptive Detection",
    modeCode: "Enhanced Cross-Domain Detection",
    driftCount: 0,
    assignee: item.assignee_username || "Unassigned",
    sla: item.sla_status === "breached" ? "Breached" : item.sla_status === "at_risk" ? "At Risk" : "Healthy",
    status: (item.status || "open").replace(/^\w/, (c) => c.toUpperCase()),
    updated: formatClockTime(item.updated_at || item.last_seen_at),
    sourceIp: item.source_ip || "-",
    destination: item.destination_ip || "-",
    destinationPort: item.grouping_key?.split("|")[3] || "-",
    timeline: [],
  }));
  incidentState.selectedId = incidentData.queue[0]?.id || incidentState.selectedId;

  for (const item of incidentData.queue.slice(0, 4)) {
    const detail = await tryApi(`/ndr/incidents/${item.id}`);
    if (detail?.timeline) {
      const stageValue = detail.events?.[0]?.experiment_context?.model_stage_label || detail.events?.[0]?.experiment_context?.model_stage;
      item.mode = productStrategyLabel(stageValue || "Adaptive Detection");
      item.modeCode = stageDisplayName(stageValue, "Enhanced Cross-Domain Detection");
      item.driftCount = (detail.events || []).filter((event) => event.out_of_range_flag).length;
      item.timeline = detail.timeline.map((step) => ({
        time: formatClockTime(step.timestamp),
        event: step.event_id,
        action: attackLabelDisplay(step.predicted_label || step.attack_stage),
        confidence: step.risk_score != null ? Number(step.risk_score).toFixed(0) : "--",
        note: step.summary,
      }));
    }
  }
}

async function loadIncidentEventLedgerFromApi() {
  const payload = await tryApi("/ndr/events");
  incidentEventLedgerState.items = (payload?.items || []).map((item) => ({
    timestamp: item.timestamp,
    eventId: item.event_id,
    sourceIp: item.source_ip || "--",
    destinationIp: item.destination_ip || "--",
    verificationTier: item.verification?.verdict_tier || item.experiment_context?.verification?.verdict_tier || "needs_review",
    label: displayThreatLabel(
      item.predicted_label,
      item.verification?.verdict_tier || item.experiment_context?.verification?.verdict_tier,
    ),
    decisionSummary: item.verification?.decision_summary || item.experiment_context?.verification?.decision_summary || "",
    analystSuggestion: item.verification?.analyst_label_suggestion || item.experiment_context?.verification?.analyst_label_suggestion || "review",
    analystGuidance: item.verification?.analyst_guidance || item.experiment_context?.verification?.analyst_guidance || "",
    followupChecks: item.verification?.followup_checks || item.experiment_context?.verification?.followup_checks || [],
    confidence: Number(item.confidence_score || 0).toFixed(2),
    incidentId: item.incident_id || "--",
    sourceType: ingestionSourceDisplay(item.ingestion_source_type),
  }));
  incidentEventLedgerState.lastUpdated = payload ? new Date().toISOString() : "";
}

async function loadResponseFromApi() {
  const [incidents, users] = await Promise.all([tryApi("/ndr/incidents"), tryApi("/ndr/users")]);
  const selectedId =
    new URLSearchParams(window.location.search).get("incident_id") ||
    new URLSearchParams(window.location.search).get("incident") ||
    incidents?.items?.[0]?.incident_id;
  if (!selectedId) {
    responseState.assigneeOptions = users?.items || [];
    responseState.incidentId = "";
    responseState.primaryEventId = "";
    responseState.verificationTier = "needs_review";
    responseState.analystLabelSuggestion = "review";
    responseState.analystGuidance = "先從事件案件佇列選擇案件";
    responseState.followupChecks = [];
    responseState.feedbackLabel = "Uncertain";
    responseState.timeline = [];
    responseState.playbook = [];
    responseState.actions = [];
    responseState.artifacts = [];
    responseState.auditTrail = [];
    responseState.savedFeedback = [];
    responseState.reviewHistory = [];
    responseState.attackType = "尚無案件";
    responseState.nextStep = "先從事件案件佇列選擇案件";
    applyAdvisorReviewState(null);
    return;
  }
  const [detail, advisor, reviewHistory] = await Promise.all([
    tryApi(`/ndr/incidents/${selectedId}`),
    tryApi(`/review/incidents/${selectedId}/advisor`),
    tryApi(`/review/incidents/${selectedId}/history`),
  ]);
  if (!detail?.incident) return;
  const firstEvent = detail.events?.[0];
  const verification = firstEvent?.verification || firstEvent?.experiment_context?.verification || {};
  responseState.assigneeOptions = users?.items || [];
  responseState.primaryEventId = firstEvent?.event_id || "";
  responseState.incidentId = detail.incident.incident_id;
  responseState.riskScore = Math.round(Number(detail.incident.risk_score || 0));
  responseState.severity = detail.incident.severity || severityLabelFromScore(responseState.riskScore);
  responseState.verificationTier = verification.verdict_tier || "needs_review";
  responseState.attackType = displayThreatLabel(
    detail.incident.predicted_label || detail.attack_chain?.attack_chain_label || "Incident",
    responseState.verificationTier,
    "Incident",
  );
  responseState.analystLabelSuggestion = verification.analyst_label_suggestion || "review";
  responseState.analystGuidance = verification.analyst_guidance || "請先比對更多上下文後再標註。";
  responseState.followupChecks = verification.followup_checks || [];
  responseState.events = detail.incident.event_count || detail.events?.length || 0;
  responseState.detectionMode = stageDisplayName(
    firstEvent?.experiment_context?.model_stage_label || firstEvent?.experiment_context?.model_stage,
    "Enhanced Cross-Domain Detection",
  );
  responseState.driftImpact = detail.sla?.status === "breached" ? "High" : (detail.events || []).some((event) => event.out_of_range_flag) ? "Medium" : "Low";
  responseState.assignee = detail.incident.assignee_username || "未指派";
  responseState.status = (detail.incident.status || "investigating").replace(/^\w/, (c) => c.toUpperCase());
  responseState.sla =
    detail.sla?.status === "breached"
      ? "SLA 已逾期"
      : `剩餘 ${detail.sla?.remaining_minutes ?? 0} 分鐘`;
  responseState.nextStep = detail.playbook?.actions?.[0] || "檢視案件證據";
  if (verification.suggested_feedback_label) {
    responseState.feedbackLabel = verification.suggested_feedback_label;
  }
  responseState.timeline = (detail.timeline || []).map((item) => ({
    time: formatClockTime(item.timestamp),
    event: item.event_id,
    action: attackLabelDisplay(item.predicted_label || item.attack_stage),
    confidence: item.risk_score != null ? Number(item.risk_score).toFixed(0) : "--",
    note: item.summary,
  }));
  responseState.playbook = detail.playbook?.actions || responseState.playbook;
  responseState.actions = [
    {
      title: "產生防火牆規則",
      reason: `根據目前案件脈絡，為來源 ${detail.incident.source_ip || "-"} 產生可直接使用的封鎖規則。`,
      output: detail.playbook?.firewall_rule || "No firewall rule generated",
    },
    ...(detail.playbook?.actions || []).slice(0, 2).map((action) => ({
      title: action,
      reason: "依照案件脈絡與處置劇本自動整理出的建議步驟。",
      output: detail.playbook?.firewall_rule || "僅提供建議，未產生額外輸出",
    })),
  ];
  responseState.artifacts = [
    {
      type: "證據封包",
      preview: "包含案件摘要、時間線、告警、處置動作與模型證據的完整輸出。",
      action: "建立封包",
    },
    {
      type: "劇本匯出",
      preview: "整理好的防火牆規則與建議處置步驟，可直接交付或下載。",
      action: "下載劇本",
    },
    {
      type: "歷史匯出",
      preview: `這個案件目前已有 ${detail.exports?.length || 0} 份歷史輸出可供追溯。`,
      action: "檢視歷史",
    },
  ];
  responseState.auditTrail = [
    ...((detail.response_actions || []).map((action) => `${formatClockTime(action.created_at)} - ${action.result_message}`)),
    ...((detail.feedback || []).map((item) => `${formatClockTime(item.created_at)} - 已儲存判斷：${feedbackLabelDisplayLabel(item.analyst_label)}`)),
    ...((detail.exports || []).map((item) => `${formatClockTime(item.created_at)} - 已建立匯出：${item.file_name}`)),
  ].slice(0, 8);
  responseState.savedFeedback = detail.feedback || [];
  responseState.reviewHistory = reviewHistory?.entries || [];
  applyAdvisorReviewState(
    advisor?.review,
    {
      ai_recommendation_label: verification.analyst_label_suggestion === "benign" ? "benign" : "needs_review",
      ai_confidence: firstEvent?.confidence_score != null ? Number(firstEvent.confidence_score) : null,
      suggested_action: "review",
    },
  );
}

async function loadInsightsFromApi() {
  const [runtime, drift, compareLatest] = await Promise.all([
    tryApi("/ndr/runtime-status"),
    tryApi("/ndr/drift/latest"),
    tryApi("/ndr/compare/latest"),
  ]);
  if (runtime) {
    insightsData.setup.activeModel = runtime.runtime_mode || insightsData.setup.activeModel;
    insightsData.setup.thesisStage = stageDisplayName(runtime.model_stage_label || runtime.model_stage, insightsData.setup.thesisStage);
    insightsData.setup.transferDirection = runtime.transfer_direction || insightsData.setup.transferDirection;
    insightsData.setup.taskType = runtime.task_type || insightsData.setup.taskType;
    insightsData.setup.featureSchema = `${runtime.feature_schema_version || "schema"} / ${runtime.canonical_feature_space || insightsData.setup.featureSchema}`;
    insightsData.setup.ae = runtime.ae_enabled ? "Enabled" : "Disabled";
  }
  if (drift?.profile) {
    insightsData.summary.driftScore = Number(drift.profile.global_drift_score || insightsData.summary.driftScore);
    insightsData.summary.driftLevel = String(drift.profile.drift_level || insightsData.summary.driftLevel).replace(/^\w/, (c) => c.toUpperCase());
    insightsData.summary.affectedFeatures = Number(drift.profile.affected_feature_count || insightsData.summary.affectedFeatures);
    insightsData.driftFeatures = (drift.profile.feature_drift || []).slice(0, 4).map((item) => ({
      name: item.feature,
      source: Number(item.reference_mean ?? 0),
      target: Number(item.current_mean ?? 0),
      js: Number(item.js_divergence ?? 0),
      outRange: Math.round(Number(item.out_of_range_ratio ?? 0) * 100),
    }));
  }
  if (compareLatest?.run?.summary?.comparison_table) {
    const rows = compareLatest.run.summary.comparison_table;
    rows.forEach((row) => {
      const stageKey =
        String(row.model || "").toLowerCase().includes("c1") ? "C1" :
        String(row.model || "").toLowerCase().includes("c3") ? "C3" : null;
      if (stageKey && insightsData.strategies[stageKey]) {
        insightsData.strategies[stageKey].balAcc = Number(row.bal_acc || insightsData.strategies[stageKey].balAcc);
        insightsData.strategies[stageKey].f1 = Number(row.f1_macro || insightsData.strategies[stageKey].f1);
      }
    });
    insightsData.summary.adaptationGain = Math.round((insightsData.strategies.C3.balAcc - insightsData.strategies.C1.balAcc) * 100);
  }
}

async function loadReportsFromApi() {
  const [incidents, exportsPayload] = await Promise.all([tryApi("/ndr/incidents"), tryApi("/ndr/exports")]);
  const firstIncident = incidents?.items?.[0];
  if (firstIncident) {
    reportsData.preview.incidentId = firstIncident.incident_id;
    reportsData.preview.attackType = attackLabelDisplay(firstIncident.predicted_label || "Incident");
    reportsData.preview.risk = firstIncident.severity || severityLabelFromScore(Number(firstIncident.risk_score || 0));
    reportsData.preview.status = firstIncident.status || "Open";
    reportsData.preview.assignee = firstIncident.assignee_username || "Unassigned";
    reportsData.preview.timeWindow = `${formatDateTime(firstIncident.first_seen_at)} -> ${formatDateTime(firstIncident.last_seen_at)}`;
    const detail = await tryApi(`/ndr/incidents/${firstIncident.incident_id}`);
    if (detail?.timeline?.length) {
      reportsData.exportSummary.eventCount = detail.events?.length || reportsData.exportSummary.eventCount;
      reportsData.exportSummary.actionCount = detail.response_actions?.length || reportsData.exportSummary.actionCount;
      reportsData.timeline = detail.timeline.slice(0, 8).map((item, index) => [
        formatClockTime(item.timestamp),
        Math.min(index, 3),
        Math.max(20, Math.round(Number(item.risk_score || 0))),
        attackLabelDisplay(item.predicted_label || item.attack_stage),
      ]);
    }
  } else {
    reportsData.preview.incidentId = "--";
    reportsData.preview.attackType = "尚無案件";
    reportsData.preview.risk = "--";
    reportsData.preview.status = "等待資料";
    reportsData.preview.assignee = "未指派";
    reportsData.preview.timeWindow = "尚無時間窗";
    reportsData.exportSummary.eventCount = 0;
    reportsData.exportSummary.actionCount = 0;
    reportsData.timeline = [];
  }
  if (exportsPayload?.items) {
    reportsData.history = exportsPayload.items.map((item) => ({
      id: item.export_id,
      incident: item.incident_id,
      by: `User ${item.created_by_user_id}`,
      time: formatClockTime(item.created_at),
      type: item.export_type,
      format: String(item.file_name || "").split(".").pop()?.toUpperCase() || "TXT",
    }));
  }
}

async function loadSettingsFromApi() {
  const isAdmin = currentUserIsAdmin();
  settingsData.users = [];
  settingsData.collectors = [];
  settingsData.agents = [];
  settingsData.registryEntries = [];
  settingsData.jobs = [];
  if (!isAdmin) {
    settingsData.actionLog = ["平台狀態摘要已更新。"];
    resetSensorRuntimeData();
  }

  let usersPayload = null;
  let collectorsPayload = null;
  let agentsPayload = null;
  let runtime = null;
  let registryPayload = null;
  let jobsPayload = null;
  let sensorPayload = null;
  let geoipPayload = null;
  let dashboardPayload = null;
  let agentHostRuntimePayload = null;

  if (isAdmin) {
    [usersPayload, collectorsPayload, agentsPayload, runtime, registryPayload, jobsPayload, sensorPayload, geoipPayload, dashboardPayload, agentHostRuntimePayload] = await Promise.all([
      tryApi("/admin/users"),
      tryApi("/ndr/collectors"),
      tryApi("/ndr/agents"),
      tryApi("/ndr/runtime-status"),
      tryApi("/ndr/model-registry"),
      tryApi("/ndr/fine-tuning/jobs"),
      tryApi("/platform/suricata-sensor/status"),
      tryApi("/platform/geoip/status"),
      tryApi("/ndr/dashboard"),
      tryApi("/platform/endpoint-agent/runtime"),
    ]);
  } else {
    [runtime, geoipPayload, dashboardPayload] = await Promise.all([
      tryApi("/ndr/runtime-status"),
      tryApi("/platform/geoip/status"),
      tryApi("/ndr/dashboard"),
    ]);
  }
  if (usersPayload?.items) {
    settingsData.users = usersPayload.items.map((item) => ({
      username: item.username,
      role: item.role,
      status: "active",
      lastLogin: "N/A",
    }));
  }
  if (collectorsPayload?.items) {
    settingsData.collectors = collectorsPayload.items.map((item) => ({
      id: item.collector_id,
      type: item.source_type,
      status: String(item.status || "unknown").replace(/^\w/, (c) => c.toUpperCase()),
      interval: item.interval_seconds ? `${item.interval_seconds}s` : "manual",
      lastRun: formatClockTime(item.last_run_at || item.last_success_at),
    }));
  }
  if (agentsPayload?.items) {
    settingsData.agents = agentsPayload.items.map((item) => ({
      agentId: item.agent_id,
      displayName: item.display_name || item.hostname || item.agent_id,
      hostName: item.host_name || item.hostname || "--",
      status: String(item.status || "unknown").toLowerCase(),
      lastObservationAt: item.last_observation_at || item.last_seen_at,
      lastObservationCount: Number(item.last_observation_count || item.observations_received || 0),
      lastMaterializedEventCount: Number(item.last_materialized_event_count || item.events_created || 0),
      interfaceName: item.preferred_interface || "--",
      agentVersion: item.agent_version || "--",
    }));
  }
  if (runtime) {
    settingsData.registry.activeModel = runtime.runtime_mode || settingsData.registry.activeModel;
    settingsData.registry.detectionStrategy = stageDisplayName(runtime.model_stage_label || runtime.model_stage, settingsData.registry.detectionStrategy);
    settingsData.registry.schemaVersion = runtime.feature_schema_version || settingsData.registry.schemaVersion;
    settingsData.registry.modelVersion = runtime.experiment_version || settingsData.registry.modelVersion;
    settingsData.registry.lastUpdated = runtime.reason || settingsData.registry.lastUpdated;
    settingsData.registry.transferDirection = runtime.transfer_direction || settingsData.registry.transferDirection;
  }
  if (registryPayload?.items?.length) {
    settingsData.registryEntries = registryPayload.items.map((item) => ({
      registryId: item.registry_id,
      modelName: item.model_name,
      modelVersion: item.model_version,
      detectionStrategy: stageDisplayName(item.detection_strategy || item.stage_label, item.detection_strategy || "Adaptive Detection"),
      stageLabel: stageDisplayName(item.stage_label || item.detection_strategy, item.stage_label || "Adaptive Detection"),
      schemaVersion: item.schema_version,
      transferDirection: item.transfer_direction,
      sourceJobId: item.source_job_id || "--",
      status: item.is_active ? "Active" : String(item.status || "registered").replace(/^\w/, (c) => c.toUpperCase()),
      notes: item.notes || "",
      createdAt: item.created_at,
    }));
    const active = settingsData.registryEntries.find((item) => item.status === "Active") || settingsData.registryEntries[0];
    if (active) {
      settingsData.registry.activeModel = active.modelName || settingsData.registry.activeModel;
      settingsData.registry.detectionStrategy = active.detectionStrategy || settingsData.registry.detectionStrategy;
      settingsData.registry.schemaVersion = active.schemaVersion || settingsData.registry.schemaVersion;
      settingsData.registry.modelVersion = active.modelVersion || settingsData.registry.modelVersion;
      settingsData.registry.lastUpdated = formatDateTime(active.createdAt);
      settingsData.registry.transferDirection = active.transferDirection || settingsData.registry.transferDirection;
    }
    settingsData.lineage = [...settingsData.registryEntries]
      .reverse()
      .map((item) => ({
        stage: item.stageLabel,
        description: item.notes || `${item.modelVersion} registered for ${item.transferDirection} using ${item.detectionStrategy}.`,
      }));
  }
  if (jobsPayload?.items) {
    settingsData.jobs = jobsPayload.items.map((item) => ({
      jobId: item.job_id,
      scope: learningPoolLabel(item.pool_scope),
      status: String(item.status || "queued").replace(/_/g, " "),
      candidateCount: Number(item.candidate_count || 0),
      requestedVersion: item.requested_model_version || "--",
      outputVersion: item.output_model_version || "--",
      createdAt: item.created_at,
    }));
  }
  if (sensorPayload) {
    normalizeSuricataSensorStatus(sensorPayload);
  }
  if (geoipPayload) {
    settingsData.geoip = {
      enabled: Boolean(geoipPayload.enabled),
      provider: String(geoipPayload.provider || "unavailable"),
      cityDbExists: Boolean(geoipPayload.city_db_exists),
      cityDbPath: String(geoipPayload.city_db_path || ""),
      libraryInstalled: Boolean(geoipPayload.library_installed),
      protectedSiteAnchor: normalizeProtectedSiteAnchor(geoipPayload.protected_site_anchor),
    };
  }
  if (dashboardPayload?.priority_incidents) {
    settingsData.geoCoverage = buildGeoCoverageFromIncidents(dashboardPayload.priority_incidents);
  }
  if (agentHostRuntimePayload) {
    settingsData.agentHostRuntime = {
      available: Boolean(agentHostRuntimePayload.available),
      adminSession: Boolean(agentHostRuntimePayload.admin_session),
      adminRequiredForService: Boolean(agentHostRuntimePayload.admin_required_for_service),
      service: {
        installed: Boolean(agentHostRuntimePayload.service?.installed),
        running: Boolean(agentHostRuntimePayload.service?.running),
        status: String(agentHostRuntimePayload.service?.status || "not-installed"),
        startMode: agentHostRuntimePayload.service?.start_mode || null,
      },
      python: {
        path: String(agentHostRuntimePayload.python?.path || ""),
        exists: Boolean(agentHostRuntimePayload.python?.exists),
        scapyInstalled: Boolean(agentHostRuntimePayload.python?.scapy_installed),
        pywin32Installed: Boolean(agentHostRuntimePayload.python?.pywin32_installed),
      },
      npcap: {
        installed: Boolean(agentHostRuntimePayload.npcap?.installed),
        serviceStatus: agentHostRuntimePayload.npcap?.service_status || null,
        startType: agentHostRuntimePayload.npcap?.start_type || null,
        pathExists: Boolean(agentHostRuntimePayload.npcap?.path_exists),
      },
      config: {
        backendUrl: String(agentHostRuntimePayload.config?.backend_url || ""),
        enrollmentSecretConfigured: Boolean(agentHostRuntimePayload.config?.enrollment_secret_configured),
        preferredInterface: agentHostRuntimePayload.config?.preferred_interface || null,
      },
      files: {
        agentRoot: String(agentHostRuntimePayload.files?.agent_root || ""),
        agentScript: String(agentHostRuntimePayload.files?.agent_script || ""),
        agentScriptExists: Boolean(agentHostRuntimePayload.files?.agent_script_exists),
        configExample: String(agentHostRuntimePayload.files?.config_example || ""),
        configExampleExists: Boolean(agentHostRuntimePayload.files?.config_example_exists),
        envFile: String(agentHostRuntimePayload.files?.env_file || ""),
        credentialsFile: String(agentHostRuntimePayload.files?.credentials_file || ""),
        credentialsExists: Boolean(agentHostRuntimePayload.files?.credentials_exists),
        queueFile: String(agentHostRuntimePayload.files?.queue_file || ""),
        queueExists: Boolean(agentHostRuntimePayload.files?.queue_exists),
        logFile: String(agentHostRuntimePayload.files?.log_file || ""),
        logExists: Boolean(agentHostRuntimePayload.files?.log_exists),
        lastLogLine: String(agentHostRuntimePayload.files?.last_log_line || ""),
        installAdminScript: String(agentHostRuntimePayload.files?.install_admin_script || ""),
        installServiceScript: String(agentHostRuntimePayload.files?.install_service_script || ""),
        uninstallServiceScript: String(agentHostRuntimePayload.files?.uninstall_service_script || ""),
        startAgentScript: String(agentHostRuntimePayload.files?.start_agent_script || ""),
        smokeTestScript: String(agentHostRuntimePayload.files?.smoke_test_script || ""),
      },
      commands: {
        installAdmin: String(agentHostRuntimePayload.commands?.install_admin || ""),
        uninstallService: String(agentHostRuntimePayload.commands?.uninstall_service || ""),
        smokeTest: String(agentHostRuntimePayload.commands?.smoke_test || ""),
      },
    };
  }
}

function buildLearningCandidates(feedbackItems = [], incidents = [], users = []) {
  const incidentMap = new Map(incidents.map((item) => [item.incident_id, item]));
  const userMap = new Map(users.map((item) => [item.id, item.username]));
  return feedbackItems.map((item) => {
    const incident = incidentMap.get(item.incident_id) || {};
    return {
      feedbackId: item.feedback_id,
      incidentId: item.incident_id || "Unlinked",
      eventId: item.event_id || "Unlinked",
      analystLabel: item.analyst_label || "Uncertain",
      feedbackType: item.feedback_type || "analyst_validation",
      strategy: stageDisplayName(item.model_stage || "", "Enhanced Cross-Domain Detection"),
      reviewCandidate: Boolean(item.add_to_review_pool),
      finetuneCandidate: Boolean(item.add_to_finetune_pool),
      usedForTraining: Boolean(item.used_for_training),
      userId: item.user_id,
      username: item.username || userMap.get(item.user_id) || `User ${item.user_id}`,
      createdAt: item.created_at,
      note: item.feedback_note || "No analyst note provided.",
      incidentStatus: incident.status || "open",
      incidentRisk: Math.round(Number(item.risk_score || incident.risk_score || 0)),
      attackType: item.predicted_label || incident.predicted_label || "Incident",
    };
  });
}

async function loadLearningQueueFromApi() {
  const [feedbackPayload, incidentsPayload, usersPayload, jobsPayload] = await Promise.all([
    tryApi("/ndr/feedback"),
    tryApi("/ndr/incidents"),
    tryApi("/ndr/users"),
    tryApi("/ndr/fine-tuning/jobs"),
  ]);
  if (!feedbackPayload?.items) {
    learningQueueData.items = [];
    learningQueueData.jobs = (jobsPayload?.items || []).map((item) => ({
      jobId: item.job_id,
      scope: learningPoolLabel(item.pool_scope),
      status: String(item.status || "queued").replace(/_/g, " "),
      candidateCount: Number(item.candidate_count || 0),
      requestedVersion: item.requested_model_version || "--",
      outputVersion: item.output_model_version || "--",
      triggeredBy: item.triggered_by_username || `User ${item.triggered_by_user_id || "-"}`,
      createdAt: item.created_at,
      exportId: item.candidate_export_id || "",
    }));
    return;
  }
  learningQueueData.items = buildLearningCandidates(
    feedbackPayload.items,
    incidentsPayload?.items || [],
    usersPayload?.items || [],
  );
  if (jobsPayload?.items) {
    learningQueueData.jobs = jobsPayload.items.map((item) => ({
      jobId: item.job_id,
      scope: learningPoolLabel(item.pool_scope),
      status: String(item.status || "queued").replace(/_/g, " "),
      candidateCount: Number(item.candidate_count || 0),
      requestedVersion: item.requested_model_version || "--",
      outputVersion: item.output_model_version || "--",
      triggeredBy: item.triggered_by_username || `User ${item.triggered_by_user_id || "-"}`,
      createdAt: item.created_at,
      exportId: item.candidate_export_id || "",
    }));
  }
}

function setActiveNav() {
  const page = document.body.dataset.page || "dashboard";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === page);
  });

  const meta = pageMeta[page];
  if (!meta) return;
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");
  if (title) title.textContent = meta.title;
  if (subtitle) subtitle.textContent = meta.subtitle;
}

function initResponsiveSidebar() {
  if (document.body.dataset.page === "login") return;
  const sidebar = document.querySelector(".sidebar");
  const topbarCopy = document.querySelector(".topbar-copy");
  if (!sidebar || !topbarCopy) return;

  if (!sidebar.id) sidebar.id = "appSidebar";

  let toggle = document.getElementById("sidebarToggleBtn");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "sidebarToggleBtn";
    toggle.className = "sidebar-toggle";
    toggle.setAttribute("aria-label", "Toggle navigation rail");
    toggle.setAttribute("aria-controls", sidebar.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M3 5.5h14M3 10h14M3 14.5h14"/>
      </svg>
    `;
    topbarCopy.prepend(toggle);
  }

  let backdrop = document.getElementById("sidebarBackdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "sidebarBackdrop";
    backdrop.className = "sidebar-backdrop";
    document.body.append(backdrop);
  }

  const isCompact = () => window.innerWidth <= 1080;
  const closeSidebar = () => {
    document.body.classList.remove("sidebar-open");
    toggle?.setAttribute("aria-expanded", "false");
  };
  const openSidebar = () => {
    if (!isCompact()) return;
    document.body.classList.add("sidebar-open");
    toggle?.setAttribute("aria-expanded", "true");
  };

  toggle.onclick = () => {
    if (document.body.classList.contains("sidebar-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  backdrop.onclick = closeSidebar;

  sidebar.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      if (isCompact()) closeSidebar();
    });
  });

  window.addEventListener("resize", () => {
    if (!isCompact()) closeSidebar();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

function setCurrentTime() {
  const node = document.getElementById("currentTime");
  if (!node) return;
  const now = new Date();
  node.textContent = now.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function gaugeArc(value, max, radius, startAngle, endAngle) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const angle = startAngle + (endAngle - startAngle) * ratio;
  const polar = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: 120 + radius * Math.cos(rad),
      y: 120 + radius * Math.sin(rad),
    };
  };
  const start = polar(startAngle);
  const end = polar(angle);
  const largeArc = ratio > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function renderRiskGauge() {
  const gauge = document.getElementById("riskGaugePath");
  const value = document.getElementById("riskGaugeValue");
  const label = document.getElementById("riskGaugeLabel");
  const statusChip = document.getElementById("riskGaugeStatusChip");
  if (!gauge || !value || !label) return;
  gauge.setAttribute("d", gaugeArc(dashboardData.riskScore, 100, 86, 180, 360));
  value.textContent = dashboardData.riskScore;
  label.textContent = dashboardData.riskStatus;
  if (statusChip) {
    const tone =
      dashboardData.riskScore >= 90 ? "critical" :
      dashboardData.riskScore >= 60 ? "warn" : "good";
    statusChip.className = `status-chip ${tone}`;
    statusChip.textContent =
      dashboardData.riskScore >= 90 ? "高壓狀態" :
      dashboardData.riskScore >= 60 ? "需要注意" : "資料平穩";
  }

  const container = document.getElementById("riskDrivers");
  if (!container) return;
  container.innerHTML = dashboardData.riskDrivers
    .map(
      (driver) => `
        <div class="risk-bullet">
          <span>${driver.label}</span>
          <strong>${driver.value}</strong>
        </div>
      `,
    )
    .join("");
}

function renderKpis() {
  const root = document.getElementById("heroKpis");
  if (!root) return;
  root.innerHTML = dashboardData.kpis
    .map(
      (kpi) => `
        <article class="kpi-card ${kpi.className}">
          <div class="kpi-label">${kpi.title}</div>
          <div class="kpi-value">${kpi.value}</div>
          <div class="kpi-meta">
            <span>${kpi.metaLeft}</span>
            <strong>${kpi.metaRight}</strong>
          </div>
        </article>
      `,
    )
    .join("");
}

function sentinelIncidentTone(item = {}) {
  const priority = String(item.priority || "").toLowerCase();
  const sla = String(item.sla || "").toLowerCase();
  const risk = Number(item.risk || 0);
  if (priority.includes("p1") || sla.includes("breach") || risk >= 90) return "critical";
  if (priority.includes("p2") || sla.includes("risk") || risk >= 75) return "high";
  if (risk >= 55) return "medium";
  return "low";
}

function sentinelThreatPosture() {
  if (!dashboardData.liveTelemetryLoaded) return { label: "Telemetry Degraded", tone: "critical" };
  if (dashboardData.riskScore >= 90) return { label: "Active Attack Pressure", tone: "critical" };
  if (dashboardData.riskScore >= 65) return { label: "Elevated SOC Load", tone: "high" };
  if (dashboardData.riskScore >= 35) return { label: "Monitored Exposure", tone: "medium" };
  return { label: "Watch Condition", tone: "low" };
}

function sentinelPrimaryIncident() {
  const sorted = [...(dashboardData.incidents || [])].sort((left, right) => {
    const priorityScore = (item) => {
      const priority = String(item.priority || "").toLowerCase();
      if (priority.includes("p1")) return 400;
      if (priority.includes("p2")) return 300;
      if (priority.includes("p3")) return 200;
      return 100;
    };
    return (priorityScore(right) + Number(right.risk || 0)) - (priorityScore(left) + Number(left.risk || 0));
  });
  return sorted[0] || null;
}

function sentinelEntityGraphData() {
  const nodes = [...(dashboardData.topology.nodes || [])].slice(0, 8);
  const links = [...(dashboardData.topology.links || [])].slice(0, 8);
  if (nodes.length) return { nodes, links };

  const fallbackNodes = [];
  const fallbackLinks = [];
  const seen = new Map();
  (dashboardData.recentEvents || []).slice(0, 5).forEach((event, index) => {
    const sourceId = `src-${event.source || index}`;
    const targetId = `dst-${event.destination || index}`;
    if (!seen.has(sourceId)) {
      seen.set(sourceId, true);
      fallbackNodes.push({ id: sourceId, label: event.source || "unknown-src", type: "source", risk: sentinelIncidentTone({ risk: 70 }) });
    }
    if (!seen.has(targetId)) {
      seen.set(targetId, true);
      fallbackNodes.push({ id: targetId, label: event.destination || "unknown-dst", type: "target", risk: sentinelIncidentTone({ risk: 55 }) });
    }
    fallbackLinks.push({
      from: sourceId,
      to: targetId,
      label: event.label || "Suspicious flow",
      severity: String(event.severity || "medium").toLowerCase(),
    });
  });
  return { nodes: fallbackNodes.slice(0, 8), links: fallbackLinks };
}

function renderSentinelEntityGraph() {
  const { nodes, links } = sentinelEntityGraphData();
  if (!nodes.length) {
    return `
      <div class="sentinel-empty">
        <strong>No linked entities yet</strong>
        <span>Waiting for materialized incidents or enriched live events.</span>
      </div>
    `;
  }
  const positioned = nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = node.type === "target" ? 32 : 43;
    return {
      ...node,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
  const byId = new Map(positioned.map((node) => [node.id, node]));
  const svgLinks = links
    .map((link) => {
      const from = byId.get(link.from);
      const to = byId.get(link.to);
      if (!from || !to) return "";
      const tone = String(link.severity || "medium").toLowerCase();
      return `<line class="sentinel-graph-link sentinel-graph-link--${tone}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
    })
    .join("");
  const svgNodes = positioned
    .map((node) => {
      const tone = node.risk || "medium";
      return `
        <g class="sentinel-graph-node sentinel-graph-node--${node.type || "entity"} sentinel-graph-node--${tone}">
          <circle cx="${node.x}" cy="${node.y}" r="${node.type === "target" ? 5.8 : 4.7}"></circle>
          <text x="${node.x}" y="${node.y + 10}" text-anchor="middle">${escapeHtml(String(node.label || node.id).slice(0, 16))}</text>
        </g>
      `;
    })
    .join("");
  return `
    <svg class="sentinel-graph-svg" viewBox="0 0 100 100" role="img" aria-label="Entity relationship graph">
      <defs>
        <radialGradient id="sentinelGraphCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,75,87,.48)"></stop>
          <stop offset="80%" stop-color="rgba(255,75,87,0)"></stop>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="18" fill="url(#sentinelGraphCore)"></circle>
      ${svgLinks}
      ${svgNodes}
    </svg>
  `;
}

function renderSentinelCommandCenter() {
  const root = document.getElementById("sentinelCommandCenter");
  if (!root) return;

  const posture = sentinelThreatPosture();
  const primary = sentinelPrimaryIncident();
  const today = dashboardData.metricsSummary.today || {};
  const reviewMeta = dashboardData.reviewAudit.metadata || {};
  const activeP1 = Number((dashboardData.kpis || [])[0]?.value || 0) || 0;
  const openIncidents = dashboardData.incidents.length;
  const criticalTrend = (dashboardData.trend.critical || []).at(-1) || 0;
  const highTrend = (dashboardData.trend.high || []).at(-1) || 0;
  const driftAffected = Math.max(...(dashboardData.trend.driftAffected || [0]).map((item) => Number(item || 0)));
  const modelStable = dashboardData.adaptation.status === "已連線" && dashboardData.adaptation.currentScore >= dashboardData.adaptation.baselineScore;
  const queue = (dashboardData.incidents || []).slice(0, 6);
  const stream = (dashboardData.recentEvents || []).slice(0, 8);
  const entityCount = sentinelEntityGraphData().nodes.length;
  const topConfidence = stream[0]?.confidence || `${Math.round(dashboardData.adaptation.currentScore * 100)}%`;
  const slaPressure = queue.filter((item) => String(item.sla || "").toLowerCase() !== "healthy").length;
  const timelineItems = [
    ...(dashboardData.ticker || []).slice(0, 4).map((item) => ({
      time: dashboardWindowLabel(),
      title: item.title,
      detail: item.detail,
      tone: item.severity || "medium",
    })),
    ...stream.slice(0, 4).map((item) => ({
      time: item.time,
      title: `${item.source || "--"} -> ${item.destination || "--"}`,
      detail: `${item.label || "Detection"} / confidence ${item.confidence || "--"}`,
      tone: String(item.severity || "medium").toLowerCase(),
    })),
  ].slice(0, 7);

  root.innerHTML = `
    <div class="sentinel-command-layout">
      <div class="sentinel-ops-canvas">
        <header class="sentinel-ops-header">
          <div>
            <p>Threat Command Center</p>
            <h2>現在最該處理哪一件事？</h2>
          </div>
          <div class="sentinel-ops-tools">
            <label>
              <span>Search incident, IP, host, drift</span>
              <input type="text" aria-label="Search incident, IP, host, drift">
            </label>
            <strong class="sentinel-p1-pill">${activeP1 ? "P1 Active" : "P1 Clear"}</strong>
          </div>
        </header>

        <section class="sentinel-context-strip" aria-label="Command context">
          <article class="sentinel-posture-card sentinel-posture-card--${posture.tone}">
            <p>Current posture</p>
            <strong>${posture.label}</strong>
            <span>${slaPressure ? `${slaPressure} incident(s) under SLA pressure.` : "No active SLA breach in the working set."}</span>
          </article>
          <article class="sentinel-posture-card sentinel-posture-card--good">
            <p>Release gates</p>
            <strong>${modelStable ? "Model stable" : "Model watch"}</strong>
            <span>${dashboardData.liveTelemetryLoaded ? "Telemetry connected to backend events." : "Telemetry degraded; validate sensors first."}</span>
          </article>
        </section>

        <div class="sentinel-status-bar sentinel-status-bar--${posture.tone}">
          <div class="sentinel-status-identity">
            <span class="sentinel-live-dot"></span>
            <div>
              <p>Global Threat Status</p>
              <strong>${posture.label}</strong>
            </div>
          </div>
          <div class="sentinel-status-metric">
            <span>Risk</span>
            <strong>${dashboardData.riskScore}</strong>
          </div>
          <div class="sentinel-status-metric">
            <span>P1 Active</span>
            <strong>${activeP1}</strong>
          </div>
          <div class="sentinel-status-metric">
            <span>SLA Pressure</span>
            <strong>${slaPressure}</strong>
          </div>
          <div class="sentinel-status-metric">
            <span>Attack Pressure</span>
            <strong>${criticalTrend + highTrend}</strong>
          </div>
          <div class="sentinel-status-metric">
            <span>AI Model</span>
            <strong class="${modelStable ? "text-good" : "text-warn"}">${modelStable ? "Stable" : "Watch"}</strong>
          </div>
          <div class="sentinel-status-window" id="sentinelWindowToggle"></div>
        </div>

        <section class="sentinel-metric-grid" aria-label="Threat command metrics">
          <article class="sentinel-metric-card sentinel-metric-card--critical">
            <p>Critical incidents</p>
            <strong>${activeP1}</strong>
            <span>${primary ? slaDisplayLabel(primary.sla) : "No containment overdue"}</span>
          </article>
          <article class="sentinel-metric-card sentinel-metric-card--warn">
            <p>Attack confidence</p>
            <strong>${escapeHtml(String(topConfidence))}</strong>
            <span>${primary ? "Primary incident action threshold" : "Derived from current engine state"}</span>
          </article>
          <article class="sentinel-metric-card sentinel-metric-card--info">
            <p>Affected entities</p>
            <strong>${entityCount}</strong>
            <span>${(dashboardData.topology.links || []).length} linked attack routes</span>
          </article>
          <article class="sentinel-metric-card sentinel-metric-card--critical">
            <p>SLA pressure</p>
            <strong>${slaPressure}</strong>
            <span>${slaPressure ? "Escalation required" : "No immediate breach"}</span>
          </article>
        </section>

        <section class="sentinel-command-grid">
      <article class="sentinel-panel sentinel-panel--p1 sentinel-panel--${primary ? sentinelIncidentTone(primary) : "low"}">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Active P1 Incident Panel</p>
            <h2>${primary ? escapeHtml(primary.id) : "No P1 incident currently forcing command override"}</h2>
          </div>
          <span class="sentinel-severity">${primary ? priorityDisplayLabel(primary.priority) : "WATCH"}</span>
        </div>
        <div class="sentinel-p1-body">
          <div>
            <span>Most Dangerous Path</span>
            <strong>${primary ? escapeHtml(primary.chain) : "No active critical chain"}</strong>
            <p>${primary ? `Risk ${primary.risk}/100 · ${primary.events} events · ${escapeHtml(primary.assignee || "Unassigned")}` : "The command panel will break hierarchy as soon as a P1 or breached SLA incident appears."}</p>
          </div>
          <div class="sentinel-countdown">
            <span>SLA State</span>
            <strong>${primary ? slaDisplayLabel(primary.sla) : "CLEAR"}</strong>
            <em>${primary ? "Next decision: contain, escalate, or observe." : "Next decision: continue monitoring."}</em>
          </div>
        </div>
        <div class="sentinel-action-row">
          <a class="sentinel-button sentinel-button--danger" href="response.html">Open Response Runbook</a>
          <a class="sentinel-button" href="incidents.html">Inspect Incident Evidence</a>
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--briefing">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">AI Threat Analyst Briefing</p>
            <h3>Operational decision brief</h3>
          </div>
          <span class="sentinel-ai-chip">AI Analyst</span>
        </div>
        <div class="sentinel-brief">
          <strong>${primary ? `Prioritize ${escapeHtml(primary.id)} before lower queue items.` : "No dominant incident. Keep live stream and drift monitor in watch mode."}</strong>
          <p>${dashboardData.liveTelemetryLoaded ? "Live telemetry is connected. AI recommendations are grounded in platform events, materialization policy, and model runtime status." : "Telemetry is degraded. Do not escalate solely from stale dashboard state."}</p>
        </div>
        <div class="sentinel-brief-list">
          <div><span>Evidence posture</span><strong>${Number(today.materialized_event_count || 0)} materialized today</strong></div>
          <div><span>Human-AI friction</span><strong>${Number(reviewMeta.history_count || 0)} review samples</strong></div>
          <div><span>Recommended move</span><strong>${primary ? "Contain route, assign owner" : "Maintain watch, validate sensors"}</strong></div>
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--queue">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Incident Queue</p>
            <h3>Analyst workload by urgency</h3>
          </div>
          <span>${openIncidents} open</span>
        </div>
        <div class="sentinel-queue">
          ${queue.length ? queue.map((item) => `
            <a class="sentinel-queue-item sentinel-queue-item--${sentinelIncidentTone(item)}" href="incidents.html">
              <span>${escapeHtml(item.id)}</span>
              <strong>${escapeHtml(item.chain)}</strong>
              <em>${priorityDisplayLabel(item.priority)} · ${slaDisplayLabel(item.sla)} · Risk ${item.risk}</em>
            </a>
          `).join("") : `<div class="sentinel-empty"><strong>No open incidents</strong><span>Queue will populate from materialized backend events.</span></div>`}
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--timeline">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Attack Timeline</p>
            <h3>Escalation sequence</h3>
          </div>
          <span>${dashboardWindowLabel()}</span>
        </div>
        <div class="sentinel-timeline">
          ${timelineItems.length ? timelineItems.map((item) => `
            <div class="sentinel-timeline-item sentinel-timeline-item--${String(item.tone || "medium").toLowerCase()}">
              <span>${escapeHtml(item.time)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.detail)}</p>
            </div>
          `).join("") : `<div class="sentinel-empty"><strong>No active attack sequence</strong><span>Timeline is waiting for high-risk alerts or live detections.</span></div>`}
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--drift">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Cross-Domain Drift Monitor</p>
            <h3>Feature alignment pressure</h3>
          </div>
          <span class="${driftAffected > 0 ? "text-warn" : "text-good"}">${driftAffected > 0 ? "Drift Watch" : "Aligned"}</span>
        </div>
        <div class="sentinel-drift-grid">
          <div><span>Drift-affected events</span><strong>${driftAffected}</strong></div>
          <div><span>Current stage</span><strong>${escapeHtml(dashboardData.adaptation.current)}</strong></div>
          <div><span>Shadow threshold</span><strong>${dashboardData.optimization.profile ? Number(dashboardData.optimization.profile.materialization_min_confidence || 0).toFixed(2) : "N/A"}</strong></div>
          <div><span>Decision</span><strong>${driftAffected > 0 ? "Review boundary" : "Proceed"}</strong></div>
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--adaptation">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Adaptation Gain Metrics</p>
            <h3>TransferIDS model advantage</h3>
          </div>
          <span class="${modelStable ? "text-good" : "text-warn"}">${dashboardData.adaptation.status}</span>
        </div>
        <div class="sentinel-adaptation-score">
          <strong>+${dashboardData.adaptation.gain}%</strong>
          <span>Recovered detection performance vs direct transfer baseline</span>
        </div>
        <div class="sentinel-mini-bars">
          <div><span>Direct Transfer</span><em style="--width:${Math.min(100, dashboardData.adaptation.baselineScore * 100)}%"></em><strong>${dashboardData.adaptation.baselineScore.toFixed(2)}</strong></div>
          <div><span>Current Engine</span><em style="--width:${Math.min(100, dashboardData.adaptation.currentScore * 100)}%"></em><strong>${dashboardData.adaptation.currentScore.toFixed(2)}</strong></div>
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--graph">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Entity Relationship Graph</p>
            <h3>Affected entities and attack routes</h3>
          </div>
          <span>${(dashboardData.topology.links || []).length} paths</span>
        </div>
        ${renderSentinelEntityGraph()}
      </article>

      <article class="sentinel-panel sentinel-panel--response">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Response Action Center</p>
            <h3>Next operational action</h3>
          </div>
          <span>Guided IR</span>
        </div>
        <div class="sentinel-response-stack">
          <a class="sentinel-response-action sentinel-response-action--danger" href="response.html">
            <strong>${primary ? "Contain affected route" : "Validate live sensors"}</strong>
            <span>${primary ? "Block route, isolate endpoint, preserve evidence." : "Confirm endpoint agent, Suricata, GeoIP, and backend stream."}</span>
          </a>
          <a class="sentinel-response-action" href="incidents.html">
            <strong>Assign analyst owner</strong>
            <span>Move the highest-risk case into an owned investigation path.</span>
          </a>
          <a class="sentinel-response-action" href="insights.html">
            <strong>Review model boundary</strong>
            <span>Check drift, adaptation gain, and review disagreements before policy changes.</span>
          </a>
        </div>
      </article>

      <article class="sentinel-panel sentinel-panel--stream">
        <div class="sentinel-panel-head">
          <div>
            <p class="sentinel-kicker">Live Detection Stream</p>
            <h3>Real-time evidence feed</h3>
          </div>
          <span>${stream.length} latest</span>
        </div>
        <div class="sentinel-stream">
          ${stream.length ? stream.map((item) => `
            <div class="sentinel-stream-row sentinel-stream-row--${String(item.severity || "medium").toLowerCase()}">
              <span>${escapeHtml(item.time)}</span>
              <strong>${escapeHtml(item.source || "--")} -> ${escapeHtml(item.destination || "--")}</strong>
              <em>${escapeHtml(item.label || "Detection")} · ${escapeHtml(item.confidence || "--")}</em>
            </div>
          `).join("") : `<div class="sentinel-empty"><strong>No live detections written yet</strong><span>The stream only shows backend events, not simulated content.</span></div>`}
        </div>
      </article>
        </section>
      </div>
    </div>
  `;

  const toggle = document.getElementById("sentinelWindowToggle");
  if (toggle) {
    toggle.innerHTML = `
      <button class="${dashboardState.windowMinutes === 15 ? "active" : ""}" data-sentinel-window="15">15m</button>
      <button class="${dashboardState.windowMinutes === 60 ? "active" : ""}" data-sentinel-window="60">1h</button>
      <button class="${dashboardState.windowMinutes === 1440 ? "active" : ""}" data-sentinel-window="1440">24h</button>
    `;
    toggle.querySelectorAll("[data-sentinel-window]").forEach((button) => {
      button.addEventListener("click", async () => {
        const nextWindow = Number(button.dataset.sentinelWindow || 15);
        if (nextWindow === dashboardState.windowMinutes) return;
        dashboardState.windowMinutes = nextWindow;
        await refreshDashboardPage();
      });
    });
  }
}

function safeRatio(numerator, denominator) {
  const left = Number(numerator);
  const right = Number(denominator);
  if (!Number.isFinite(left) || !Number.isFinite(right) || right <= 0) return 0;
  return left / right;
}

function renderMaterializationFunnel() {
  const root = document.getElementById("materializationFunnel");
  const meta = document.getElementById("materializationFunnelMeta");
  if (!root || !meta) return;

  const today = dashboardData.metricsSummary.today || {};
  const allTime = dashboardData.metricsSummary.all_time || {};
  const rawCount = Number(today.raw_observation_count || 0);
  const materializedCount = Number(today.materialized_event_count || 0);
  const incidentCount = Number(today.incident_count || 0);
  const confirmedCount = Number(today.confirmed_attack_count || 0);

  if (rawCount <= 0 && materializedCount <= 0 && incidentCount <= 0) {
    root.innerHTML = `
      <article class="empty-panel">
        <strong>目前沒有可視化的營運漏斗資料</strong>
        <p>只有完成物化的真實觀測才會進入這裡；預覽資料不會污染這張圖。</p>
      </article>
    `;
    meta.innerHTML = "";
    return;
  }

  const stages = [
    {
      label: "原始觀測",
      value: rawCount,
      ratio: 1,
      tone: "volume",
      note: "今日進入偵測管線的原始觀測量",
    },
    {
      label: "物化事件",
      value: materializedCount,
      ratio: safeRatio(materializedCount, rawCount),
      tone: "warn",
      note: "從原始觀測被提升為值得追看的事件",
    },
    {
      label: "已開啟案件",
      value: incidentCount,
      ratio: safeRatio(incidentCount, rawCount),
      tone: "good",
      note: "已聚合成案件、進入操作員工作面板",
    },
  ];

  root.innerHTML = stages
    .map(
      (stage) => `
        <article class="funnel-stage funnel-stage--${stage.tone}">
          <div class="funnel-stage__head">
            <span>${stage.label}</span>
            <strong>${stage.value}</strong>
          </div>
          <div class="funnel-stage__bar">
            <span style="width:${Math.max(stage.ratio * 100, stage.value > 0 ? 6 : 0)}%"></span>
          </div>
          <p>${stage.note}</p>
        </article>
      `,
    )
    .join("");

  meta.innerHTML = `
    <div class="detail-card"><span>今日物化率</span><strong>${percentDisplay(today.materialization_rate || 0)}</strong></div>
    <div class="detail-card"><span>今日已驗證攻擊</span><strong>${confirmedCount}</strong></div>
    <div class="detail-card"><span>累積原始觀測</span><strong>${Number(allTime.raw_observation_count || 0)}</strong></div>
    <div class="detail-card"><span>累積案件數</span><strong>${Number(allTime.incident_count || 0)}</strong></div>
  `;
}

function renderMetricsHealth() {
  const root = document.getElementById("systemHealthCards");
  const trend = document.getElementById("fprTrend");
  const chip = document.getElementById("metricsWindowChip");
  if (!root || !trend) return;

  const today = dashboardData.metricsSummary.today || {};
  const allTime = dashboardData.metricsSummary.all_time || {};
  const integrity = dashboardData.metricsSummary.detection_integrity || {};
  const trendPoints = dashboardData.metricsSummary.trend || [];
  const days = Number(dashboardData.metricsSummary.metadata?.days || trendPoints.length || 7);
  if (chip) chip.textContent = `最近 ${days} 天`;

  if (!trendPoints.length) {
    trend.innerHTML = `
      <article class="empty-panel">
        <strong>尚無誤報率趨勢資料</strong>
        <p>需要先有真實物化與分析師回饋，這張圖才會開始跳動。</p>
      </article>
    `;
  } else {
    const maxRate = Math.max(...trendPoints.map((point) => Number(point.analyst_confirmed_false_positive_rate || 0)), 0.01);
    trend.innerHTML = trendPoints
      .map((point) => {
        const rate = Number(point.analyst_confirmed_false_positive_rate || 0);
        const height = Math.max((rate / maxRate) * 100, rate > 0 ? 12 : 4);
        return `
          <article class="fpr-point">
            <span class="fpr-point__date">${shortDateLabel(point.metric_date)}</span>
            <div class="fpr-point__bar">
              <span style="height:${height}%"></span>
            </div>
            <strong>${percentDisplay(rate)}</strong>
          </article>
        `;
      })
      .join("");
  }

  const confirmedAttackMaterializationRatio = safeRatio(
    Number(today.confirmed_attack_count || 0),
    Number(today.materialized_event_count || 0),
  );

  root.innerHTML = `
    <article class="status-card">
      <span>今日已驗證攻擊物化比例</span>
      <strong>${percentDisplay(confirmedAttackMaterializationRatio)}</strong>
      <p>只看今日被物化的事件中，有多少仍屬已驗證攻擊。</p>
    </article>
    <article class="status-card">
      <span>今日分析師確認誤報率</span>
      <strong>${percentDisplay(today.analyst_confirmed_false_positive_rate || 0)}</strong>
      <p>這裡只算分析師確認的誤報，不拿模型分數冒充產品誤報率。</p>
    </article>
    <article class="status-card">
      <span>累積物化率</span>
      <strong>${percentDisplay(allTime.materialization_rate || 0)}</strong>
      <p>顯示系統把原始觀測過濾成物化事件的整體比例。</p>
    </article>
    <article class="status-card">
      <span>累積告警 / 案件</span>
      <strong>${Number(allTime.alert_count || 0)} / ${Number(allTime.incident_count || 0)}</strong>
      <p>分開顯示告警與案件，避免把兩者混成同一種壓力數字。</p>
    </article>
    <article class="status-card">
      <span>Detection Integrity</span>
      <strong>${integrity.model_available ? "Model Ready" : "Model Unavailable"}</strong>
      <p>${integrity.schema_version || "canonical schema pending"} / ${Number(integrity.feature_count || 0)} required features.</p>
    </article>
    <article class="status-card">
      <span>Telemetry Sources</span>
      <strong>${Object.keys(integrity.source_distribution || {}).length}</strong>
      <p>${Number(integrity.registered_agents || 0)} registered agent(s); validation rejects missing, malformed, unordered, and non-finite features.</p>
    </article>
  `;
}

function renderDistributedSensors() {
  const root = document.getElementById("distributedSensorsPanel");
  const chip = document.getElementById("distributedSensorsChip");
  if (!root) return;

  const summary = dashboardData.distributedSensors || {};
  const agents = Array.isArray(summary.agents) ? summary.agents : [];
  const total = Number(summary.total_agents || agents.length || 0);
  const online = Number(summary.online_agents || 0);
  const offline = Number(summary.offline_agents || Math.max(0, total - online));
  if (chip) {
    chip.className = `status-chip ${total === 0 ? "warn" : online > 0 ? "good" : "critical"}`;
    chip.textContent = total === 0 ? "No sensors enrolled" : `${online}/${total} online`;
  }

  if (!total) {
    root.innerHTML = `
      <article class="empty-panel">
        <strong>No distributed sensors enrolled.</strong>
        <p>Enroll an agent or connect a sensor node.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = `
    <article class="status-card">
      <span>Registered Sensors</span>
      <strong>${total}</strong>
      <p>${online} online / ${offline} offline.</p>
    </article>
    <article class="status-card">
      <span>Observations Received</span>
      <strong>${Number(summary.observations_received || 0)}</strong>
      <p>Canonical flow observations accepted from enrolled sensors.</p>
    </article>
    <article class="status-card">
      <span>Events Created</span>
      <strong>${Number(summary.events_created || 0)}</strong>
      <p>Events materialized only after validation and real ONNX inference.</p>
    </article>
    <article class="status-card">
      <span>Last Seen</span>
      <strong>${formatDateTime(summary.last_seen_at)}</strong>
      <p>No browser packet capture or EDR behavior is claimed in this build.</p>
    </article>
    ${agents
      .slice(0, 4)
      .map(
        (agent) => `
          <article class="status-card">
            <span>${escapeHtml(agent.display_name || agent.hostname || agent.agent_id || "Sensor")}</span>
            <strong class="text-code">${escapeHtml(agent.agent_id || "--")}</strong>
            <p>${escapeHtml(agent.platform || "unknown")} / ${escapeHtml(agent.hostname || "--")} / last seen ${formatDateTime(agent.last_seen_at)}</p>
          </article>
        `,
      )
      .join("")}
  `;
}

function renderThreatActivityStream() {
  const root = document.getElementById("threatActivityStream");
  const chip = document.getElementById("activityStreamChip");
  if (!root) return;

  const events = dashboardData.recentEvents || [];
  if (chip) {
    const attackCount = events.filter((event) => String(event.verdict || "").toLowerCase() === "attack").length;
    chip.className = `status-chip ${events.length ? (attackCount ? "critical" : "good") : "warn"}`;
    chip.textContent = events.length ? `${events.length} real event(s)` : "Awaiting events";
  }

  if (!events.length) {
    root.innerHTML = `
      <article class="empty-panel">
        <strong>No real detection activity yet.</strong>
        <p>Upload canonical traffic data or connect a distributed sensor. This stream does not generate placeholder events.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = events
    .slice(0, 8)
    .map((event) => {
      const severity = String(event.severity || "low").toLowerCase();
      const sourceLabel = event.agentId ? `agent:${event.agentId}` : event.sourceReference || "uploaded_file";
      const verdict = String(event.verdict || "unknown").toLowerCase();
      return `
        <article class="activity-event activity-event--${severity}">
          <div class="activity-event__time">
            <strong>${escapeHtml(event.time || "--")}</strong>
            <span>${escapeHtml(sourceLabel)}</span>
          </div>
          <div class="activity-event__body">
            <strong>${escapeHtml(verdict)}</strong>
            <span>${escapeHtml(event.source || "--")} → ${escapeHtml(event.destination || "--")}</span>
          </div>
          <div class="activity-event__meta">
            <span class="severity-pill severity-${severity}">${event.severityLabel || severityDisplayLabel(severity)}</span>
            <em>confidence ${escapeHtml(event.confidence || "0.00")}</em>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderIngestionFlow() {
  const root = document.getElementById("ingestionFlowPanel");
  const chip = document.getElementById("ingestionFlowChip");
  if (!root) return;

  const summary = dashboardData.metricsSummary || {};
  const today = summary.today || {};
  const allTime = summary.all_time || {};
  const integrity = summary.detection_integrity || {};
  const sensors = dashboardData.distributedSensors || {};
  const sourceDistribution = integrity.source_distribution || {};
  const sourceCount = Object.keys(sourceDistribution).length + (Number(sensors.total_agents || 0) ? 1 : 0);
  const observations = Number(allTime.raw_observation_count || today.raw_observation_count || sensors.observations_received || 0);
  const materialized = Number(allTime.materialized_event_count || today.materialized_event_count || 0);
  const incidents = Number(allTime.incident_count || today.incident_count || dashboardData.incidents.length || 0);
  const modelReady = Boolean(integrity.model_available);

  if (chip) {
    chip.className = `status-chip ${materialized ? "good" : modelReady ? "warn" : "critical"}`;
    chip.textContent = materialized ? `${materialized} event(s)` : modelReady ? "Ready for input" : "Model unavailable";
  }

  if (!observations && !materialized && !Object.keys(sourceDistribution).length && !Number(sensors.total_agents || 0)) {
    root.innerHTML = `
      <article class="empty-panel">
        <strong>No ingestion flow observed.</strong>
        <p>Upload CSV/JSON data, submit Suricata EVE records, or enroll a sensor node to activate this path.</p>
      </article>
    `;
    return;
  }

  const stages = [
    { index: 1, label: "Sources", value: sourceCount || Number(sensors.total_agents || 0), detail: `${Number(sensors.total_agents || 0)} sensor(s), ${Object.keys(sourceDistribution).length} event source(s)` },
    { index: 2, label: "Canonical Validation", value: observations, detail: `${Number(integrity.feature_count || 13)} required features; invalid rows rejected` },
    { index: 3, label: "ONNX Inference", value: modelReady ? "Ready" : "Unavailable", detail: modelReady ? "Real model artifact available" : "No inference fallback is used" },
    { index: 4, label: "Events", value: materialized, detail: "Created only after successful inference" },
    { index: 5, label: "Incidents", value: incidents, detail: "Derived from attack events only" },
  ];

  root.innerHTML = `
    <div class="ingestion-path">
      ${stages
        .map(
          (stage) => `
            <article class="ingestion-stage">
              <span>${stage.index}</span>
              <div>
                <strong>${escapeHtml(stage.label)}</strong>
                <em>${escapeHtml(String(stage.value))}</em>
                <p>${escapeHtml(stage.detail)}</p>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="source-breakdown">
      ${
        Object.keys(sourceDistribution).length
          ? Object.entries(sourceDistribution)
              .map(([source, count]) => `<div><span class="text-code">${escapeHtml(source)}</span><strong>${Number(count || 0)}</strong></div>`)
              .join("")
          : `<div><span>No event source distribution yet</span><strong>0</strong></div>`
      }
    </div>
  `;
}

function renderOptimizationStatus() {
  const root = document.getElementById("optimizationStatusPanel");
  const note = document.getElementById("optimizationStatusNote");
  const chip = document.getElementById("optimizationChip");
  if (!root || !note) return;

  const profile = dashboardData.optimization.profile;
  const metadata = dashboardData.optimization.metadata || {};
  if (!profile) {
    if (chip) {
      chip.className = "status-chip warn";
      chip.textContent = "尚無影子結果";
    }
    root.innerHTML = `
      <article class="empty-panel">
        <strong>目前尚無離線優化結果</strong>
        <p>只有當後端執行 GA shadow study 後，這裡才會顯示建議門檻。</p>
      </article>
    `;
    note.innerHTML = "";
    return;
  }

  if (chip) {
    chip.className = `status-chip ${profile.shadow_mode ? "warn" : "good"}`;
    chip.textContent = profile.shadow_mode ? "Shadow Mode" : "已同步";
  }

  const fitness = metadata.fitness || {};
  root.innerHTML = `
    <article class="status-card">
      <span>套用狀態</span>
      <strong>${profile.shadow_mode ? "僅影子觀察" : "已同步"}</strong>
      <p>這組門檻目前不會直接改寫 live detection path。</p>
    </article>
    <article class="status-card">
      <span>建議物化門檻</span>
      <strong>${Number(profile.materialization_min_confidence || 0).toFixed(2)}</strong>
      <p>低於這個信心值的訊號，不建議直接物化成事件。</p>
    </article>
    <article class="status-card">
      <span>建議攻擊確認門檻</span>
      <strong>${Number(profile.attack_confirmed_threshold || 0).toFixed(2)}</strong>
      <p>高於這個門檻的攻擊判定，較適合直接進入 confirmed path。</p>
    </article>
    <article class="status-card">
      <span>最佳 Fitness</span>
      <strong>${Number(fitness.fitness_score || 0).toFixed(4)}</strong>
      <p>這是影子優化在 attack recovery、誤報率與分歧率上的綜合分數。</p>
    </article>
    <article class="status-card">
      <span>建議時間</span>
      <strong>${profile.created_at ? formatDateTime(profile.created_at) : "尚無時間"}</strong>
      <p>只讀顯示最近一次離線演化輸出的最佳門檻。</p>
    </article>
    <article class="status-card">
      <span>證據融合權重</span>
      <strong>${(profile.evidence_fusion_weights || []).map((item) => Number(item).toFixed(2)).join(" / ") || "--"}</strong>
      <p>顯示目前 shadow profile 對多來源證據融合的建議權重。</p>
    </article>
  `;

  note.innerHTML = `
    <div>
      <span>目前線上策略</span>
      <strong>固定策略 / 未自動套用影子門檻</strong>
      <p class="small-note">這裡只顯示離線演化建議。若要真正切換門檻，必須經過後端明確部署，不會由前端直接修改。</p>
    </div>
    <span>${String(metadata.loaded_from || profile.metadata?.optimizer_mode || "shadow_profile").replaceAll("_", " ")}</span>
    <span>持久化審核樣本：${Number(profile.metadata?.persisted_review_record_count || 0)}</span>
  `;
}

function renderConflictDistribution() {
  const summary = document.getElementById("reviewConflictSummary");
  const root = document.getElementById("reviewConflictDistribution");
  if (!summary || !root) return;

  const metadata = dashboardData.reviewAudit.metadata || {};
  const history = dashboardData.reviewAudit.history || [];
  const severity = metadata.severity_distribution || {};
  const totalHistory = Number(metadata.history_count || history.length || 0);
  const criticalCount = Number(severity.critical || 0);
  const secondReviewCount = history.filter((item) => item.second_review_required).length;

  summary.innerHTML = `
    <article class="status-card">
      <span>持久化審核紀錄</span>
      <strong>${Number(metadata.record_count || 0)}</strong>
      <p>目前 DB 中可被 GA 與審計模組重用的 review records。</p>
    </article>
    <article class="status-card">
      <span>歷史分歧樣本</span>
      <strong>${totalHistory}</strong>
      <p>最近 ${Number(metadata.days || 7)} 天可回放的歷史審核樣本數。</p>
    </article>
    <article class="status-card">
      <span>Critical 分歧</span>
      <strong>${criticalCount}</strong>
      <p>代表 AI 與人工在高信心邊界上仍有強烈不一致。</p>
    </article>
    <article class="status-card">
      <span>升級複核筆數</span>
      <strong>${secondReviewCount}</strong>
      <p>符合 second review 規則的案件數，直接影響操作負載。</p>
    </article>
  `;

  const rows = [
    ["無分歧", Number(severity.none || 0), "good"],
    ["低", Number(severity.low || 0), "warn"],
    ["中", Number(severity.medium || 0), "warn"],
    ["高", Number(severity.high || 0), "critical"],
    ["關鍵", Number(severity.critical || 0), "critical"],
  ];
  const maxValue = Math.max(...rows.map((item) => item[1]), 1);
  root.innerHTML = rows
    .map(
      ([label, value, tone]) => `
        <article class="distribution-row">
          <div class="distribution-row__head">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
          <div class="distribution-row__bar distribution-row__bar--${tone}">
            <span style="width:${value > 0 ? Math.max((value / maxValue) * 100, 8) : 0}%"></span>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderOptimizationHistory() {
  const summary = document.getElementById("optimizationHistorySummary");
  const root = document.getElementById("optimizationHistoryChart");
  if (!summary || !root) return;

  const items = dashboardData.optimizationHistory.items || [];
  if (!items.length) {
    summary.innerHTML = "";
    root.innerHTML = `
      <article class="empty-panel">
        <strong>尚無可回放的 GA 演化紀錄</strong>
        <p>只有實際執行過 shadow evolution 後，這裡才會顯示 fitness 與門檻變化。</p>
      </article>
    `;
    return;
  }

  const latest = items[0];
  const bestFitness = Number(latest.best_fitness?.fitness_score || 0);
  const earliest = items[items.length - 1];
  const improvement = bestFitness - Number(earliest.best_fitness?.fitness_score || 0);

  summary.innerHTML = `
    <div class="detail-card"><span>歷史 run 數</span><strong>${items.length}</strong></div>
    <div class="detail-card"><span>最新最佳 Fitness</span><strong>${bestFitness.toFixed(4)}</strong></div>
    <div class="detail-card"><span>相對首筆變化</span><strong>${improvement >= 0 ? "+" : ""}${improvement.toFixed(4)}</strong></div>
    <div class="detail-card"><span>支撐 review 樣本</span><strong>${Number(latest.best_profile?.metadata?.persisted_review_record_count || 0)}</strong></div>
  `;

  const maxAbs = Math.max(...items.map((item) => Math.abs(Number(item.best_fitness?.fitness_score || 0))), 0.01);
  root.innerHTML = items
    .slice()
    .reverse()
    .map((item, index) => {
      const fitness = Number(item.best_fitness?.fitness_score || 0);
      const width = Math.max((Math.abs(fitness) / maxAbs) * 100, 8);
      return `
        <article class="optimization-history-entry">
          <div class="optimization-history-entry__head">
            <strong>Run ${index + 1}</strong>
            <span>${item.created_at ? formatDateTime(item.created_at) : "未知時間"}</span>
          </div>
          <div class="distribution-row__bar distribution-row__bar--${fitness >= 0 ? "good" : "critical"}">
            <span style="width:${width}%"></span>
          </div>
          <div class="detail-grid detail-grid--dense optimization-history-meta">
            <div class="detail-card"><span>Best Fitness</span><strong>${fitness.toFixed(4)}</strong></div>
            <div class="detail-card"><span>物化門檻</span><strong>${Number(item.best_profile?.materialization_min_confidence || 0).toFixed(2)}</strong></div>
            <div class="detail-card"><span>攻擊確認門檻</span><strong>${Number(item.best_profile?.attack_confirmed_threshold || 0).toFixed(2)}</strong></div>
            <div class="detail-card"><span>審核樣本</span><strong>${Number(item.best_profile?.metadata?.persisted_review_record_count || 0)}</strong></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboardWindowToggle() {
  const root = document.getElementById("dashboardWindowToggle");
  if (!root) return;
  const options = [
    { value: 15, label: "15 分鐘" },
    { value: 60, label: "1 小時" },
    { value: 1440, label: "24 小時" },
  ];
  root.innerHTML = options
    .map(
      (option) => `
        <button
          class="window-toggle-button ${dashboardState.windowMinutes === option.value ? "active" : ""}"
          type="button"
          data-window-minutes="${option.value}"
        >
          ${option.label}
        </button>
      `,
    )
    .join("");

  root.querySelectorAll("[data-window-minutes]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextWindow = Number(button.dataset.windowMinutes || 15);
      if (nextWindow === dashboardState.windowMinutes) return;
      dashboardState.windowMinutes = nextWindow;
      renderDashboardWindowToggle();
      await refreshDashboardPage();
    });
  });
}

function dashboardWindowLabel(minutes = dashboardData.observationWindowMinutes || dashboardState.windowMinutes) {
  if (minutes >= 1440) return "24 小時";
  if (minutes >= 60) return "1 小時";
  return "15 分鐘";
}

function lineColor(severity) {
  if (severity === "critical") return "#ff7b7b";
  if (severity === "high") return "#ff9473";
  if (severity === "medium") return "#f0cd63";
  return "#69b4ff";
}

function topologyMarkerClass(node) {
  const classes = [
    "map-node",
    `map-node--${node.type === "target" ? "target" : "source"}`,
    `map-node--${node.risk || "low"}`,
  ];
  if (node.provenance === "fallback_slot") classes.push("map-node--fallback");
  return classes.join(" ");
}

function topologyProvenanceLabel(node) {
  if (node.provenance === "geoip_city_db") return "真實 GeoIP";
  if (node.provenance === "protected_site_anchor") return "受保護站點錨點";
  if (node.provenance === "fallback_slot") return "未顯示";
  if (node.provenance === "geoip_lookup_failed") return "GeoIP 查詢失敗";
  if (node.provenance === "geoip_db_unavailable") return "GeoIP 資料庫不可用";
  return node.provenanceLabel || "遙測推導";
}

function topologySignalTone(node) {
  if (node.provenance === "fallback_slot") return "text-critical";
  if (node.provenance === "protected_site_anchor") return "text-warn";
  return "text-good";
}

function createTopologyNodeIcon(node) {
  if (!window.L) return null;
  return window.L.divIcon({
    className: "",
    html: `
      <div class="${topologyMarkerClass(node)}">
        <span class="map-node__pulse map-node__pulse--one"></span>
        <span class="map-node__pulse map-node__pulse--two"></span>
        <span class="map-node__inner"></span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -12],
  });
}

function buildTopologyPopup(node) {
  const coordinates = `${Number(node.lat).toFixed(4)}, ${Number(node.lon).toFixed(4)}`;
  return `
    <div class="topology-popup">
      <h4>${node.label}</h4>
      <p>${node.region || "--"} · ${node.type === "source" ? "來源節點" : "目標節點"}</p>
      <div class="topology-popup__meta">
        <div class="topology-popup__row"><span>座標來源</span><strong>${topologyProvenanceLabel(node)}</strong></div>
        <div class="topology-popup__row"><span>網路類型</span><strong>${node.networkType || "--"}</strong></div>
        <div class="topology-popup__row"><span>國家</span><strong>${node.country || "--"}</strong></div>
        <div class="topology-popup__row"><span>經緯度</span><strong>${coordinates}</strong></div>
      </div>
    </div>
  `;
}

function buildTopologyCurve(from, to) {
  const midLat = ((Number(from.lat) + Number(to.lat)) / 2) + (Math.abs(Number(from.lon) - Number(to.lon)) > 40 ? 12 : 4);
  const midLon = (Number(from.lon) + Number(to.lon)) / 2;
  return [
    [Number(from.lat), Number(from.lon)],
    [midLat, midLon],
    [Number(to.lat), Number(to.lon)],
  ];
}

function ensureTopologyMap() {
  const root = document.getElementById("topologyMap");
  if (!root || !window.L) return null;
  if (topologyMapState.map) return topologyMapState.map;

  topologyMapState.map = window.L.map(root, {
    zoomControl: true,
    scrollWheelZoom: true,
    worldCopyJump: true,
  }).setView([22, 112], 2);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(topologyMapState.map);

  topologyMapState.linksLayer = window.L.layerGroup().addTo(topologyMapState.map);
  topologyMapState.markersLayer = window.L.layerGroup().addTo(topologyMapState.map);
  return topologyMapState.map;
}

function renderTopology() {
  const mapRoot = document.getElementById("topologyMap");
  const fallback = document.getElementById("topologyMapFallback");
  const stats = document.getElementById("topologyMeta");
  const sectionChip = document.getElementById("topologySectionChip");
  if (!mapRoot || !stats) return;

  const nodes = dashboardData.topology.nodes || [];
  const links = dashboardData.topology.links || [];
  const sourceNodes = nodes.filter((node) => node.type === "source");
  const targetNodes = nodes.filter((node) => node.type === "target");
  const geoipResolvedCount = nodes.filter((node) => node.provenance === "geoip_city_db").length;
  const anchorCount = nodes.filter((node) => node.provenance === "protected_site_anchor").length;
  const unresolvedPublicSources = Number(dashboardData.topology.unresolvedPublicSources || 0);
  const suppressedLinks = Number(dashboardData.topology.suppressedLinks || 0);
  const globalRegions = new Set(sourceNodes.map((node) => node.region).filter(Boolean));
  const regionalZones = new Set(targetNodes.map((node) => node.region).filter(Boolean));

  if (sectionChip) {
    const tone = !dashboardData.liveTelemetryLoaded ? "critical" : links.length ? "good" : "warn";
    sectionChip.className = `status-chip ${tone}`;
    sectionChip.textContent = !dashboardData.liveTelemetryLoaded
      ? "後端不可用"
      : links.length
        ? `${links.length} 條即時路徑`
        : "目前沒有攻擊路徑";
  }

  if (!window.L) {
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = "互動地圖元件未載入。儀表板仍可顯示其他即時資料，但地圖圖層暫時不可用。";
    }
  } else {
    if (fallback) fallback.hidden = true;
    const map = ensureTopologyMap();
    if (map && topologyMapState.markersLayer && topologyMapState.linksLayer) {
      const signature = JSON.stringify({
        nodes: nodes.map((node) => [node.id, node.lat, node.lon, node.provenance, node.risk]),
        links: links.map((link) => [link.from, link.to, link.label, link.severity]),
      });
      if (signature !== topologyMapState.signature) {
        topologyMapState.signature = signature;
        topologyMapState.markersLayer.clearLayers();
        topologyMapState.linksLayer.clearLayers();

        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        links.forEach((link) => {
          const from = nodeMap.get(link.from);
          const to = nodeMap.get(link.to);
          if (!from || !to) return;
          const route = window.L.polyline(buildTopologyCurve(from, to), {
            color: lineColor(link.severity),
            weight: link.severity === "critical" ? 4 : link.severity === "high" ? 3.2 : 2.6,
            opacity: 0.86,
            dashArray: link.severity === "critical" ? "14 10" : link.severity === "high" ? "10 10" : "8 12",
            className: `topology-arc topology-arc--${link.severity || "medium"}`,
          }).bindPopup(`
            <div class="topology-popup">
              <h4>${link.label}</h4>
              <p>${from.label} → ${to.label}</p>
              <div class="topology-popup__meta">
                <div class="topology-popup__row"><span>嚴重度</span><strong>${String(link.severity || "medium").toUpperCase()}</strong></div>
                <div class="topology-popup__row"><span>案件編號</span><strong>${link.incidentId || "--"}</strong></div>
                <div class="topology-popup__row"><span>風險分數</span><strong>${link.riskScore ?? "--"}</strong></div>
              </div>
            </div>
          `);
          topologyMapState.linksLayer.addLayer(route);
        });

        nodes.forEach((node) => {
          const marker = window.L.marker([Number(node.lat), Number(node.lon)], {
            icon: createTopologyNodeIcon(node),
            keyboard: false,
          }).bindPopup(buildTopologyPopup(node));
          topologyMapState.markersLayer.addLayer(marker);
        });

        if (nodes.length) {
          const bounds = window.L.latLngBounds(nodes.map((node) => [Number(node.lat), Number(node.lon)]));
          map.fitBounds(bounds.pad(0.24), { maxZoom: nodes.length === 1 ? 6 : 4 });
        } else {
          map.setView([22, 112], 2);
        }
      }
    }
  }

  stats.innerHTML = `
    <div class="info-panel">
      <h4>地圖資料模式</h4>
      <div class="mini-list">
        <div class="mini-item"><span>觀測時間窗</span><strong>${dashboardWindowLabel()}</strong></div>
        <div class="mini-item"><span>遙測來源</span><strong class="${dashboardData.liveTelemetryLoaded ? "text-good" : "text-critical"}">${dashboardData.liveTelemetryLoaded ? "後端即時事件" : "備援 / 不可用"}</strong></div>
        <div class="mini-item"><span>地圖資料</span><strong class="${links.length ? "text-good" : "text-warn"}">${links.length ? "平台資料庫事件" : "目前沒有事件"}</strong></div>
        <div class="mini-item"><span>路徑數量</span><strong>${links.length}</strong></div>
        <div class="mini-item"><span>外部來源</span><strong>${sourceNodes.length}</strong></div>
        <div class="mini-item"><span>受保護目標</span><strong>${targetNodes.length}</strong></div>
      </div>
    </div>
    <div class="info-panel">
      <h4>定位來源透明度</h4>
      <div class="mini-list">
        <div class="mini-item"><span>真實 GeoIP</span><strong class="text-good">${geoipResolvedCount}</strong></div>
        <div class="mini-item"><span>站點錨點</span><strong class="text-warn">${anchorCount}</strong></div>
        <div class="mini-item"><span>未解析來源</span><strong class="${unresolvedPublicSources ? "text-critical" : "text-good"}">${unresolvedPublicSources}</strong></div>
        <div class="mini-item"><span>未繪製路徑</span><strong class="${suppressedLinks ? "text-critical" : "text-good"}">${suppressedLinks}</strong></div>
      </div>
    </div>
    <div class="info-panel">
      <h4>區域情勢</h4>
      <div class="legend-list">
        <div class="legend-item"><span><i class="legend-dot" style="background:#ff7b7b"></i>嚴重路徑</span><strong>立即控制</strong></div>
        <div class="legend-item"><span><i class="legend-dot" style="background:#ff9473"></i>高風險路徑</span><strong>快速複核</strong></div>
        <div class="legend-item"><span><i class="legend-dot" style="background:#f0cd63"></i>中風險路徑</span><strong>持續監看</strong></div>
        <div class="legend-item"><span>全球區域</span><strong>${globalRegions.size}</strong></div>
        <div class="legend-item"><span>受保護區</span><strong>${regionalZones.size}</strong></div>
      </div>
    </div>
    <div class="metric-strip">
      <div>
        <span>目前焦點</span>
        <strong>${targetNodes[0]?.region || "等待即時目標"}</strong>
        <p class="small-note">${targetNodes[0]?.provenance === "protected_site_anchor" ? "這是內網或私有位址的受保護站點錨點，不是公開資料集推算的位置。" : "目前地圖只使用平台事件與 GeoIP 解析，不會額外套用公開攻擊資料集。若來源沒有真實座標，平台會直接不顯示。"}</p>
      </div>
      <span>${links[0]?.label || (dashboardData.liveTelemetryLoaded ? "目前沒有啟動中的高風險攻擊路徑。" : "地圖正在等待後端即時遙測。")}</span>
    </div>
  `;
}

function renderThreatTrend() {
  const canvas = document.getElementById("trendCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const trendChip = document.getElementById("trendWindowChip");
  if (trendChip) trendChip.textContent = `最近 ${dashboardWindowLabel()}`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { critical, high, medium, labels } = dashboardData.trend;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { left: 40, right: 18, top: 18, bottom: 34 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...critical, ...high, ...medium) + 4;

  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding.top + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  labels.forEach((label, index) => {
    const x = padding.left + (plotW / (labels.length - 1)) * index;
    ctx.fillStyle = "#6f88a1";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, height - 10);
  });

  const drawLine = (series, color) => {
    ctx.beginPath();
    series.forEach((point, index) => {
      const x = padding.left + (plotW / (series.length - 1)) * index;
      const y = padding.top + plotH - (point / maxVal) * plotH;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.stroke();

    series.forEach((point, index) => {
      const x = padding.left + (plotW / (series.length - 1)) * index;
      const y = padding.top + plotH - (point / maxVal) * plotH;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  drawLine(medium, "#f0cd63");
  drawLine(high, "#ff9473");
  drawLine(critical, "#ff7b7b");

  const legend = document.getElementById("trendLegend");
  if (legend) {
    legend.innerHTML = `
      <div class="legend-item"><span><i class="legend-dot" style="background:#ff7b7b"></i>嚴重告警</span><strong>${critical.at(-1)}</strong></div>
      <div class="legend-item"><span><i class="legend-dot" style="background:#ff9473"></i>高風險告警</span><strong>${high.at(-1)}</strong></div>
      <div class="legend-item"><span><i class="legend-dot" style="background:#f0cd63"></i>中風險告警</span><strong>${medium.at(-1)}</strong></div>
    `;
  }
}

function renderTicker() {
  const root = document.getElementById("threatTicker");
  if (!root) return;
  const tickerChip = document.getElementById("tickerWindowChip");
  if (tickerChip) tickerChip.textContent = dashboardWindowLabel();
  if (!dashboardData.ticker.length) {
    root.innerHTML = `
      <article class="empty-panel">
        <strong>目前沒有新的高風險快報</strong>
        <p>這裡只顯示後端即時事件流中的高風險訊號，不會補外加內容。</p>
      </article>
    `;
    return;
  }
  root.innerHTML = dashboardData.ticker
    .map(
      (item, index) => `
        <button class="ticker-item" type="button" data-ticker-index="${index}">
          <div class="ticker-head">
            <span class="severity-pill severity-${item.severity}">${severityDisplayLabel(item.severity)}</span>
            <span class="small-note">${item.incident}</span>
          </div>
          <h4>${item.title}</h4>
          <p>${item.detail}</p>
        </button>
      `,
    )
    .join("");

  root.querySelectorAll("[data-ticker-index]").forEach((button) => {
    button.addEventListener("click", () => openTickerModal(Number(button.dataset.tickerIndex)));
  });
}

function renderAdaptation() {
  const circle = document.getElementById("boostProgress");
  if (circle) {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const ratio = dashboardData.adaptation.gain / 30;
    circle.style.strokeDasharray = `${circumference}`;
    circle.style.strokeDashoffset = `${circumference * (1 - Math.min(1, ratio))}`;
  }

  const value = document.getElementById("boostValue");
  const status = document.getElementById("boostStatus");
  const summary = document.getElementById("adaptationCopy");
  const meta = document.getElementById("adaptationMeta");

  if (value) value.textContent = `+${dashboardData.adaptation.gain}%`;
  if (status) status.textContent = dashboardData.adaptation.status;
  if (summary) {
    summary.innerHTML = `
      <h3>模型增益狀態</h3>
      <p>目前這條自適應跨域偵測路徑，相比直接轉移基準多救回了 <strong>${dashboardData.adaptation.gain}%</strong> 的判斷表現。儀表板只保留這個最重要的產品訊號。</p>
    `;
  }

  if (meta) {
    meta.innerHTML = `
      <article class="meta-card">
        <span>啟用策略</span>
        <strong>${dashboardData.adaptation.activeStrategy}</strong>
      </article>
      <article class="meta-card">
        <span>對照基線</span>
        <strong>${dashboardData.adaptation.baseline}</strong>
      </article>
      <article class="meta-card">
        <span>目前引擎</span>
        <strong>${dashboardData.adaptation.current}</strong>
      </article>
      <article class="meta-card">
        <span>直接轉移表現</span>
        <strong>${dashboardData.adaptation.baselineScore.toFixed(2)}</strong>
      </article>
      <article class="meta-card">
        <span>自適應表現</span>
        <strong>${dashboardData.adaptation.currentScore.toFixed(2)}</strong>
      </article>
      <article class="meta-card">
        <span>下一步</span>
        <strong>前往分析洞察查看漂移細節</strong>
      </article>
    `;
  }
}

function riskClass(score) {
  if (score >= 90) return "critical";
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function renderTables() {
  const incidents = document.getElementById("incidentRows");
  if (incidents) {
    incidents.innerHTML = dashboardData.incidents.length
      ? dashboardData.incidents
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.id}</td>
            <td>${item.updated}</td>
            <td><span class="priority-pill severity-${priorityTone(item.priority)}">${priorityDisplayLabel(item.priority)}</span></td>
            <td>
              <div class="risk-bar ${riskClass(item.risk)}" style="--width:${item.risk}%"><span></span></div>
              <div class="small-note" style="margin-top:6px">${item.risk} / 100</div>
            </td>
            <td>${item.chain}</td>
            <td>${item.events}</td>
            <td><span class="status-chip ${item.sla === "Breached" ? "critical" : item.sla === "At Risk" ? "warn" : "good"}">${slaDisplayLabel(item.sla)}</span></td>
            <td>${incidentStatusDisplayLabel(item.status)}</td>
          </tr>
        `,
      )
      .join("")
      : '<tr><td colspan="8" class="table-empty">目前沒有已開啟的案件。</td></tr>';
  }

  const events = document.getElementById("eventRows");
  if (events) {
    events.innerHTML = dashboardData.recentEvents.length
      ? dashboardData.recentEvents
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.id}</td>
            <td>${item.time}</td>
            <td>${item.source}</td>
            <td>${item.destination}</td>
            <td>${item.label}</td>
            <td>${item.confidence}</td>
            <td><span class="severity-pill severity-${item.severity.toLowerCase()}">${severityDisplayLabel(item.severity)}</span></td>
            <td>
              <div class="inline-actions">
                <a class="inline-link" href="incidents.html">前往案件</a>
                <a class="inline-link" href="response.html">快速應變</a>
              </div>
            </td>
          </tr>
        `,
      )
      .join("")
      : '<tr><td colspan="8" class="table-empty">目前還沒有任何即時事件寫入平台。</td></tr>';
  }
}

function pushIntakeLog(message, level = "info") {
  const time = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  intakeData.logs.unshift(`[${level.toUpperCase()}] ${time} ${translateUiString(message)}`);
  intakeData.logs = intakeData.logs.slice(0, 16);
  renderTerminal();
}

function renderSourceCards() {
  const root = document.getElementById("sourceCards");
  if (!root) return;
  const visibleSources = currentUserIsAdmin()
    ? intakeData.sources
    : intakeData.sources.filter((source) => source.id !== "suricata" && source.id !== "capture");
  root.innerHTML = visibleSources
    .map(
      (source) => `
        <button class="source-card ${intakeState.source === source.id ? "active" : ""}" type="button" data-source="${source.id}">
          <div class="source-card-head">
            <strong>${source.title}</strong>
            <span class="status-chip ${source.tone || "warn"}">${systemStateDisplayLabel(source.status)}</span>
          </div>
          <p>${source.description}</p>
          <span class="source-card-detail">${source.detail}</span>
        </button>
      `,
    )
    .join("");

  root.querySelectorAll("[data-source]").forEach((button) => {
    button.addEventListener("click", () => {
      intakeState.source = button.dataset.source;
      renderSourceCards();
      renderStrategySummary();
      pushIntakeLog(`資料來源已切換為 ${button.querySelector("strong")?.textContent || button.dataset.source}。`);
    });
  });
}

function renderStrategySummary() {
  const root = document.getElementById("strategySummary");
  const status = document.getElementById("intakeOverallStatus");
  if (status) {
    if (sensorRuntimeData.running) {
      status.className = "status-chip good";
      status.textContent = "即時偵測執行中";
    } else if (intakeState.autoDetectionActive) {
      status.className = "status-chip good";
      status.textContent = "自動監看執行中";
    } else {
      status.className = "status-chip warn";
      status.textContent = "已選擇匯入來源";
    }
  }
  if (!root) return;

  const productLabel = {
    standard: "標準偵測",
    adaptive: "自適應偵測",
    enhanced: "強化偵測",
  }[intakeState.strategy];

  const thesisLabel = {
    standard: "直接轉移基準",
    adaptive: "自適應跨域偵測",
    enhanced: "AE 強化目標輔助微調",
  }[intakeState.strategy];

  const purpose = {
    standard: "適合快速啟動與低複雜度場景。",
    adaptive: "跨域環境的預設平衡方案。",
    enhanced: "最深的適應路徑，適合研究與高要求驗證。",
  }[intakeState.strategy];

  root.innerHTML = `
    <article class="status-card">
      <span>偵測模式</span>
      <strong>${productLabel}</strong>
      <p>${purpose}</p>
    </article>
    <article class="status-card">
      <span>研究對應</span>
      <strong>${thesisLabel}</strong>
      <p>完整對比留在分析洞察頁處理。</p>
    </article>
    <article class="status-card">
      <span>執行脈絡</span>
      <strong>${intakeState.model} / ${intakeState.task}</strong>
      <p>${intakeState.route === "cicids_to_unsw" ? "CICIDS2017 → UNSW-NB15" : "UNSW-NB15 → CICIDS2017"}${intakeState.ae ? " / AE 開啟" : ""}</p>
    </article>
  `;
}

function renderAlignmentRows() {
  const root = document.getElementById("alignmentRows");
  if (!root) return;
  root.innerHTML = intakeData.alignment
    .map(
      ([raw, aligned]) => `
        <div class="alignment-row">
          <div>
            <span class="alignment-label">Raw Feature</span>
            <strong>${raw}</strong>
          </div>
          <span class="alignment-arrow">→</span>
          <div>
            <span class="alignment-label">Aligned Feature</span>
            <strong class="text-code">${aligned}</strong>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderMethodMapping() {
  const root = document.getElementById("methodMapping");
  if (!root) return;
  root.innerHTML = intakeData.methodMapping
    .map(
      (item) => `
        <article class="mapping-card">
          <span>Product Label</span>
          <strong>${item.product}</strong>
          <div class="mapping-divider"></div>
          <p><span class="mapping-key">Thesis method:</span> ${item.thesis}</p>
          <p><span class="mapping-key">Use case:</span> ${item.purpose}</p>
        </article>
      `,
    )
    .join("");
}

function updateLatestAnalysis({ sourceLabel, items = [], observationCount = null } = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  const labelCounts = new Map();
  const incidentIds = new Set();
  let highestConfidence = 0;
  let dominantLabel = "--";
  let dominantCount = 0;

  safeItems.forEach((item) => {
    const label = item.predicted_label || "Unlabeled";
    const nextCount = (labelCounts.get(label) || 0) + 1;
    labelCounts.set(label, nextCount);
    if (item.incident_id) incidentIds.add(item.incident_id);
    highestConfidence = Math.max(highestConfidence, Number(item.confidence_score || 0));
    if (nextCount > dominantCount) {
      dominantCount = nextCount;
      dominantLabel = label;
    }
  });

  intakeResultState.sourceLabel = sourceLabel || intakeResultState.sourceLabel;
  intakeResultState.observations = Math.max(
    Number(observationCount == null ? safeItems.length : observationCount) || 0,
    safeItems.length,
  );
  intakeResultState.events = safeItems.length;
  intakeResultState.incidents = incidentIds.size;
  intakeResultState.dominantLabel = safeItems.length ? dominantLabel : "--";
  intakeResultState.highestConfidence = safeItems.length ? `${Math.round(highestConfidence * 100)}%` : "--";
  intakeResultState.createdAt = new Date().toISOString();
  intakeResultState.items = safeItems.slice(0, 6);
  intakeResultState.labels = [...labelCounts.entries()]
    .map(([label, count]) => ({ label, count, ratio: safeItems.length ? count / safeItems.length : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  renderLatestAnalysis();
}

function renderLatestAnalysis() {
  const status = document.getElementById("latestAnalysisStatus");
  const summary = document.getElementById("latestAnalysisSummary");
  const distribution = document.getElementById("latestAnalysisDistribution");
  const rows = document.getElementById("latestAnalysisRows");

  if (status) {
    status.className = `status-chip ${intakeResultState.events ? "good" : intakeResultState.observations ? "warn" : "warn"}`;
    status.textContent = intakeResultState.events ? "已建立攻擊事件" : intakeResultState.observations ? "已收到流量" : "等待輸入";
  }

  if (summary) {
    summary.innerHTML = `
      <article class="status-card">
        <span>資料來源</span>
        <strong>${intakeResultState.sourceLabel}</strong>
        <p>${intakeResultState.createdAt ? `更新於 ${formatDateTime(intakeResultState.createdAt)}` : "尚未執行任何分析。"}</p>
      </article>
      <article class="status-card">
        <span>收到流量觀測</span>
        <strong>${intakeResultState.observations}</strong>
        <p>包含正常流量與可疑流量；全部都應可在透明帳本中查到。</p>
      </article>
      <article class="status-card">
        <span>新增攻擊事件</span>
        <strong>${intakeResultState.events}</strong>
        <p>只有被判定為需要關注的攻擊流量，才會被建立成事件。</p>
      </article>
      <article class="status-card">
        <span>開啟案件</span>
        <strong>${intakeResultState.incidents}</strong>
        <p>只有真正的攻擊事件才會被聚合進案件佇列。</p>
      </article>
      <article class="status-card">
        <span>${intakeResultState.events ? "主要類型" : "目前判讀"}</span>
        <strong>${intakeResultState.events ? attackLabelDisplay(intakeResultState.dominantLabel) : intakeResultState.observations ? "尚未形成攻擊事件" : "--"}</strong>
        <p>${intakeResultState.events ? "本次分析中最常出現的威脅類型。" : "如果只有正常流量，平台會記錄觀測，但不會硬開事件案件。"}</p>
      </article>
      <article class="status-card">
        <span>最高信心值</span>
        <strong>${intakeResultState.highestConfidence}</strong>
        <p>${intakeResultState.events ? "本輪判斷中最強的一個模型訊號。" : "若沒有攻擊事件，這裡不會假裝出現高信心攻擊。"}</p>
      </article>
    `;
  }

  if (distribution) {
    if (!intakeResultState.labels.length) {
      distribution.innerHTML = `
        <article class="mapping-card">
          <span>判斷分布</span>
          <strong>目前還沒有結果</strong>
          <div class="mapping-divider"></div>
          <p>${intakeResultState.observations ? "本輪沒有形成攻擊事件；平台只保留觀測，不會硬開案件。" : "跑一次 CSV、NetFlow、即時感測或重播資料集後，就會在這裡看到本次結果。"}</p>
        </article>
      `;
    } else {
      distribution.innerHTML = `
        <article class="mapping-card">
          <span>判斷分布</span>
          <strong>最新標籤比例</strong>
          <div class="mapping-divider"></div>
          <div class="analysis-list">
            ${intakeResultState.labels
              .map(
                (item) => `
                  <div class="analysis-row">
                    <div class="analysis-row-head">
                      <span>${attackLabelDisplay(item.label)}</span>
                      <strong>${item.count}</strong>
                    </div>
                    <div class="analysis-bar">
                      <div class="analysis-bar-fill" style="width:${Math.max(item.ratio * 100, 8)}%"></div>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
      `;
    }
  }

  if (rows) {
    rows.innerHTML = intakeResultState.items.length
      ? intakeResultState.items
          .map(
            (item) => `
              <tr>
                <td>${formatClockTime(item.timestamp)}</td>
                <td class="text-code">${item.event_id || "--"}</td>
                <td>${attackLabelDisplay(item.predicted_label || "Unlabeled")}</td>
                <td>${Number(item.confidence_score || 0).toFixed(2)}</td>
                <td class="text-code">${item.incident_id || "--"}</td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="5" class="table-empty">${intakeResultState.observations ? "本輪沒有攻擊事件；平台已保留觀測，但不會硬開事件。" : "目前還沒有偵測結果。"}</td></tr>`;
  }
}

function renderTerminal() {
  const root = document.getElementById("liveTerminal");
  if (!root) return;
  root.innerHTML = intakeData.logs
    .map((line) => `<div class="terminal-line">${line}</div>`)
    .join("");
}

async function refreshDashboardPage() {
  await loadDashboardFromApi();
  renderSentinelCommandCenter();
  renderDashboardWindowToggle();
  renderKpis();
  renderRiskGauge();
  renderMaterializationFunnel();
  renderMetricsHealth();
  renderDistributedSensors();
  renderThreatActivityStream();
  renderIngestionFlow();
  renderConflictDistribution();
  renderTopology();
  renderThreatTrend();
  renderTicker();
  renderAdaptation();
  renderOptimizationStatus();
  renderOptimizationHistory();
  renderTables();
  scheduleLocalizationPass();
}

async function refreshIncidentPage() {
  await loadIncidentEventLedgerFromApi();
  renderIncidentEventLedger();
  renderIncidentCommandCenter();
  scheduleLocalizationPass();
}

async function refreshSettingsPage() {
  await loadSettingsFromApi();
  renderSettingsSummary();
  scheduleLocalizationPass();
}

function applyRealtimeFeedItems(items) {
  if (!Array.isArray(items) || !items.length) return Promise.resolve();
  const page = document.body.dataset.page || "dashboard";

  if (page === "intake") {
    items.forEach((item) => {
      intakeData.logs.unshift(formatRealtimeFeedMessage(item));
    });
    intakeData.logs = intakeData.logs.slice(0, 16);
    renderTerminal();
  }

  const shouldRefreshDashboard = page === "dashboard" && items.some((item) => {
    const type = String(item?.event_type || "");
    return type.includes("event") || type.includes("ingestion") || type.includes("capture") || type.includes("collector");
  });

  if (shouldRefreshDashboard) return refreshDashboardPage();

  const shouldRefreshIncidents = page === "incidents" && items.some((item) => {
    const type = String(item?.event_type || "");
    return type.includes("event") || type.includes("incident") || type.includes("collector") || type.includes("capture");
  });

  if (shouldRefreshIncidents) return refreshIncidentPage();

  const shouldRefreshSettings = page === "settings" && items.some((item) => {
    const type = String(item?.event_type || "");
    return type.includes("collector") || type.includes("capture");
  });

  if (shouldRefreshSettings) return refreshSettingsPage();

  return Promise.resolve();
}

async function pollRealtimeFeed() {
  if (!isProtectedPage() || realtimeState.inFlight || realtimeState.websocketActive) return;
  realtimeState.inFlight = true;
  try {
    const result = await tryApi(`/ndr/realtime/feed?after_seq=${realtimeState.lastSeq}&limit=50`);
    if (!result) return;
    realtimeState.lastSeq = Number(result.latest_seq || realtimeState.lastSeq || 0);
    await applyRealtimeFeedItems(result.items || []);
  } finally {
    realtimeState.inFlight = false;
  }
}

function ensureRealtimePolling() {
  if (realtimeState.timer) return;
  pollRealtimeFeed();
  realtimeState.timer = setInterval(pollRealtimeFeed, 5000);
}

function scheduleRealtimeWebSocketRetry() {
  if (realtimeState.websocketRetryTimer) return;
  realtimeState.websocketRetryTimer = setTimeout(() => {
    realtimeState.websocketRetryTimer = null;
    connectRealtimeWebSocket();
  }, 3000);
}

function connectRealtimeWebSocket() {
  if (!isProtectedPage() || !window.WebSocket || !getToken() || realtimeState.websocket) {
    ensureRealtimePolling();
    return;
  }

  try {
    const socket = new WebSocket(buildWebSocketUrl());
    realtimeState.websocket = socket;

    socket.addEventListener("open", () => {
      realtimeState.websocketActive = true;
      if (realtimeState.timer) {
        clearInterval(realtimeState.timer);
        realtimeState.timer = null;
      }
    });

    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "realtime_feed") {
          realtimeState.lastSeq = Number(payload.latest_seq || realtimeState.lastSeq || 0);
          void applyRealtimeFeedItems(payload.items || []);
        }
      } catch (_error) {
        ensureRealtimePolling();
      }
    });

    socket.addEventListener("close", () => {
      realtimeState.websocketActive = false;
      realtimeState.websocket = null;
      if (socket.code === 1008) {
        logout();
        return;
      }
      ensureRealtimePolling();
      scheduleRealtimeWebSocketRetry();
    });

    socket.addEventListener("error", () => {
      realtimeState.websocketActive = false;
      ensureRealtimePolling();
    });
  } catch (_error) {
    ensureRealtimePolling();
  }
}

function startRealtimeFeed() {
  if (!isProtectedPage()) return;
  connectRealtimeWebSocket();
  ensureRealtimePolling();
}

function getIncidentLifecycleSteps(status) {
  const steps = ["New", "Investigating", "Contained", "Resolved"];
  const activeIndex = steps.indexOf(status);
  return steps
    .map(
      (step, index) => `
        <div class="lifecycle-step ${index <= activeIndex ? "active" : ""}">
          <span>${index + 1}</span>
          <strong>${step}</strong>
        </div>
      `,
    )
    .join("");
}

function filteredIncidents() {
  return incidentData.queue.filter((item) => {
    const matchSearch =
      !incidentState.search ||
      [item.id, item.sourceIp, item.destination, item.label, item.assignee]
        .join(" ")
        .toLowerCase()
        .includes(incidentState.search.toLowerCase());
    const matchPriority = incidentState.priority === "all" || item.priority === incidentState.priority;
    const matchSla = incidentState.sla === "all" || item.sla === incidentState.sla;
    const matchAssignee = incidentState.assignee === "all" || item.assignee === incidentState.assignee;
    const matchStatus = incidentState.status === "all" || item.status === incidentState.status;
    return matchSearch && matchPriority && matchSla && matchAssignee && matchStatus;
  });
}

function renderIncidentQueue() {
  const rows = document.getElementById("incidentQueueRows");
  if (!rows) return;

  const incidents = filteredIncidents().sort((a, b) => b.risk - a.risk);
  if (!incidents.length) {
    rows.innerHTML = '<tr><td colspan="10" class="table-empty">目前沒有案件。平台只顯示真實已建立的事件案件。</td></tr>';
    return;
  }
  rows.innerHTML = incidents
    .map(
      (item) => `
        <tr class="${incidentState.selectedId === item.id ? "row-selected" : ""}" data-incident-row="${item.id}">
          <td class="text-code">${item.id}</td>
          <td><span class="priority-pill severity-${priorityTone(item.priority)}">${priorityDisplayLabel(item.priority)}</span></td>
          <td>
            <div class="risk-bar ${riskClass(item.risk)}" style="--width:${item.risk}%"><span></span></div>
            <div class="small-note" style="margin-top:6px">${item.risk}</div>
          </td>
          <td>${item.label}</td>
          <td>${item.events}</td>
          <td>${item.mode}</td>
          <td>${item.driftCount}</td>
          <td><span class="status-chip ${item.sla === "Breached" ? "critical" : item.sla === "At Risk" ? "warn" : "good"}">${item.sla}</span></td>
          <td>${item.status}</td>
          <td>${item.updated}</td>
        </tr>
      `,
    )
    .join("");

  rows.querySelectorAll("[data-incident-row]").forEach((row) => {
    row.addEventListener("click", () => {
      incidentState.selectedId = row.dataset.incidentRow;
      renderIncidentQueue();
      renderSelectedIncident();
    });
  });
}

function renderSlaWatch() {
  const root = document.getElementById("slaWatchGrid");
  if (!root) return;
  const items = filteredIncidents();
  if (!items.length) {
    root.innerHTML = `
      <article class="empty-panel empty-panel--compact">
        <strong>目前沒有案件</strong>
        <p>當平台抓到事件並完成聚合後，這裡才會顯示時限壓力。</p>
      </article>
    `;
    return;
  }
  const breached = items.filter((i) => i.sla === "Breached").length;
  const atRisk = items.filter((i) => i.sla === "At Risk").length;
  const avgResolution = "--";
  root.innerHTML = `
    <article class="status-card">
      <span>已超時</span>
      <strong>${breached}</strong>
      <p>已超出預期處理時間的案件。</p>
    </article>
    <article class="status-card">
      <span>接近超時</span>
      <strong>${atRisk}</strong>
      <p>若不優先處理，接下來最可能超時的案件。</p>
    </article>
    <article class="status-card">
      <span>平均處置時間</span>
      <strong>${avgResolution}</strong>
      <p>目前後端尚未提供可稽核的平均處置時間統計。</p>
    </article>
  `;
}

function renderCandidateQueue() {
  const root = document.getElementById("candidateQueue");
  if (!root) return;
  const items = filteredIncidents()
    .filter((i) => i.priority === "P1" || i.sla !== "Healthy")
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 3);
  if (!items.length) {
    root.innerHTML = `
      <article class="empty-panel empty-panel--compact">
        <strong>目前沒有需要優先處理的案件</strong>
        <p>一旦出現高風險或接近超時的案件，這裡會自動浮上來。</p>
      </article>
    `;
    return;
  }
  root.innerHTML = items
    .map(
      (item) => `
        <button class="candidate-item" type="button" data-candidate="${item.id}">
          <div class="candidate-head">
            <span class="priority-pill severity-${priorityTone(item.priority)}">${priorityDisplayLabel(item.priority)}</span>
            <span class="small-note">${item.sla}</span>
          </div>
          <h4>${item.id} · ${item.label}</h4>
          <p>${item.sourceIp} -> ${item.destination} · ${item.events} 筆事件 · ${item.modeCode}</p>
        </button>
      `,
    )
    .join("");

  root.querySelectorAll("[data-candidate]").forEach((button) => {
    button.addEventListener("click", () => {
      incidentState.selectedId = button.dataset.candidate;
      renderIncidentQueue();
      renderSelectedIncident();
    });
  });
}

function renderSelectedIncident() {
  const incident = incidentData.queue.find((i) => i.id === incidentState.selectedId) || incidentData.queue[0];
  const heading = document.getElementById("selectedIncidentHeading");
  const chip = document.getElementById("selectedIncidentStatusChip");
  const summary = document.getElementById("selectedIncidentSummary");
  const timeline = document.getElementById("incidentTimelineRows");
  const lifecycle = document.getElementById("lifecycleStrip");
  const reasons = document.getElementById("correlationReasons");

  if (!incident) {
    if (heading) heading.textContent = "尚未選擇案件";
    if (chip) {
      chip.className = "status-chip warn";
      chip.textContent = "等待案件";
    }
    if (summary) {
      summary.innerHTML = '<article class="empty-panel"><strong>目前沒有案件細節</strong><p>當事件被寫入並聚合成 incident 後，這裡才會顯示來源、目標、攻擊型態與時間線。</p></article>';
    }
    if (timeline) {
      timeline.innerHTML = '<tr><td colspan="5" class="table-empty">目前沒有時間線資料。</td></tr>';
    }
    if (lifecycle) lifecycle.innerHTML = "";
    if (reasons) {
      reasons.innerHTML = '<article class="empty-panel"><strong>目前沒有可解釋的分組依據</strong><p>因為平台還沒有任何 incident 被建立。</p></article>';
    }
    return;
  }

  if (heading) heading.textContent = `已選案件：${incident.id}`;
  if (chip) {
    chip.className = `status-chip ${incident.sla === "Breached" ? "critical" : incident.sla === "At Risk" ? "warn" : "good"}`;
    chip.textContent = `${incident.status} / ${incident.sla}`;
  }

  if (summary) {
    summary.innerHTML = `
      <div class="detail-card"><span>案件編號</span><strong>${incident.id}</strong></div>
      <div class="detail-card"><span>來源 IP</span><strong class="text-code">${incident.sourceIp}</strong></div>
      <div class="detail-card"><span>目標位置</span><strong class="text-code">${incident.destination}:${incident.destinationPort}</strong></div>
      <div class="detail-card"><span>攻擊類型</span><strong>${incident.label}</strong></div>
      <div class="detail-card"><span>標籤解釋</span><strong>${attackLabelDescription(incident.label)}</strong></div>
      <div class="detail-card"><span>事件數量</span><strong>${incident.events}</strong></div>
      <div class="detail-card"><span>偵測方式</span><strong>${incident.mode}</strong></div>
      <div class="detail-card"><span>模型階段</span><strong>${incident.modeCode}</strong></div>
    `;
  }

  if (timeline) {
    timeline.innerHTML = incident.timeline
      .map(
        (step) => `
          <tr>
            <td>${step.time}</td>
            <td class="text-code">${step.event}</td>
            <td>${step.action}</td>
            <td>${step.confidence}</td>
            <td>${step.note}</td>
          </tr>
        `,
      )
      .join("");
  }

  if (lifecycle) lifecycle.innerHTML = getIncidentLifecycleSteps(incident.status);

  if (reasons) {
    reasons.innerHTML = `
      <article class="status-card">
        <span>相同路徑</span>
        <strong>${incident.sourceIp} -> ${incident.destination}:${incident.destinationPort}</strong>
        <p>這批事件都沿著相同來源到目標路徑發生。</p>
      </article>
      <article class="status-card">
        <span>相同攻擊型態</span>
        <strong>${incident.label}</strong>
        <p>分組事件的主攻擊標籤一致，因此被視為同一案件。</p>
      </article>
      <article class="status-card">
        <span>相近時間窗</span>
        <strong>${incident.events} 筆關聯事件</strong>
        <p>事件在接近的時間內發生，因此不需要拆成多個案件。</p>
      </article>
    `;
  }
}

function getFilteredIncidentEventLedgerItems() {
  return incidentEventLedgerState.items.filter((item) => {
    if (incidentEventLedgerFilterState.mode === "verified" && item.verificationTier !== "confirmed_attack") {
      return false;
    }
    if (incidentEventLedgerFilterState.mode === "high_conf" && Number(item.confidence || 0) < 0.8) {
      return false;
    }
    if (incidentEventLedgerFilterState.mode === "linked_incident" && (!item.incidentId || item.incidentId === "--")) {
      return false;
    }
    if (!incidentEventLedgerFilterState.search) return true;
    const haystack = [
      item.eventId,
      item.sourceIp,
      item.destinationIp,
      item.label,
      item.incidentId,
      item.sourceType,
      verificationTierDisplayLabel(item.verificationTier),
      analystSuggestionDisplayLabel(item.analystSuggestion),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(incidentEventLedgerFilterState.search.toLowerCase());
  });
}

function incidentEventCommandTone(item) {
  const confidence = Number(item?.confidence || 0);
  const tier = String(item?.verificationTier || "").trim().toLowerCase();
  const suggestion = String(item?.analystSuggestion || "").trim().toLowerCase();
  if (tier === "confirmed_attack" || (suggestion === "attack" && confidence >= 0.9)) return "critical";
  if (tier === "probable_attack" || confidence >= 0.85) return "high";
  if (tier === "suspicious_attack" || confidence >= 0.72) return "medium";
  return "low";
}

function incidentEventPriorityScore(item) {
  const tier = String(item?.verificationTier || "").trim().toLowerCase();
  const tierScore = {
    confirmed_attack: 5,
    probable_attack: 4,
    suspicious_attack: 3,
    needs_review: 2,
    benign: 0,
  }[tier] ?? 1;
  const linkedBonus = item?.incidentId && item.incidentId !== "--" ? 1 : 0;
  return tierScore * 100 + Number(item?.confidence || 0) * 10 + linkedBonus;
}

function renderIncidentCommandCenter() {
  const queue = document.getElementById("incidentCommandQueue");
  const detail = document.getElementById("incidentCommandDetail");
  const actions = document.getElementById("incidentCommandActions");
  const summary = document.getElementById("incidentCommandSummary");
  const status = document.getElementById("incidentCommandStatus");
  const tierChip = document.getElementById("incidentCommandTier");
  if (!queue || !detail || !actions) return;

  const filteredItems = getFilteredIncidentEventLedgerItems().sort((a, b) => incidentEventPriorityScore(b) - incidentEventPriorityScore(a));
  const allItems = incidentEventLedgerState.items;
  const confirmedCount = allItems.filter((item) => item.verificationTier === "confirmed_attack").length;
  const linkedCount = allItems.filter((item) => item.incidentId && item.incidentId !== "--").length;
  const highConfidenceCount = allItems.filter((item) => Number(item.confidence || 0) >= 0.8).length;
  const reviewCount = allItems.filter((item) => item.analystSuggestion === "review").length;

  if (summary) {
    summary.innerHTML = [
      ["Confirmed", confirmedCount],
      ["High Conf", highConfidenceCount],
      ["Linked", linkedCount],
      ["Review", reviewCount],
    ]
      .map((item) => `<div class="operator-stat"><span>${item[0]}</span><strong>${item[1]}</strong></div>`)
      .join("");
  }

  if (!filteredItems.length) {
    if (status) {
      status.textContent = allItems.length
        ? "目前篩選條件下沒有事件，請放寬搜尋或切回全部。"
        : "後端目前沒有回傳已達決策門檻的攻擊事件。";
    }
    if (tierChip) {
      tierChip.className = "operator-badge operator-badge--warn";
      tierChip.textContent = "等待事件";
    }
    queue.innerHTML = '<div class="operator-empty"><strong>No actionable events</strong><span>No fake queue items are generated. Only `/api/events` records returned by the backend appear here.</span></div>';
    detail.innerHTML = '<div class="operator-empty"><strong>Waiting for real backend events</strong><span>After uploaded traffic passes validation and inference, the highest-priority event will appear here.</span></div>';
    actions.innerHTML = '<div class="operator-empty"><strong>No response actions</strong><span>No guided response is generated without a real backend event.</span></div>';
    return;
  }

  const selected =
    filteredItems.find((item) => item.eventId === incidentEventLedgerFilterState.selectedEventId) ||
    filteredItems[0];
  incidentEventLedgerFilterState.selectedEventId = selected.eventId;
  const selectedTone = incidentEventCommandTone(selected);
  const responseHref =
    selected.incidentId && selected.incidentId !== "--"
      ? `response.html?incident_id=${encodeURIComponent(selected.incidentId)}`
      : "response.html";

  if (status) {
    status.textContent = `最後同步：${formatDateTime(incidentEventLedgerState.lastUpdated)}。目前顯示 ${filteredItems.length} 筆可處置事件。`;
  }
  if (tierChip) {
    tierChip.className = `operator-badge operator-badge--${selectedTone === "critical" ? "critical" : selectedTone === "low" ? "good" : "warn"}`;
    tierChip.textContent = verificationTierDisplayLabel(selected.verificationTier);
  }

  queue.innerHTML = filteredItems
    .slice(0, 12)
    .map((item) => {
      const tone = incidentEventCommandTone(item);
      const active = item.eventId === selected.eventId ? " is-active" : "";
      return `
        <button class="operator-queue-item operator-queue-item--${tone}${active}" type="button" data-command-event="${escapeHtml(item.eventId)}">
          <span>${formatDateTime(item.timestamp)} / ${verificationTierDisplayLabel(item.verificationTier)}</span>
          <strong>${escapeHtml(item.label)}</strong>
          <em>${escapeHtml(item.sourceIp)} -> ${escapeHtml(item.destinationIp)} / conf ${escapeHtml(item.confidence)}</em>
        </button>
      `;
    })
    .join("");

  detail.innerHTML = `
    <div class="operator-detail-card operator-detail-card--${selectedTone}">
      <div>
        <p class="operator-kicker">Selected Event</p>
        <h4>${escapeHtml(selected.label)}</h4>
        <p>${escapeHtml(selected.decisionSummary || selected.analystGuidance || "後端尚未提供更完整的決策摘要。")}</p>
      </div>
      <div class="operator-detail-grid">
        <div class="operator-field"><span>Event ID</span><strong>${escapeHtml(selected.eventId)}</strong></div>
        <div class="operator-field"><span>Source</span><strong>${escapeHtml(selected.sourceIp)}</strong></div>
        <div class="operator-field"><span>Target</span><strong>${escapeHtml(selected.destinationIp)}</strong></div>
        <div class="operator-field"><span>Confidence</span><strong>${escapeHtml(selected.confidence)}</strong></div>
        <div class="operator-field"><span>Incident</span><strong>${escapeHtml(selected.incidentId)}</strong></div>
        <div class="operator-field"><span>Suggestion</span><strong>${analystSuggestionDisplayLabel(selected.analystSuggestion)}</strong></div>
        <div class="operator-field"><span>Source Type</span><strong>${escapeHtml(selected.sourceType)}</strong></div>
        <div class="operator-field"><span>Tier</span><strong>${verificationTierDisplayLabel(selected.verificationTier)}</strong></div>
      </div>
      <div>
        <p class="operator-kicker">Follow-up Checks</p>
        <ul class="operator-followups">
          ${(selected.followupChecks || []).length
            ? selected.followupChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
            : "<li>後端目前沒有附加 follow-up checks。</li>"}
        </ul>
      </div>
    </div>
  `;

  actions.innerHTML = `
    <a class="operator-action operator-action--danger" href="${responseHref}">
      <em>Decision Path</em>
      <strong>${selected.incidentId && selected.incidentId !== "--" ? "進入應變中心" : "前往應變中心"}</strong>
      <span>${selected.incidentId && selected.incidentId !== "--" ? `開啟 ${escapeHtml(selected.incidentId)} 的處置流程。` : "這筆事件尚未關聯案件，先回應變中心查看目前可處置案件。"}</span>
    </a>
    <button class="operator-action operator-action--good" type="button" data-incident-status="False Positive">
      <em>Analyst Decision</em>
      <strong>Mark False Positive</strong>
      <span>Record the case as benign analyst-reviewed noise without changing model metrics directly.</span>
    </button>
    <button class="operator-action" type="button" data-incident-status="Investigating">
      <em>Escalation</em>
      <strong>Escalate to Investigation</strong>
      <span>Move the linked incident into active analyst investigation.</span>
    </button>
    <button class="operator-action operator-action--danger" type="button" data-incident-status="Contained">
      <em>Containment</em>
      <strong>Start Containment</strong>
      <span>Mark containment workflow as started. No autonomous firewall action is executed.</span>
    </button>
    <a class="operator-action" href="reports.html">
      <em>Evidence</em>
      <strong>Export Evidence</strong>
      <span>Open the report workspace for real event and incident evidence.</span>
    </a>
  `;

  queue.onclick = (event) => {
    const item = event.target.closest("[data-command-event]");
    if (!item) return;
    incidentEventLedgerFilterState.selectedEventId = item.dataset.commandEvent || "";
    renderIncidentCommandCenter();
  };

  actions.onclick = async (event) => {
    const button = event.target.closest("[data-incident-status]");
    if (!button) return;
    let incidentId = selected.incidentId;
    if (!incidentId || incidentId === "--") {
      const created = await tryApi(`/incidents/from-event/${encodeURIComponent(selected.eventId)}`, { method: "POST" });
      incidentId = created?.incident?.incident_id || unwrapApiData(created)?.incident?.incident_id || "--";
    }
    if (!incidentId || incidentId === "--") return;
    await tryApi(`/incidents/${encodeURIComponent(incidentId)}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: button.dataset.incidentStatus }),
    });
    await loadIncidentEventLedgerFromApi();
    renderIncidentEventLedger();
    renderIncidentCommandCenter();
  };
}

function renderIncidentEventLedger() {
  const rows = document.getElementById("incidentEventRows");
  const status = document.getElementById("incidentEventLedgerStatus");
  const note = document.getElementById("incidentEventLedgerNote");
  if (!rows) return;
  const filteredItems = getFilteredIncidentEventLedgerItems();

  if (status) {
    status.className = `status-chip ${filteredItems.length ? "good" : "warn"}`;
    status.textContent = filteredItems.length ? `攻擊事件 ${filteredItems.length} 筆` : "目前沒有攻擊事件";
  }

  if (note) {
    note.textContent = incidentEventLedgerState.items.length
      ? `最後更新：${formatDateTime(incidentEventLedgerState.lastUpdated)}。這裡只列出真實後端已建立，且已達到決策門檻的攻擊事件。`
      : "平台目前還沒有任何攻擊事件。這代表目前沒有任何流量通過多證據決策門檻。";
  }

  rows.innerHTML = filteredItems.length
    ? filteredItems
        .map(
          (item) => `
            <tr>
              <td>${formatDateTime(item.timestamp)}</td>
              <td class="text-code">${item.eventId}</td>
              <td class="text-code">${item.sourceIp}</td>
              <td class="text-code">${item.destinationIp}</td>
              <td>${item.label}</td>
              <td><span class="priority-pill severity-${analystSuggestionTone(item.analystSuggestion)}" title="${escapeHtml([analystSuggestionDisplayLabel(item.analystSuggestion), verificationTierDisplayLabel(item.verificationTier), item.analystGuidance, ...(item.followupChecks || [])].filter(Boolean).join('｜'))}">${analystSuggestionDisplayLabel(item.analystSuggestion)}</span></td>
              <td>${item.confidence}</td>
              <td class="text-code">${item.incidentId}</td>
              <td>${item.sourceType}</td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="9" class="table-empty">目前沒有符合篩選條件的攻擊事件。</td></tr>';
}

function renderResponseContext() {
  const context = document.getElementById("responseContextGrid");
  const chip = document.getElementById("responseContextChip");
  if (chip) chip.textContent = `${responseState.attackType} / ${responseState.severity}`;
  if (!context) return;
  context.innerHTML = `
    <div class="detail-card"><span>Incident ID</span><strong>${responseState.incidentId}</strong></div>
    <div class="detail-card"><span>Risk Score</span><strong>${responseState.riskScore} / 100</strong></div>
    <div class="detail-card"><span>Attack Type</span><strong>${responseState.attackType}</strong></div>
    <div class="detail-card"><span>驗證層級</span><strong>${verificationTierDisplayLabel(responseState.verificationTier)}</strong></div>
    <div class="detail-card"><span>標籤解釋</span><strong>${attackLabelDescription(responseState.attackType)}</strong></div>
    <div class="detail-card"><span>Events</span><strong>${responseState.events}</strong></div>
    <div class="detail-card"><span>Detection Strategy</span><strong>${responseState.detectionMode}</strong></div>
    <div class="detail-card"><span>Drift Impact</span><strong>${responseState.driftImpact}</strong></div>
  `;
}

function renderWorkflowStatus() {
  const root = document.getElementById("workflowStatusGrid");
  if (!root) return;
  root.innerHTML = `
    <article class="status-card">
      <span>案件類型</span>
      <strong>${responseState.attackType}</strong>
      <p>目前這起案件的主要威脅類型。</p>
    </article>
    <article class="status-card">
      <span>處置狀態</span>
      <strong>${responseState.status}</strong>
      <p>目前處置流程進行到哪一個階段。</p>
    </article>
    <article class="status-card">
      <span>處理時限</span>
      <strong>${responseState.sla}</strong>
      <p>距離超過預期處理時限還剩多少時間。</p>
    </article>
    <article class="status-card">
      <span>下一步建議</span>
      <strong>${responseState.nextStep}</strong>
      <p>此刻最適合採取的下一個控制或調查動作。</p>
    </article>
  `;
}

function applyAdvisorReviewState(review, fallback = {}) {
  responseState.advisor = {
    ai_recommendation_label: review?.ai_recommendation_label || fallback.ai_recommendation_label || null,
    ai_confidence: review?.ai_confidence ?? fallback.ai_confidence ?? null,
    analysis_brief: review?.analysis_brief || fallback.analysis_brief || "",
    suggested_action: review?.suggested_action || fallback.suggested_action || "monitor",
    analyst_decision_label: review?.analyst_decision_label || fallback.analyst_decision_label || null,
    disagreement_flag: Boolean(review?.disagreement_flag),
    disagreement_severity: review?.disagreement_severity || "none",
    second_review_required: Boolean(review?.second_review_required),
    final_resolution_label: review?.final_resolution_label || null,
    final_reviewer: review?.final_reviewer || null,
    final_override_reason: review?.final_override_reason || null,
    metadata: review?.metadata || {},
  };
}

function buildAdvisorBriefDisplay(review, analystDecisionLabel) {
  const aiLabel = review?.ai_recommendation_label || "needs_review";
  const confidence = Number(review?.ai_confidence || 0);
  const eventCount = Number(review?.metadata?.incident_event_count || responseState.events || 0);
  const leadEventId = review?.metadata?.lead_event_id || responseState.primaryEventId || "主要事件";
  const preview = calculateReviewDisagreementPreview(aiLabel, analystDecisionLabel, confidence);

  if (preview.second_review_required) {
    return `AI 目前以 ${confidence.toFixed(2)} 信心判為${reviewDecisionLabelDisplay(aiLabel)}，且與目前人工判斷不一致。建議先升級第二層複核，再比對 ${leadEventId} 與關聯 ${eventCount} 筆事件。`;
  }
  if (aiLabel === "attack" && confidence >= 0.85) {
    return `AI 目前以 ${confidence.toFixed(2)} 信心判為攻擊，建議優先執行立即控制並保留 ${leadEventId} 的證據鏈。`;
  }
  if (aiLabel === "attack") {
    return `AI 偏向判為攻擊，但目前證據還不夠乾淨。建議先補強上下文，再決定是否直接控制。`;
  }
  if (aiLabel === "benign") {
    return `AI 目前偏向判為正常，建議持續監看並確認沒有新的關聯事件進來。`;
  }
  return `AI 目前仍落在待複核區，建議把人工作業集中在關聯事件與上下文比對。`;
}

function renderResponseAdvisor() {
  const root = document.getElementById("aiInsightsCard");
  const banner = document.getElementById("advisorDisagreementBanner");
  const chip = document.getElementById("responseAdvisorChip");
  if (!root || !banner) return;

  const review = responseState.advisor || {};
  const analystDecisionLabel = review.analyst_decision_label || null;
  const preview = calculateReviewDisagreementPreview(
    review.ai_recommendation_label,
    analystDecisionLabel,
    review.ai_confidence,
  );
  const suggestedAction = review.suggested_action || "monitor";
  const brief = buildAdvisorBriefDisplay(review, analystDecisionLabel);

  if (chip) {
    const chipTone = preview.second_review_required
      ? "critical"
      : suggestedActionTone(suggestedAction);
    chip.className = `status-chip ${chipTone}`;
    chip.textContent = preview.second_review_required
      ? "需要高級複核"
      : suggestedActionDisplayLabel(suggestedAction);
  }

  banner.innerHTML = preview.second_review_required
    ? `
      <div class="advisor-banner advisor-banner--critical">
        <strong>需要高級複核</strong>
        <p>AI 與目前人工判斷出現高信心分歧，請先升級第二層複核，再決定是否結案或解除控制。</p>
      </div>
    `
    : preview.disagreement_flag
      ? `
        <div class="advisor-banner advisor-banner--warn">
          <strong>存在決策分歧</strong>
          <p>目前 AI 與人工判斷不一致，但尚未達到強制升級門檻。建議先補充上下文後再確認。</p>
        </div>
      `
      : "";

  root.innerHTML = `
    <div class="advisor-insight-card__head">
      <div>
        <span class="eyebrow">AI Insights</span>
        <h3>AI 輔助判讀</h3>
      </div>
      <span class="priority-pill severity-${preview.second_review_required ? "critical" : suggestedActionTone(suggestedAction)}">${suggestedActionDisplayLabel(suggestedAction)}</span>
    </div>
    <div class="advisor-chip-row">
      <span class="status-chip ${review.ai_recommendation_label === "attack" ? "critical" : review.ai_recommendation_label === "benign" ? "good" : "warn"}">AI：${reviewDecisionLabelDisplay(review.ai_recommendation_label)}</span>
      <span class="status-chip ${analystDecisionLabel ? "warn" : "good"}">人工：${reviewDecisionLabelDisplay(analystDecisionLabel)}</span>
      <span class="status-chip ${disagreementSeverityTone(preview.disagreement_severity)}">${disagreementSeverityDisplayLabel(preview.disagreement_severity)}</span>
    </div>
    <p class="advisor-brief">${escapeHtml(brief)}</p>
    ${review.analysis_brief ? `<p class="small-note">${escapeHtml(review.analysis_brief)}</p>` : ""}
    <div class="detail-grid detail-grid--dense advisor-metadata-grid">
      <div class="detail-card"><span>AI 信心值</span><strong>${review.ai_confidence != null ? Number(review.ai_confidence).toFixed(2) : "--"}</strong></div>
      <div class="detail-card"><span>建議動作</span><strong>${suggestedActionDisplayLabel(suggestedAction)}</strong></div>
      <div class="detail-card"><span>主要事件</span><strong class="text-code">${review.metadata?.lead_event_id || responseState.primaryEventId || "--"}</strong></div>
      <div class="detail-card"><span>最終覆核</span><strong>${review.final_reviewer || "尚未覆核"}</strong></div>
    </div>
    <div class="dual-actions advisor-actions">
      <button class="primary-button response-decision-button" type="button" data-action-title="${suggestedActionNextStep(suggestedAction)}">${suggestedActionButtonLabel(suggestedAction)}</button>
      <span class="small-note">${review.final_override_reason ? escapeHtml(review.final_override_reason) : "目前沒有人工覆蓋原因記錄。"}</span>
    </div>
  `;
}

function renderDecisionHistory() {
  const summary = document.getElementById("decisionHistorySummary");
  const timeline = document.getElementById("decisionHistoryTimeline");
  if (!summary || !timeline) return;

  const entries = Array.isArray(responseState.reviewHistory) ? responseState.reviewHistory : [];
  if (!entries.length) {
    summary.innerHTML = "";
    timeline.innerHTML = `
      <article class="empty-panel">
        <strong>目前還沒有可回放的審核歷史</strong>
        <p>只有當案件真的經過 AI 建議或人工覆核後，這裡才會留下時間序列紀錄。</p>
      </article>
    `;
    return;
  }

  const disagreementCount = entries.filter((item) => item.disagreement_flag).length;
  const escalationCount = entries.filter((item) => item.second_review_required).length;
  const latest = entries[entries.length - 1];

  summary.innerHTML = `
    <div class="detail-card"><span>歷史筆數</span><strong>${entries.length}</strong></div>
    <div class="detail-card"><span>分歧筆數</span><strong>${disagreementCount}</strong></div>
    <div class="detail-card"><span>升級複核</span><strong>${escalationCount}</strong></div>
    <div class="detail-card"><span>目前最終裁決</span><strong>${reviewDecisionLabelDisplay(latest?.final_resolution_label)}</strong></div>
  `;

  timeline.innerHTML = entries
    .slice()
    .reverse()
    .map((item, index) => {
      const severity = item.disagreement_severity || "none";
      const recordedAt = item.recorded_at ? formatDateTime(item.recorded_at) : "未知時間";
      return `
        <article class="review-history-entry review-history-entry--${disagreementSeverityTone(severity)}">
          <div class="review-history-entry__head">
            <div>
              <strong>紀錄 ${entries.length - index}</strong>
              <span>${recordedAt}</span>
            </div>
            <span class="status-chip ${disagreementSeverityTone(severity)}">${disagreementSeverityDisplayLabel(severity)}</span>
          </div>
          <div class="advisor-chip-row">
            <span class="status-chip ${item.ai_recommendation_label === "attack" ? "critical" : item.ai_recommendation_label === "benign" ? "good" : "warn"}">AI：${reviewDecisionLabelDisplay(item.ai_recommendation_label)}</span>
            <span class="status-chip ${item.analyst_decision_label ? "warn" : "good"}">人工：${reviewDecisionLabelDisplay(item.analyst_decision_label)}</span>
            <span class="status-chip ${item.second_review_required ? "critical" : "warn"}">${item.second_review_required ? "需要二次複核" : "一般審查"}</span>
          </div>
          <p>${escapeHtml(item.analysis_brief || "這筆紀錄主要用來保留 AI 建議、人工決策與最終覆核結果。")}</p>
          <div class="detail-grid detail-grid--dense review-history-meta">
            <div class="detail-card"><span>AI 信心值</span><strong>${item.ai_confidence != null ? Number(item.ai_confidence).toFixed(2) : "--"}</strong></div>
            <div class="detail-card"><span>建議動作</span><strong>${suggestedActionDisplayLabel(item.suggested_action || "monitor")}</strong></div>
            <div class="detail-card"><span>最終覆核人</span><strong>${item.final_reviewer || "尚未覆核"}</strong></div>
            <div class="detail-card"><span>資料來源</span><strong>${escapeHtml(String(item.source || "review_persist").replaceAll("_", " "))}</strong></div>
          </div>
          ${item.final_override_reason ? `<p class="small-note">${escapeHtml(item.final_override_reason)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderResponseTimeline() {
  const root = document.getElementById("responseTimelineRows");
  if (!root) return;
  root.innerHTML = responseState.timeline
    .map(
      (item) => `
        <tr>
          <td>${item.time}</td>
          <td class="text-code">${item.event}</td>
          <td>${item.action}</td>
          <td>${item.confidence}</td>
          <td>${item.note}</td>
        </tr>
      `,
    )
    .join("");

  const audit = document.getElementById("auditTrail");
  if (audit) {
    audit.innerHTML = responseState.auditTrail
      .map((item) => `<div class="audit-item">${item}</div>`)
      .join("");
  }
}

function renderPlaybook() {
  const playbook = document.getElementById("playbookSteps");
  const actions = document.getElementById("recommendedActions");
  if (playbook) {
    playbook.innerHTML = responseState.playbook
      .map(
        (step, index) => `
          <div class="playbook-step">
            <span>${index + 1}</span>
            <div>
              <strong>Step ${index + 1}</strong>
              <p>${step}</p>
            </div>
          </div>
        `,
      )
      .join("");
  }

  if (actions) {
    actions.innerHTML = responseState.actions
      .map(
        (action) => `
          <button class="candidate-item action-card" type="button" data-action-title="${action.title}">
            <div class="candidate-head">
              <span class="status-chip good">Recommended</span>
              <span class="small-note">rule-based + label context</span>
            </div>
            <h4>${action.title}</h4>
            <p>${action.reason}</p>
            <div class="action-output">${action.output}</div>
          </button>
        `,
      )
      .join("");
  }
}

function renderFeedbackSummary() {
  const root = document.getElementById("feedbackSummary");
  if (!root) return;
  root.innerHTML = `
    <article class="status-card">
      <span>建議標註</span>
      <strong>${analystSuggestionDisplayLabel(responseState.analystLabelSuggestion)}</strong>
      <p>${responseState.analystGuidance}</p>
    </article>
    <article class="status-card">
      <span>將送出的標註</span>
      <strong>${feedbackLabelDisplayLabel(responseState.feedbackLabel)}</strong>
      <p>這是目前將被寫入回饋紀錄的分析師決策。</p>
    </article>
    <article class="status-card">
      <span>補證據方向</span>
      <strong>${responseState.followupChecks[0] || "目前沒有額外補證據要求"}</strong>
      <p>${responseState.followupChecks.length > 1 ? `另有 ${responseState.followupChecks.length - 1} 項可再檢查。` : "可直接依目前建議執行。"}</p>
    </article>
    <article class="status-card">
      <span>審查佇列</span>
      <strong>${responseState.addReviewPool ? "已送入" : "已略過"}</strong>
      <p>控制這筆回饋是否進入弱監督審查流程。</p>
    </article>
  `;
}

function renderFeedbackFlow() {
  const flow = document.getElementById("feedbackFlow");
  const preview = document.getElementById("feedbackRecordPreview");
  const feedbackIncidentId = responseState.incidentId || "--";
  if (flow) {
    flow.innerHTML = `
      <div class="flow-node">分析師標註：<strong>${feedbackLabelDisplayLabel(responseState.feedbackLabel)}</strong></div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">回饋紀錄已寫入</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">${responseState.addReviewPool ? "弱監督審查佇列" : "已略過審查佇列"}</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">${responseState.addFinetunePool ? "目標輔助微調佇列" : "已略過微調佇列"}</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">未來模型更新</div>
    `;
  }

  if (preview) {
    preview.innerHTML = `
      <div class="detail-card">
        <span>feedback_id</span>
        <strong class="text-code">${feedbackIncidentId === "--" ? "--" : `FDBK-${feedbackIncidentId.replace("INC-", "")}`}</strong>
      </div>
      <div class="detail-card">
        <span>incident_id</span>
        <strong class="text-code">${feedbackIncidentId}</strong>
      </div>
      <div class="detail-card">
        <span>analyst_label</span>
        <strong>${feedbackLabelDisplayLabel(responseState.feedbackLabel)}</strong>
      </div>
      <div class="detail-card">
        <span>feedback_type</span>
        <strong>${responseState.feedbackType}</strong>
      </div>
      <div class="detail-card">
        <span>confidence_override</span>
        <strong>${responseState.confidenceOverride}</strong>
      </div>
      <div class="detail-card">
        <span>used_for_training</span>
        <strong>${responseState.addFinetunePool ? "true" : "false"}</strong>
      </div>
    `;
  }
}

function renderFeedbackHistory() {
  const rows = document.getElementById("feedbackHistoryRows");
  if (!rows) return;
  rows.innerHTML = responseState.savedFeedback.length
    ? responseState.savedFeedback
    .map(
      (item) => {
        const analystName =
          responseState.assigneeOptions.find((user) => user.id === item.user_id)?.username ||
          (item.user_id != null ? `User ${item.user_id}` : "Analyst");
        return `
        <tr>
          <td class="text-code">${item.feedback_id}</td>
          <td>${feedbackLabelDisplayLabel(item.analyst_label)}</td>
          <td>${item.feedback_type}</td>
          <td>${analystName}</td>
          <td>${item.add_to_review_pool ? "已送入" : "否"}</td>
          <td>${item.add_to_finetune_pool ? "已送入" : "否"}</td>
          <td>${item.used_for_training ? "已使用" : "待處理"}</td>
          <td>${formatDateTime(item.created_at)}</td>
        </tr>
      `;
      },
    )
    .join("")
    : '<tr><td colspan="8" class="table-empty">這個案件目前還沒有任何分析師回饋。</td></tr>';
}

function renderArtifacts() {
  const cards = document.getElementById("artifactCards");
  const rows = document.getElementById("artifactTableRows");
  if (cards) {
    cards.innerHTML = responseState.artifacts
      .map(
        (item) => `
          <article class="mapping-card">
            <span>${item.type}</span>
            <strong>${item.action}</strong>
            <div class="mapping-divider"></div>
            <p>${item.preview}</p>
          </article>
        `,
      )
      .join("");
  }

  if (rows) {
    rows.innerHTML = responseState.artifacts
      .map(
        (item) => `
          <tr>
            <td>${item.type}</td>
            <td>${item.preview}</td>
            <td><button class="inline-link artifact-action" type="button" data-artifact-action="${item.action}">${item.action}</button></td>
          </tr>
        `,
      )
      .join("");
  }
}

function renderInsightsSetup() {
  const setup = document.getElementById("insightSetupGrid");
  const summary = document.getElementById("insightSummaryGrid");
  const chip = document.getElementById("driftLevelChip");
  const flow = document.getElementById("insightDataFlow");
  if (chip) {
    chip.className = `status-chip ${insightsData.summary.driftLevel === "Low" ? "good" : insightsData.summary.driftLevel === "Moderate" ? "warn" : "critical"}`;
    chip.textContent = `${insightsData.summary.driftLevel === "Low" ? "低度漂移" : insightsData.summary.driftLevel === "Moderate" ? "中度漂移" : "高度漂移"}`;
  }
  if (setup) {
    setup.innerHTML = `
      <div class="detail-card"><span>啟用模型</span><strong>${insightsData.setup.activeModel}</strong></div>
      <div class="detail-card"><span>研究階段</span><strong>${insightsData.setup.thesisStage}</strong></div>
      <div class="detail-card"><span>轉移方向</span><strong>${insightsData.setup.transferDirection}</strong></div>
      <div class="detail-card"><span>任務型態</span><strong>${insightsData.setup.taskType}</strong></div>
      <div class="detail-card"><span>特徵空間</span><strong>${insightsData.setup.featureSchema}</strong></div>
      <div class="detail-card"><span>監看模式</span><strong>${insightsData.setup.monitoringType}</strong></div>
    `;
  }
  if (summary) {
    summary.innerHTML = `
      <article class="status-card">
        <span>全域漂移分數</span>
        <strong>${insightsData.summary.driftScore.toFixed(2)}</strong>
        <p>由均值偏移、變異偏移與超出範圍比例共同組成。</p>
      </article>
      <article class="status-card">
        <span>受影響特徵</span>
        <strong>${insightsData.summary.affectedFeatures}</strong>
        <p>代表目前目標域資料與基線之間出現實質偏移的欄位數。</p>
      </article>
      <article class="status-card">
        <span>適應增益</span>
        <strong>+${insightsData.summary.adaptationGain}%</strong>
        <p>相對於直接轉移基線，自適應跨域偵測所救回的整體表現。</p>
      </article>
      <article class="status-card">
        <span>高信心區</span>
        <strong>${insightsData.summary.highConfidenceRatio}%</strong>
        <p>仍然落在穩定區、可直接採信的預測比例。</p>
      </article>
      <article class="status-card">
        <span>低信心區</span>
        <strong>${insightsData.summary.lowConfidenceRatio}%</strong>
        <p>最可能需要人工審查或後續微調的樣本比例。</p>
      </article>
      <article class="status-card">
        <span>AE 強化</span>
        <strong>${insightsData.setup.ae}</strong>
        <p>表徵強化能力可用，但不應成為操作員的預設負擔。</p>
      </article>
    `;
  }
  if (flow) {
    flow.innerHTML = `
      <div class="flow-node">特徵對齊</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">模型推論</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">漂移計算</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">策略評估</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">洞察證據</div>
    `;
  }
}

function renderDriftFeatureRows() {
  const root = document.getElementById("driftFeatureRows");
  if (!root) return;
  root.innerHTML = insightsData.driftFeatures
    .map(
      (feature) => `
        <article class="mapping-card">
          <span>${feature.name}</span>
          <strong>JS 差異 ${feature.js.toFixed(2)}</strong>
          <div class="mapping-divider"></div>
          <p><span class="mapping-key">Source：</span> ${feature.source.toFixed(2)} | <span class="mapping-key">Target：</span> ${feature.target.toFixed(2)}</p>
          <p><span class="mapping-key">超界比例：</span> ${feature.outRange}%</p>
        </article>
      `,
    )
    .join("");
}

function renderDriftCanvas() {
  const canvas = document.getElementById("driftCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 24, bottom: 44, left: 48 };
  const plotW = width - padding.left - padding.right;
  const barGap = 24;
  const groupWidth = plotW / insightsData.driftFeatures.length;
  const maxVal = 0.8;

  ctx.strokeStyle = "rgba(148,163,184,0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding.top + (height - padding.top - padding.bottom) * (i / 4);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  insightsData.driftFeatures.forEach((feature, index) => {
    const groupX = padding.left + groupWidth * index;
    const sourceHeight = ((height - padding.top - padding.bottom) * feature.source) / maxVal;
    const targetHeight = ((height - padding.top - padding.bottom) * feature.target) / maxVal;
    const baseY = height - padding.bottom;

    ctx.fillStyle = "rgba(105,180,255,0.7)";
    ctx.fillRect(groupX + 18, baseY - sourceHeight, 24, sourceHeight);

    ctx.fillStyle = "rgba(255,123,123,0.8)";
    ctx.fillRect(groupX + 50, baseY - targetHeight, 24, targetHeight);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`F${index + 1}`, groupX + 46, height - 18);
  });

  ctx.fillStyle = "#d8ebff";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Source", 18, 20);
  ctx.fillStyle = "#ffb0b0";
  ctx.fillText("Target", 86, 20);
}

function renderConfidence() {
  const bar = document.getElementById("confidenceBar");
  const summary = document.getElementById("confidenceSummaryGrid");
  const notes = document.getElementById("confidenceNotes");
  if (bar) {
    bar.innerHTML = `
      <div class="confidence-segment high" style="width:${insightsData.confidence.high}%"><span>高 ${insightsData.confidence.high}%</span></div>
      <div class="confidence-segment medium" style="width:${insightsData.confidence.medium}%"><span>中 ${insightsData.confidence.medium}%</span></div>
      <div class="confidence-segment low" style="width:${insightsData.confidence.low}%"><span>低 ${insightsData.confidence.low}%</span></div>
    `;
  }
  if (summary) {
    summary.innerHTML = `
      <article class="status-card">
        <span>穩定區</span>
        <strong>${insightsData.confidence.high}%</strong>
        <p>這一區的結果通常可直接進入實務操作流程。</p>
      </article>
      <article class="status-card">
        <span>待審區</span>
        <strong>${insightsData.confidence.medium}%</strong>
        <p>建議加上人工判讀或更多情境再決定。</p>
      </article>
      <article class="status-card">
        <span>不確定區</span>
        <strong>${insightsData.confidence.low}%</strong>
        <p>可能是誤報，也可能是漂移最嚴重、值得送入後續適應的樣本。</p>
      </article>
    `;
  }
  if (notes) {
    notes.innerHTML = insightsData.confidence.notes.map((note) => `<div class="audit-item">${note}</div>`).join("");
  }
}

function renderStageToggle() {
  const root = document.getElementById("stageToggle");
  if (!root) return;
  root.innerHTML = INSIGHT_STAGE_OPTIONS
    .map(
      (stage) => `
        <button type="button" class="stage-chip ${insightsState.selectedStage === stage.key ? "active" : ""}" data-stage="${stage.key}">
          ${stage.label}
        </button>
      `,
    )
    .join("");
  root.querySelectorAll("[data-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      insightsState.selectedStage = button.dataset.stage;
      renderStageToggle();
      renderComparisonCanvas();
      renderStageMetrics();
    });
  });
}

function renderComparisonCanvas() {
  const canvas = document.getElementById("comparisonCanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  const entries = INSIGHT_STAGE_OPTIONS.map((stage) => ({ key: stage.key, ...insightsData.strategies[stage.key] }));
  const padding = { top: 22, right: 24, bottom: 44, left: 48 };
  const plotH = height - padding.top - padding.bottom;
  const plotW = width - padding.left - padding.right;

  ctx.strokeStyle = "rgba(148,163,184,0.14)";
  for (let i = 0; i < 5; i += 1) {
    const y = padding.top + plotH * (i / 4);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  entries.forEach((entry, index) => {
    const x = padding.left + (plotW / entries.length) * index + 36;
    const barH = plotH * entry.balAcc;
    const isActive = entry.key === insightsState.selectedStage;
    ctx.fillStyle = isActive ? "#0094ff" : entry.key === "C1" ? "rgba(255,148,115,0.78)" : "rgba(148,163,184,0.38)";
    ctx.fillRect(x, height - padding.bottom - barH, 54, barH);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(entry.label.split(" ")[0], x + 27, height - 18);
    ctx.fillText(entry.balAcc.toFixed(2), x + 27, height - padding.bottom - barH - 10);
  });
}

function renderStageMetrics() {
  const stage = insightsData.strategies[insightsState.selectedStage];
  const metricGrid = document.getElementById("stageMetricGrid");
  const evidence = document.getElementById("adaptationEvidence");
  if (metricGrid) {
    metricGrid.innerHTML = `
      <div class="detail-card"><span>目前階段</span><strong>${stage.label}</strong></div>
      <div class="detail-card"><span>Balanced Accuracy</span><strong>${stage.balAcc.toFixed(2)}</strong></div>
      <div class="detail-card"><span>F1 Score</span><strong>${stage.f1.toFixed(2)}</strong></div>
      <div class="detail-card"><span>Precision</span><strong>${stage.precision.toFixed(2)}</strong></div>
      <div class="detail-card"><span>Recall</span><strong>${stage.recall.toFixed(2)}</strong></div>
      <div class="detail-card"><span>判讀</span><strong>${stage.note}</strong></div>
    `;
  }
  if (evidence) {
    const gain = ((insightsData.strategies.C3.balAcc - insightsData.strategies.C1.balAcc) * 100).toFixed(0);
    evidence.innerHTML = `
      <article class="mapping-card">
        <span>這個階段為何重要</span>
        <strong>${stage.label}</strong>
        <div class="mapping-divider"></div>
        <p>${stage.evidence[0]}</p>
        <p>${stage.evidence[1]}</p>
      </article>
      <article class="mapping-card">
        <span>適應增益</span>
        <strong>比直接轉移基準多 +${gain}%</strong>
        <div class="mapping-divider"></div>
        <p>儀表板上的增益數字不是裝飾，而是由這裡的 balanced accuracy 證據支撐。</p>
      </article>
    `;
  }
}

function renderFeatureImportance() {
  const root = document.getElementById("featureImportanceList");
  const conclusions = document.getElementById("insightConclusions");
  if (root) {
    root.innerHTML = insightsData.featureImportance
      .map(
        (item) => `
          <div class="importance-item">
            <div class="importance-head">
              <strong>${item.name}</strong>
              <span>${Math.round(item.weight * 100)}%</span>
            </div>
            <div class="risk-bar ${item.weight > 0.8 ? "critical" : item.weight > 0.65 ? "high" : "medium"}" style="--width:${Math.round(item.weight * 100)}%"><span></span></div>
            <p>${item.reason}</p>
          </div>
        `,
      )
      .join("");
  }
  if (conclusions) {
    conclusions.innerHTML = insightsData.conclusions.map((item) => `<div class="audit-item">${item}</div>`).join("");
  }
}

async function initInsightsPage() {
  await loadInsightsFromApi();
  renderInsightsSetup();
  renderDriftCanvas();
  renderDriftFeatureRows();
  renderConfidence();
  renderStageToggle();
  renderComparisonCanvas();
  renderStageMetrics();
  renderFeatureImportance();
  window.addEventListener("resize", renderDriftCanvas);
  window.addEventListener("resize", renderComparisonCanvas);
}

function setChartFallback(node, title) {
  if (!node) return;
  node.innerHTML = `<div class="chart-fallback">${title} 目前無法顯示，因為 ECharts 執行環境尚未載入。</div>`;
}

function renderReportPreview() {
  const chip = document.getElementById("reportPreviewChip");
  const grid = document.getElementById("reportPreviewGrid");
  const summary = document.getElementById("reportExportSummary");
  const flow = document.getElementById("reportExportFlow");

  if (chip) chip.textContent = `${reportsData.preview.risk} / ${incidentStatusDisplayLabel(reportsData.preview.status)}`;
  if (grid) {
    grid.innerHTML = `
      <div class="detail-card"><span>案件編號</span><strong>${reportsData.preview.incidentId}</strong></div>
      <div class="detail-card"><span>攻擊類型</span><strong>${reportsData.preview.attackType}</strong></div>
      <div class="detail-card"><span>風險等級</span><strong>${reportsData.preview.risk}</strong></div>
      <div class="detail-card"><span>處置狀態</span><strong>${incidentStatusDisplayLabel(reportsData.preview.status)}</strong></div>
      <div class="detail-card"><span>證據時窗</span><strong>${reportsData.preview.timeWindow}</strong></div>
      <div class="detail-card"><span>輸出範圍</span><strong>${reportsData.exportSummary.eventCount} 筆事件 / ${reportsData.exportSummary.actionCount} 個處置</strong></div>
    `;
  }

  if (summary) {
    summary.innerHTML = `
      <article class="status-card">
        <span>時間範圍</span>
        <strong>${reportsState.range === "1h" ? "最近 1 小時" : reportsState.range === "24h" ? "最近 24 小時" : "自訂範圍"}</strong>
        <p>這是本次證據包實際套用的時間邊界。</p>
      </article>
      <article class="status-card">
        <span>輸出格式</span>
        <strong>${reportsState.format.toUpperCase()}</strong>
        <p>PDF 給人看，CSV 給分析，JSON 給系統串接。</p>
      </article>
      <article class="status-card">
        <span>證據包內容</span>
        <strong>${reportsData.exportSummary.eventCount} events / ${reportsData.exportSummary.actionCount} actions</strong>
        <p>${reportsData.exportSummary.diagnostics}</p>
      </article>
    `;
  }

  if (flow) {
    flow.innerHTML = `
      <div class="flow-node">選取案件</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">收集相關證據</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">建立報告骨架</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">${reportsState.format.toUpperCase()} 格式化</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">完成並存檔</div>
    `;
  }
}

function renderReportBundleCards() {
  const root = document.getElementById("reportBundleCards");
  if (!root) return;
  root.innerHTML = reportsData.bundle
    .map(
      (item) => `
        <article class="mapping-card">
          <span>${item.type}</span>
          <strong>${item.title}</strong>
          <div class="mapping-divider"></div>
          <p>${item.description}</p>
        </article>
      `,
    )
    .join("");
}

function renderReportHistory() {
  const rows = document.getElementById("reportHistoryRows");
  if (!rows) return;
  rows.innerHTML = reportsData.history
    .map(
      (item) => `
        <tr>
          <td class="text-code">${item.id}</td>
          <td class="text-code">${item.incident}</td>
          <td>${item.by}</td>
          <td>${item.time}</td>
          <td>${item.type}</td>
          <td><span class="status-chip good">${item.format}</span></td>
          <td><button type="button" class="inline-link report-download" data-report-id="${item.id}">下載</button></td>
        </tr>
      `,
    )
    .join("");
}

function renderReportTimelineChart() {
  const node = document.getElementById("reportTimelineChart");
  if (!node) return;
  if (typeof window.echarts === "undefined") {
    setChartFallback(node, "攻擊時間散點圖");
    return;
  }
  const chart = window.echarts.init(node);
  chart.setOption({
    backgroundColor: "transparent",
    grid: { left: 54, right: 24, top: 30, bottom: 46 },
    tooltip: {
      trigger: "item",
      backgroundColor: "#132235",
      borderColor: "#26384d",
      textStyle: { color: "#f8fafc" },
      formatter: (params) => {
        const [time, category, risk, label] = params.data.value;
        const stages = ["掃描", "爆量", "告警", "控制"];
        return `${label}<br/>時間：${time}<br/>階段：${stages[category]}<br/>風險：${risk}`;
      },
    },
    xAxis: {
      type: "category",
      data: reportsData.timeline.map((item) => item[0]),
      axisLine: { lineStyle: { color: "#38536f" } },
      axisLabel: { color: "#94a3b8" },
    },
    yAxis: {
      type: "category",
      data: ["掃描", "爆量", "告警", "控制"],
      axisLine: { lineStyle: { color: "#38536f" } },
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)" } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (value) => Math.max(18, value[2] / 2.2),
        data: reportsData.timeline.map((item) => ({
          value: item,
          itemStyle: { color: item[2] >= 85 ? "#ff7b7b" : item[2] >= 70 ? "#ffb54d" : "#69b4ff" },
        })),
      },
    ],
  });
  window.addEventListener("resize", () => chart.resize());
}

function renderReportRadarChart() {
  const node = document.getElementById("reportRadarChart");
  if (!node) return;
  if (typeof window.echarts === "undefined") {
    setChartFallback(node, "緩解成效雷達圖");
    return;
  }
  const chart = window.echarts.init(node);
  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "#132235",
      borderColor: "#26384d",
      textStyle: { color: "#f8fafc" },
    },
    radar: {
      indicator: reportsData.radar.indicators,
      splitNumber: 4,
      axisName: { color: "#f8fafc" },
      splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } },
      splitArea: { areaStyle: { color: ["rgba(8,18,31,0.18)", "rgba(19,34,53,0.16)"] } },
      axisLine: { lineStyle: { color: "rgba(148,163,184,0.22)" } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: reportsData.radar.values,
            name: "Current Incident",
            lineStyle: { color: "#0094ff", width: 2.4 },
            areaStyle: { color: "rgba(0,148,255,0.22)" },
            itemStyle: { color: "#69b4ff" },
          },
        ],
      },
    ],
  });
  window.addEventListener("resize", () => chart.resize());
}

function bindReportsControls() {
  const range = document.getElementById("reportRangeSelect");
  const format = document.getElementById("reportFormatSelect");
  range?.addEventListener("change", () => {
    reportsState.range = range.value;
    renderReportPreview();
  });
  format?.addEventListener("change", () => {
    reportsState.format = format.value;
    renderReportPreview();
  });

  document.getElementById("exportBundleBtn")?.addEventListener("click", () => {
    (async () => {
      const created = await tryApi(`/ndr/incidents/${reportsData.preview.incidentId}/artifact-bundle`, { method: "POST" });
      if (created?.export) {
        reportsData.history.unshift({
          id: created.export.export_id,
          incident: created.export.incident_id,
          by: getUsername(),
          time: formatClockTime(created.export.created_at),
          type: created.export.export_type,
          format: String(created.export.file_name || "").split(".").pop()?.toUpperCase() || "TXT",
        });
        renderReportHistory();
      }
    })();
  });

  document.getElementById("exportIncidentBtn")?.addEventListener("click", async () => {
    if (!reportsData.preview.incidentId || reportsData.preview.incidentId === "--") return;
    const created = await tryApi(`/reports/incidents/${reportsData.preview.incidentId}`);
    const report = created?.report || created?.data?.report;
    if (report?.incident) {
      reportsData.history.unshift({
        id: `REPORT-${report.incident.incident_id || reportsData.preview.incidentId}`,
        incident: report.incident.incident_id || reportsData.preview.incidentId,
        by: getUsername(),
        time: formatClockTime(new Date().toISOString()),
        type: "Incident Report",
        format: "JSON",
      });
      renderReportHistory();
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".report-download");
    if (!button) return;
    const exportId = button.dataset.reportId;
    const text = await tryApi(`/ndr/exports/${exportId}/download`, {}, "text");
    if (text) {
      console.info(`Downloaded export ${exportId}`, text.slice(0, 200));
    }
  });
}

async function initReportsPage() {
  await loadReportsFromApi();
  renderReportPreview();
  renderReportBundleCards();
  renderReportHistory();
  renderReportTimelineChart();
  renderReportRadarChart();
  bindReportsControls();
}

function filteredLearningCandidates() {
  return learningQueueData.items
    .filter((item) => {
      const searchText = [
        item.feedbackId,
        item.incidentId,
        item.eventId,
        item.analystLabel,
        item.username,
        item.note,
        item.attackType,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !learningQueueState.search || searchText.includes(learningQueueState.search.toLowerCase());
      const matchesPool =
        learningQueueState.pool === "all" ||
        (learningQueueState.pool === "review" && item.reviewCandidate) ||
        (learningQueueState.pool === "finetune" && item.finetuneCandidate);
      const matchesLabel = learningQueueState.label === "all" || item.analystLabel === learningQueueState.label;
      const matchesTraining =
        learningQueueState.training === "all" ||
        (learningQueueState.training === "used" && item.usedForTraining) ||
        (learningQueueState.training === "pending" && !item.usedForTraining);
      return matchesSearch && matchesPool && matchesLabel && matchesTraining;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function renderLearningQueueSummary() {
  const root = document.getElementById("learningSummaryGrid");
  if (!root) return;
  const items = filteredLearningCandidates();
  const reviewCount = items.filter((item) => item.reviewCandidate).length;
  const finetuneCount = items.filter((item) => item.finetuneCandidate).length;
  const confirmedCount = items.filter((item) => item.analystLabel === "True Positive").length;
  const usedCount = items.filter((item) => item.usedForTraining).length;
  const queuedJobs = learningQueueData.jobs.filter((item) => String(item.status).toLowerCase().includes("queued")).length;
  root.innerHTML = `
    <article class="status-card">
      <span>審查候選</span>
      <strong>${reviewCount}</strong>
      <p>分析師已完成初步判定，正在等待進入弱監督審查流程的案例數。</p>
    </article>
    <article class="status-card">
      <span>微調候選</span>
      <strong>${finetuneCount}</strong>
      <p>已具備目標環境學習價值，可送進後續目標輔助微調流程的案例數。</p>
    </article>
    <article class="status-card">
      <span>已標為攻擊</span>
      <strong>${confirmedCount}</strong>
      <p>目前被分析師標為攻擊，最適合送進監督式學習的回饋筆數。</p>
    </article>
    <article class="status-card">
      <span>已用於訓練</span>
      <strong>${usedCount}</strong>
      <p>已被標記為納入後續模型更新流程，不會再重複當作新候選處理。</p>
    </article>
    <article class="status-card">
      <span>排程中的工作</span>
      <strong>${queuedJobs}</strong>
      <p>已從候選佇列啟動、目前仍在排程或等待執行的模型煉成工作數量。</p>
    </article>
  `;
}

function renderLearningQueueTables() {
  const reviewRows = document.getElementById("learningReviewRows");
  const finetuneRows = document.getElementById("learningFinetuneRows");
  const jobRows = document.getElementById("learningJobRows");
  const items = filteredLearningCandidates();
  const renderRows = (collection) =>
    collection
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.feedbackId}</td>
            <td class="text-code">${item.incidentId}</td>
            <td>${item.attackType}</td>
            <td>${feedbackLabelDisplayLabel(item.analystLabel)}</td>
            <td>${item.strategy}</td>
            <td>${item.username}</td>
            <td>${item.incidentRisk || "--"}</td>
            <td>${item.usedForTraining ? "Used" : "Pending"}</td>
            <td>${formatDateTime(item.createdAt)}</td>
          </tr>
        `,
      )
      .join("");

  if (reviewRows) {
    reviewRows.innerHTML = renderRows(items.filter((item) => item.reviewCandidate));
  }
  if (finetuneRows) {
    finetuneRows.innerHTML = renderRows(items.filter((item) => item.finetuneCandidate));
  }
  if (jobRows) {
    jobRows.innerHTML = learningQueueData.jobs
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.jobId}</td>
            <td>${item.scope}</td>
            <td>${item.status}</td>
            <td>${item.candidateCount}</td>
            <td class="text-code">${item.requestedVersion}</td>
            <td class="text-code">${item.outputVersion}</td>
            <td>${item.triggeredBy || "--"}</td>
            <td>${formatDateTime(item.createdAt)}</td>
          </tr>
        `,
      )
      .join("");
  }
}

function renderLearningQueueFlow() {
  const root = document.getElementById("learningFlow");
  const notes = document.getElementById("learningNotes");
  const actionLog = document.getElementById("learningActionLog");
  if (root) {
    root.innerHTML = `
      <div class="flow-node">Analyst Feedback</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">Weak-Supervision Review Queue</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">Target-Assisted Fine-Tuning Queue</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">Future Model Update</div>
    `;
  }
  if (notes) {
    notes.innerHTML = `
      <article class="mapping-card">
        <span>Queue Logic</span>
        <strong>Decision to Learning</strong>
        <div class="mapping-divider"></div>
        <p>Only analyst-reviewed cases enter this queue. The page separates weak-supervision review from target-assisted fine-tuning so the training path remains traceable.</p>
      </article>
      <article class="mapping-card">
        <span>Current Scope</span>
        <strong>Real Feedback and Real Job Records</strong>
        <div class="mapping-divider"></div>
        <p>This queue now uses persisted analyst feedback, exported candidate snapshots, and real fine-tuning job records. Actual model training still depends on the external training runner.</p>
      </article>
    `;
  }
  if (actionLog) {
    actionLog.innerHTML = learningQueueData.actionLog.map((item) => `<div class="audit-item">${item}</div>`).join("");
  }
}

function bindLearningQueueControls() {
  const search = document.getElementById("learningSearchInput");
  const pool = document.getElementById("learningPoolFilter");
  const label = document.getElementById("learningLabelFilter");
  const training = document.getElementById("learningTrainingFilter");
  const exportFormat = document.getElementById("learningExportFormat");
  const modelVersion = document.getElementById("learningModelVersion");
  const update = () => {
    learningQueueState.search = search?.value || "";
    learningQueueState.pool = pool?.value || "all";
    learningQueueState.label = label?.value || "all";
    learningQueueState.training = training?.value || "all";
    renderLearningQueueSummary();
    renderLearningQueueTables();
  };
  [search, pool, label, training].forEach((node) => {
    if (!node) return;
    node.addEventListener("input", update);
    node.addEventListener("change", update);
  });

  document.getElementById("exportCandidatesBtn")?.addEventListener("click", async () => {
    const scope = learningQueueState.pool === "all" ? "all" : learningQueueState.pool;
    const result = await tryApi("/ndr/feedback/export-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pool_scope: scope,
        export_format: exportFormat?.value || "csv",
        only_pending: learningQueueState.training === "pending",
      }),
    });
    if (result?.export) {
      learningQueueData.actionLog.unshift(
        `${formatClockTime(new Date().toISOString())} - 已建立候選匯出：${result.export.file_name}。`,
      );
    } else {
      learningQueueData.actionLog.unshift(
        `${formatClockTime(new Date().toISOString())} - 候選匯出失敗，或後端未回傳證據檔。`,
      );
    }
    renderLearningQueueFlow();
  });

  document.getElementById("triggerFineTuningBtn")?.addEventListener("click", async () => {
    learningQueueData.actionLog.unshift(
      `${formatClockTime(new Date().toISOString())} - Refinement execution is unavailable in this build. Candidate curation remains preparation-only.`,
    );
    renderLearningQueueFlow();
  });

  document.getElementById("registerModelBtn")?.addEventListener("click", async () => {
    learningQueueData.actionLog.unshift(
      `${formatClockTime(new Date().toISOString())} - Model registration is unavailable in this build.`,
    );
    renderLearningQueueFlow();
  });
}

async function initLearningQueuePage() {
  await loadLearningQueueFromApi();
  renderLearningQueueSummary();
  renderLearningQueueTables();
  renderLearningQueueFlow();
  bindLearningQueueControls();
}

function renderSettingsSummary() {
  const isAdmin = currentUserIsAdmin();
  const summary = document.getElementById("settingsSummaryGrid");
  const runtime = document.getElementById("settingsRuntimeGrid");
  const geoipStatusChip = document.getElementById("settingsGeoipStatusChip");
  const geoipRuntimeGrid = document.getElementById("settingsGeoipRuntimeGrid");
  const geoipCoverageGrid = document.getElementById("settingsGeoipCoverageGrid");
  const users = document.getElementById("settingsUsersRows");
  const collectors = document.getElementById("settingsCollectorsRows");
  const agentsRows = document.getElementById("settingsAgentsRows");
  const agentHostStatusChip = document.getElementById("settingsAgentHostStatusChip");
  const agentHostStatusGrid = document.getElementById("settingsAgentHostStatusGrid");
  const agentHostRuntimeGrid = document.getElementById("settingsAgentHostRuntimeGrid");
  const agentInstallGrid = document.getElementById("settingsAgentInstallGrid");
  const agentInstallNotes = document.getElementById("settingsAgentInstallNotes");
  const registry = document.getElementById("modelRegistryGrid");
  const flow = document.getElementById("modelLineageFlow");
  const notes = document.getElementById("modelLineageNotes");
  const actionLog = document.getElementById("settingsActionLog");
  const registryRows = document.getElementById("settingsRegistryRows");
  const jobsRows = document.getElementById("settingsJobsRows");

  if (summary) {
    if (!isAdmin) {
      summary.innerHTML = `
        <article class="status-card">
          <span>偵測策略</span>
          <strong>${settingsData.registry.detectionStrategy}</strong>
          <p>目前產品實際啟用的偵測路徑。</p>
        </article>
        <article class="status-card">
          <span>GeoIP 狀態</span>
          <strong>${settingsData.geoip.enabled ? "上線" : settingsData.geoip.libraryInstalled ? "僅站點錨點" : "不可用"}</strong>
          <p>保留地圖定位可用性摘要。</p>
        </article>
        <article class="status-card">
          <span>模型版本</span>
          <strong>${settingsData.registry.modelVersion}</strong>
          <p>可查看目前模型版本與執行路徑。</p>
        </article>
      `;
    } else {
    summary.innerHTML = `
      <article class="status-card">
        <span>帳號數</span>
        <strong>${settingsData.users.length}</strong>
        <p>目前可登入平台並參與工作流程的帳號總數。</p>
      </article>
      <article class="status-card">
        <span>啟用收集器</span>
        <strong>${settingsData.collectors.filter((item) => item.status === "Running").length}</strong>
        <p>正在餵資料、或已就緒可餵資料進平台的來源數量。</p>
      </article>
      <article class="status-card">
        <span>在線端點 Agent</span>
        <strong>${settingsData.agents.filter((item) => ["active", "alive", "observed", "enrolled"].includes(item.status)).length}</strong>
        <p>已註冊且最近仍持續回報 observation 的端點數量。</p>
      </article>
      <article class="status-card">
        <span>即時感測器</span>
        <strong>${sensorRuntimeData.running ? "執行中" : sensorRuntimeData.available ? "待命" : "不可用"}</strong>
        <p>${sensorRuntimeData.interfaceName || sensorRuntimeData.recommendedInterfaceName || "目前尚未綁定後端 live interface。"}</p>
      </article>
      <article class="status-card">
        <span>偵測策略</span>
        <strong>${settingsData.registry.detectionStrategy}</strong>
        <p>目前產品實際啟用的偵測路徑。</p>
      </article>
      <article class="status-card">
        <span>已註冊版本</span>
        <strong>${settingsData.registryEntries.length || 1}</strong>
        <p>已寫入模型註冊表、可供追溯的版本數量。</p>
      </article>
      <article class="status-card">
        <span>微調任務</span>
        <strong>${settingsData.jobs.length}</strong>
        <p>由分析師回饋推進而來的訓練任務總數。</p>
      </article>
    `;
    }
  }

  if (runtime) {
    if (!isAdmin) {
      runtime.innerHTML = `
        <div class="detail-card"><span>系統狀態</span><strong>正常運作</strong></div>
        <div class="detail-card"><span>執行環境</span><strong>FastAPI 主服務 / 平台後端</strong></div>
        <div class="detail-card"><span>目前路徑</span><strong>${settingsData.registry.transferDirection}</strong></div>
        <div class="detail-card"><span>最近更新</span><strong>${settingsData.registry.lastUpdated}</strong></div>
        <div class="detail-card"><span>可見範圍</span><strong>案件 / 應變 / 報表 / 一般設定</strong></div>
        <div class="detail-card"><span>目前視圖</span><strong>一般工作流程摘要</strong></div>
      `;
    } else {
    runtime.innerHTML = `
      <div class="detail-card"><span>系統狀態</span><strong>正常運作</strong></div>
      <div class="detail-card"><span>執行環境</span><strong>FastAPI 主服務 / 平台後端</strong></div>
      <div class="detail-card"><span>感測模式</span><strong>${sensorModeDisplayLabel(sensorRuntimeData.mode)}</strong></div>
      <div class="detail-card"><span>後端感測目標</span><strong>${sensorRuntimeData.interfaceName || sensorRuntimeData.replayFile || "--"}</strong></div>
      <div class="detail-card"><span>目前路徑</span><strong>${settingsData.registry.transferDirection}</strong></div>
      <div class="detail-card"><span>最近更新</span><strong>${settingsData.registry.lastUpdated}</strong></div>
      <div class="detail-card"><span>管理範圍</span><strong>帳號 / 收集器 / 端點 Agent / 模型註冊</strong></div>
      <div class="detail-card"><span>Connected APIs</span><strong>/api/detection/model/status · /api/integrations/status · /api/settings/thresholds</strong></div>
    `;
    }
  }

  if (geoipStatusChip) {
    const geoipTone = settingsData.geoip.enabled ? "good" : settingsData.geoip.libraryInstalled ? "warn" : "critical";
    const geoipLabel = settingsData.geoip.enabled
      ? "GeoIP online"
      : settingsData.geoip.libraryInstalled
        ? "Anchor fallback"
        : "GeoIP unavailable";
    geoipStatusChip.className = `status-chip ${geoipTone}`;
    geoipStatusChip.textContent = geoipLabel;
  }

  if (geoipRuntimeGrid) {
    const anchor = settingsData.geoip.protectedSiteAnchor;
    const anchorCoordinates =
      anchor.latitude != null && anchor.longitude != null
        ? `${Number(anchor.latitude).toFixed(4)}, ${Number(anchor.longitude).toFixed(4)}`
        : "--";
    const geoipMode = settingsData.geoip.enabled ? "Real GeoIP + protected-site anchor" : "Protected-site anchor only";
    geoipRuntimeGrid.innerHTML = `
      <div class="detail-card"><span>GeoIP Database</span><strong>${settingsData.geoip.cityDbExists ? "Available" : "Missing"}</strong></div>
      <div class="detail-card"><span>Source</span><strong>${settingsData.geoip.provider}</strong></div>
      <div class="detail-card"><span>Mode</span><strong>${geoipMode}</strong></div>
      <div class="detail-card"><span>Protected Site</span><strong>${escapeHtml(anchor.site_name)}</strong></div>
      <div class="detail-card"><span>Anchor Region</span><strong>${escapeHtml(anchor.region)}, ${escapeHtml(anchor.country)}</strong></div>
      <div class="detail-card"><span>Anchor Coordinates</span><strong>${anchorCoordinates}</strong></div>
      <div class="detail-card"><span>City DB</span><strong class="text-code">${settingsData.geoip.cityDbPath || "Not configured"}</strong></div>
      <div class="detail-card"><span>GeoIP Library</span><strong>${settingsData.geoip.libraryInstalled ? "Available" : "Unavailable"}</strong></div>
    `;
  }

  if (geoipCoverageGrid) {
    const unresolvedCount = Math.max(settingsData.geoCoverage.totalNodes - settingsData.geoCoverage.geolocatedNodes, 0);
    geoipCoverageGrid.innerHTML = `
      <article class="status-card">
        <span>已定位節點</span>
        <strong>${settingsData.geoCoverage.geolocatedNodes} / ${settingsData.geoCoverage.totalNodes}</strong>
        <p>目前儀表板地圖中，已具備可用座標的來源與目標節點數量。</p>
      </article>
      <article class="status-card">
        <span>來源節點</span>
        <strong>${settingsData.geoCoverage.sourceNodes}</strong>
        <p>目前高優先案件中可辨識的外部來源數量。</p>
      </article>
      <article class="status-card">
        <span>受保護目標</span>
        <strong>${settingsData.geoCoverage.protectedInternalTargets}</strong>
        <p>目前透過 protected-site anchor 解析出的內部目標數量。</p>
      </article>
      <article class="status-card">
        <span>未解析的公開來源</span>
        <strong>${settingsData.geoCoverage.unresolvedPublicSources}</strong>
        <p>仍缺少真實 GeoIP 座標、只能退回備援投影的公開來源數量。</p>
      </article>
      <article class="status-card">
        <span>地圖路徑</span>
        <strong>${settingsData.geoCoverage.pathCount}</strong>
        <p>目前在地理攻擊地圖上可視化的攻擊路徑總數。</p>
      </article>
      <article class="status-card">
        <span>覆蓋健康度</span>
        <strong>${settingsData.geoCoverage.totalNodes ? Math.round((settingsData.geoCoverage.geolocatedNodes / settingsData.geoCoverage.totalNodes) * 100) : 0}%</strong>
        <p>${unresolvedCount === 0 ? "目前這批案件的地圖節點已全部完成定位。" : `仍有 ${unresolvedCount} 組節點依賴備援投影。`}</p>
      </article>
    `;
  }

  if (users) {
    users.innerHTML = settingsData.users
      .map(
        (item) => `
          <tr>
            <td>${item.username}</td>
            <td>${item.role}</td>
            <td><span class="status-chip ${item.status === "active" ? "good" : "warn"}">${systemStateDisplayLabel(item.status)}</span></td>
            <td>${item.lastLogin}</td>
          </tr>
        `,
      )
      .join("");
  }

  if (collectors) {
    collectors.innerHTML = settingsData.collectors
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.id}</td>
            <td>${item.type}</td>
            <td><span class="status-chip ${item.status === "Running" || item.status === "Ready" ? "good" : "warn"}">${systemStateDisplayLabel(item.status)}</span></td>
            <td>${item.interval}</td>
            <td>${item.lastRun}</td>
          </tr>
        `,
      )
      .join("");
  }

  if (agentsRows) {
    agentsRows.innerHTML = settingsData.agents
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${item.displayName}</strong>
              <div class="table-subtle text-code">${item.agentId}</div>
            </td>
            <td>${item.hostName}</td>
            <td><span class="status-chip ${["active", "alive", "observed", "enrolled"].includes(item.status) ? "good" : item.status === "degraded" ? "warn" : "critical"}">${systemStateDisplayLabel(item.status)}</span></td>
            <td>${formatDateTime(item.lastObservationAt)}</td>
            <td>${item.lastObservationCount}</td>
            <td>${item.lastMaterializedEventCount}</td>
          </tr>
        `,
      )
      .join("");
  }

  const agentHostRuntime = settingsData.agentHostRuntime;
  const agentRuntimeHealthy = agentHostRuntime.available && agentHostRuntime.python.exists && agentHostRuntime.files.agentScriptExists;
  const agentRuntimeInstallable =
    agentHostRuntime.available &&
    agentHostRuntime.python.exists &&
    agentHostRuntime.files.configExampleExists;
  if (agentHostStatusChip) {
    const tone = agentRuntimeHealthy ? "good" : agentRuntimeInstallable ? "warn" : "critical";
    const label = agentRuntimeHealthy ? "Thin Agent Ready" : agentRuntimeInstallable ? "Setup Available" : "Needs Setup";
    agentHostStatusChip.className = `status-chip ${tone}`;
    agentHostStatusChip.textContent = label;
  }

  if (agentHostStatusGrid) {
    agentHostStatusGrid.innerHTML = `
      <article class="status-card">
        <span>Current Permission</span>
        <strong>${agentHostRuntime.adminSession ? "Administrator" : "Standard Session"}</strong>
        <p>${agentHostRuntime.adminSession ? "This backend host session has administrator rights." : "Browser UI cannot elevate permissions. Run setup commands from an elevated terminal if needed."}</p>
      </article>
      <article class="status-card">
        <span>Agent Mode</span>
        <strong>Thin Sensor</strong>
        <p>No Windows Service or raw packet capture is required for the current canonical-observation sender.</p>
      </article>
      <article class="status-card">
        <span>Python Runtime</span>
        <strong>${agentHostRuntime.python.exists ? "Available" : "Missing"}</strong>
        <p>${agentHostRuntime.python.exists ? agentHostRuntime.python.path || "Python detected" : "Python is required to run the thin agent."}</p>
      </article>
      <article class="status-card">
        <span>Packet Driver</span>
        <strong>${agentHostRuntime.npcap.installed ? "Npcap Present" : "Not Required"}</strong>
        <p>Npcap is optional here. This MVP agent sends canonical flow observations and does not capture packets directly.</p>
      </article>
    `;
  }

  if (agentHostRuntimeGrid) {
    agentHostRuntimeGrid.innerHTML = `
      <div class="detail-card"><span>Agent Root</span><strong class="text-code">${agentHostRuntime.files.agentRoot || "Not found"}</strong></div>
      <div class="detail-card"><span>Agent Script</span><strong class="text-code">${agentHostRuntime.files.agentScriptExists ? agentHostRuntime.files.agentScript : "Missing"}</strong></div>
      <div class="detail-card"><span>Python Path</span><strong class="text-code">${agentHostRuntime.python.path || "Not found"}</strong></div>
      <div class="detail-card"><span>Backend URL</span><strong class="text-code">${agentHostRuntime.config.backendUrl || "Not configured"}</strong></div>
      <div class="detail-card"><span>Runtime Config</span><strong>${agentHostRuntime.files.credentialsExists ? "config.json exists" : "Create from config.example.json"}</strong></div>
      <div class="detail-card"><span>Retry Queue</span><strong>${agentHostRuntime.files.queueExists ? "Pending retries exist" : "Empty"}</strong></div>
      <div class="detail-card"><span>Agent Log</span><strong>${agentHostRuntime.files.logExists ? "Available" : "No log yet"}</strong></div>
      <div class="detail-card"><span>Last Log Line</span><strong>${agentHostRuntime.files.lastLogLine ? escapeHtml(agentHostRuntime.files.lastLogLine) : "No log output"}</strong></div>
    `;
  }

  if (agentInstallGrid) {
    agentInstallGrid.innerHTML = `
      <div class="detail-card"><span>Setup Script</span><strong class="text-code">${agentHostRuntime.files.installAdminScript || "Unavailable"}</strong></div>
      <div class="detail-card"><span>Service Installer</span><strong class="text-code">${agentHostRuntime.files.installServiceScript || "Not used in thin-agent MVP"}</strong></div>
      <div class="detail-card"><span>Cleanup Script</span><strong class="text-code">${agentHostRuntime.files.uninstallServiceScript || "Unavailable"}</strong></div>
      <div class="detail-card"><span>Smoke Test</span><strong class="text-code">${agentHostRuntime.files.smokeTestScript || "Unavailable"}</strong></div>
      <div class="detail-card"><span>Setup Command</span><strong class="text-code">${agentHostRuntime.commands.installAdmin || "Unavailable"}</strong></div>
      <div class="detail-card"><span>Verification Command</span><strong class="text-code">${agentHostRuntime.commands.smokeTest || "Unavailable"}</strong></div>
    `;
  }

  document.getElementById("copyAgentInstallCommandBtn")?.toggleAttribute("disabled", !agentHostRuntime.commands.installAdmin);
  document.getElementById("copyAgentSmokeCommandBtn")?.toggleAttribute("disabled", !agentHostRuntime.commands.smokeTest);
  document.getElementById("copyAgentUninstallCommandBtn")?.toggleAttribute("disabled", !agentHostRuntime.commands.uninstallService);

  if (agentInstallNotes) {
    const installNotes = [
      agentHostRuntime.files.agentScriptExists
        ? "Thin agent script is present. It sends canonical observations only."
        : "Thin agent script is missing; setup commands are unavailable.",
      agentHostRuntime.files.credentialsExists
        ? "config.json exists. Verify server_url, tenant_id, agent_id, auth_token, and observation_file before running."
        : "config.json has not been created yet. Run the setup command and then edit the generated config.",
      agentHostRuntime.npcap.installed
        ? "Npcap is present, but packet capture is not used by the current thin-agent MVP."
        : "Npcap is not required for this build. Do not claim live packet capture from the agent.",
      agentHostRuntime.files.lastLogLine
        ? `Recent agent log: ${agentHostRuntime.files.lastLogLine}`
        : "No agent log output yet.",
    ];
    agentInstallNotes.innerHTML = installNotes
      .map((item) => `<div class="audit-item">${escapeHtml(item)}</div>`)
      .join("");
  }

  if (registry) {
    registry.innerHTML = `
      <div class="detail-card"><span>啟用模型</span><strong>${settingsData.registry.activeModel}</strong></div>
      <div class="detail-card"><span>偵測策略</span><strong>${settingsData.registry.detectionStrategy}</strong></div>
      <div class="detail-card"><span>Schema 版本</span><strong>${settingsData.registry.schemaVersion}</strong></div>
      <div class="detail-card"><span>模型版本</span><strong>${settingsData.registry.modelVersion}</strong></div>
      <div class="detail-card"><span>最近更新</span><strong>${settingsData.registry.lastUpdated}</strong></div>
      <div class="detail-card"><span>轉移方向</span><strong>${settingsData.registry.transferDirection}</strong></div>
    `;
  }

  if (flow) {
    flow.innerHTML = settingsData.lineage
      .map(
        (item, index) => `
          <div class="lineage-node">
            <span>${index + 1}</span>
            <strong>${item.stage}</strong>
          </div>
          ${index < settingsData.lineage.length - 1 ? '<div class="flow-arrow">→</div>' : ""}
        `,
      )
      .join("");
  }

  if (notes) {
    notes.innerHTML = settingsData.lineage
      .map(
        (item) => `
          <article class="mapping-card">
            <span>演進階段</span>
            <strong>${item.stage}</strong>
            <div class="mapping-divider"></div>
            <p>${item.description}</p>
          </article>
        `,
      )
      .join("");
  }

  if (registryRows) {
    registryRows.innerHTML = settingsData.registryEntries
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.registryId}</td>
            <td class="text-code">${item.modelVersion}</td>
            <td>${item.detectionStrategy}</td>
            <td><span class="status-chip ${item.status === "Active" ? "good" : "warn"}">${systemStateDisplayLabel(item.status)}</span></td>
            <td class="text-code">${item.sourceJobId}</td>
            <td>${formatDateTime(item.createdAt)}</td>
          </tr>
        `,
      )
      .join("");
  }

  if (jobsRows) {
    jobsRows.innerHTML = settingsData.jobs
      .map(
        (item) => `
          <tr>
            <td class="text-code">${item.jobId}</td>
            <td>${item.scope}</td>
            <td>${systemStateDisplayLabel(item.status)}</td>
            <td>${item.candidateCount}</td>
            <td class="text-code">${item.requestedVersion}</td>
            <td class="text-code">${item.outputVersion}</td>
            <td>${formatDateTime(item.createdAt)}</td>
          </tr>
        `,
      )
      .join("");
  }

  if (actionLog) {
    if (!isAdmin) {
      actionLog.innerHTML = [
        "目前帳號為一般使用者；管理者控制與主機層資訊已隱藏。",
        settingsData.geoip.enabled
          ? `GeoIP 目前由 ${settingsData.geoip.provider} 提供。`
          : "GeoIP 目前處於站點錨點備援模式。",
        `目前偵測策略：${settingsData.registry.detectionStrategy}。`,
        ...settingsData.actionLog,
      ]
        .map((item) => `<div class="audit-item">${item}</div>`)
        .join("");
      return;
    }
    const registryLog =
      settingsData.registryEntries[0]
        ? `模型註冊表目前啟用版本：${settingsData.registryEntries[0].modelVersion}（${settingsData.registryEntries[0].stageLabel}）。`
        : "目前使用設定頁的備援模型資料。";
    const jobLog =
      settingsData.jobs[0]
        ? `最近一次微調任務：${settingsData.jobs[0].jobId} → ${systemStateDisplayLabel(settingsData.jobs[0].status)}。`
        : "目前還沒有啟動任何微調任務。";
    const sensorLog = sensorRuntimeData.running
      ? `Suricata 感測器目前運行於平台後端主機的 ${sensorRuntimeData.interfaceName || sensorRuntimeData.interfaceIp || "所選網卡"}。`
      : sensorRuntimeData.message || "Suricata 感測器目前待命。";
    const geoipLog = settingsData.geoip.enabled
      ? `GeoIP 目前由 ${settingsData.geoip.provider} 提供；已解析 ${settingsData.geoCoverage.geolocatedNodes}/${settingsData.geoCoverage.totalNodes} 個地圖節點。`
      : "GeoIP 目前處於站點錨點備援模式；沒有座標的公開來源會使用備援投影。";
    const agentLog = settingsData.agents.length
      ? `目前共有 ${settingsData.agents.length} 台端點 Agent 已註冊，其中 ${settingsData.agents.filter((item) => ["active", "alive", "observed", "enrolled"].includes(item.status)).length} 台在線。`
      : "目前還沒有任何端點 Agent 完成註冊。";
    const agentHostLog = settingsData.agentHostRuntime.service.installed
      ? `本機 Endpoint Agent Service 目前為 ${systemStateDisplayLabel(settingsData.agentHostRuntime.service.status)}。`
      : "本機 Endpoint Agent Service 尚未安裝；可使用一鍵管理員安裝器。";
    actionLog.innerHTML = [sensorLog, agentLog, agentHostLog, geoipLog, registryLog, jobLog, ...settingsData.actionLog]
      .map((item) => `<div class="audit-item">${item}</div>`)
      .join("");
  }

  renderSettingsSensorPanel();
}

function bindSettingsControls() {
  document.getElementById("refreshSystemBtn")?.addEventListener("click", async () => {
    settingsData.actionLog.unshift("04:33 - 已重新整理系統狀態，並重新驗證收集器與模型註冊表。");
    await loadSettingsFromApi();
    renderSettingsSummary();
  });

  document.getElementById("settingsRefreshSensorBtn")?.addEventListener("click", async () => {
    const result = await refreshSuricataSensorStatus();
    if (!result) {
      settingsData.actionLog.unshift(`感測器狀態更新失敗：${lastApiErrorMessage || "未知後端錯誤"}。`);
      renderSettingsSummary();
      return;
    }
    settingsData.actionLog.unshift(`感測器狀態已更新：${getSensorRuntimeLabel()}。`);
    renderSettingsSummary();
  });

  document.getElementById("settingsStartSensorBtn")?.addEventListener("click", async () => {
    const result = await startSuricataSensorFromControls({
      interfaceSelectId: "settingsSuricataInterfaceSelect",
    });
    if (!result) {
      settingsData.actionLog.unshift(`啟動感測器失敗：${lastApiErrorMessage || "未知後端錯誤"}。`);
      renderSettingsSummary();
      return;
    }
    settingsData.actionLog.unshift(`感測器已啟動於後端主機的 ${sensorRuntimeData.interfaceName || sensorRuntimeData.interfaceIp || "所選網卡"}。`);
    renderSettingsSummary();
  });

  document.getElementById("settingsStopSensorBtn")?.addEventListener("click", async () => {
    const result = await stopSuricataSensorFromControls();
    if (!result) {
      settingsData.actionLog.unshift(`停止感測器失敗：${lastApiErrorMessage || "未知後端錯誤"}。`);
      renderSettingsSummary();
      return;
    }
    settingsData.actionLog.unshift("已從設定頁停止感測器。");
    renderSettingsSummary();
  });

  document.getElementById("copyAgentInstallCommandBtn")?.addEventListener("click", async () => {
    const command = settingsData.agentHostRuntime.commands.installAdmin;
    if (!command) return;
    const copied = await copyTextToClipboard(command);
    settingsData.actionLog.unshift(copied ? "已複製一鍵管理員安裝指令。" : "無法直接寫入剪貼簿，請手動複製一鍵安裝指令。");
    renderSettingsSummary();
  });

  document.getElementById("copyAgentSmokeCommandBtn")?.addEventListener("click", async () => {
    const command = settingsData.agentHostRuntime.commands.smokeTest;
    if (!command) return;
    const copied = await copyTextToClipboard(command);
    settingsData.actionLog.unshift(copied ? "已複製 Endpoint Agent 驗證指令。" : "無法直接寫入剪貼簿，請手動複製 Endpoint Agent 驗證指令。");
    renderSettingsSummary();
  });

  document.getElementById("copyAgentUninstallCommandBtn")?.addEventListener("click", async () => {
    const command = settingsData.agentHostRuntime.commands.uninstallService;
    if (!command) return;
    const copied = await copyTextToClipboard(command);
    settingsData.actionLog.unshift(copied ? "已複製 Endpoint Agent 移除指令。" : "無法直接寫入剪貼簿，請手動複製 Endpoint Agent 移除指令。");
    renderSettingsSummary();
  });
}

async function initSettingsPage() {
  await loadSettingsFromApi();
  renderSettingsSummary();
  bindSettingsControls();
}

function initLoginPage() {
  if (isAuthenticated()) {
    window.location.href = "dashboard.html";
    return;
  }
  const form = document.getElementById("loginForm");
  const username = document.getElementById("loginUsername");
  const password = document.getElementById("loginPassword");
  const confirmPassword = document.getElementById("registerConfirmPassword");
  const confirmField = document.getElementById("registerConfirmField");
  const submitBtn = document.getElementById("loginSubmitBtn");
  const title = document.getElementById("authCardTitle");
  const description = document.getElementById("authCardDescription");
  const hint = document.getElementById("authModeHint");
  const loginModeBtn = document.getElementById("showLoginModeBtn");
  const registerModeBtn = document.getElementById("showRegisterModeBtn");
  const result = document.getElementById("loginResult");
  let mode = "login";

  const applyMode = (nextMode) => {
    mode = nextMode === "register" ? "register" : "login";
    const isRegister = mode === "register";
    loginModeBtn?.classList.toggle("active", !isRegister);
    registerModeBtn?.classList.toggle("active", isRegister);
    if (title) title.textContent = isRegister ? "建立平台帳號" : "平台登入";
    if (description) {
      description.textContent = isRegister
        ? "建立平台帳號後即可開始使用。"
        : "請輸入平台帳號與密碼以繼續。";
    }
    if (submitBtn) submitBtn.textContent = isRegister ? "建立帳號" : "登入";
    if (hint) {
      hint.textContent = isRegister
        ? "建立完成後會自動登入並進入安全總覽。"
        : "登入後將直接進入安全總覽。";
    }
    if (confirmField) {
      confirmField.hidden = !isRegister;
      confirmField.style.display = isRegister ? "grid" : "none";
      confirmField.setAttribute("aria-hidden", isRegister ? "false" : "true");
    }
    if (confirmPassword) {
      confirmPassword.required = isRegister;
      if (!isRegister) confirmPassword.value = "";
    }
    if (result) result.textContent = "";
  };

  const loginWithCurrentCredentials = async () => {
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username?.value?.trim() || "",
        password: password?.value || "",
      }),
    });
    setAuthState({
      token: payload.access_token || "",
      role: payload.role || "user",
      username: username?.value?.trim() || "user",
    });
  };

  loginModeBtn?.addEventListener("click", () => applyMode("login"));
  registerModeBtn?.addEventListener("click", () => applyMode("register"));
  applyMode("login");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const trimmedUsername = username?.value?.trim() || "";
    const passwordValue = password?.value || "";
    const confirmValue = confirmPassword?.value || "";
    if (mode === "register") {
      if (!trimmedUsername || !passwordValue) {
        if (result) result.textContent = "建立帳號失敗：必須填寫使用者名稱與密碼。";
        return;
      }
      if (passwordValue !== confirmValue) {
        if (result) result.textContent = "建立帳號失敗：兩次輸入的密碼不一致。";
        return;
      }
    }
    if (result) result.textContent = mode === "register" ? "正在建立帳號..." : "正在登入...";
    try {
      if (mode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: trimmedUsername,
            password: passwordValue,
          }),
        });
      }
      await loginWithCurrentCredentials();
      if (result) {
        result.textContent = mode === "register"
          ? "帳號建立完成，正在前往儀表板..."
          : "登入成功，正在前往儀表板...";
      }
      window.location.href = "dashboard.html";
    } catch (error) {
      if (result) {
        result.textContent = mode === "register"
          ? `建立帳號失敗：${error.message}`
          : `登入失敗：${error.message}`;
      }
    }
  });
}

function bindResponseControls() {
  const assignee = document.getElementById("responseAssigneeSelect");
  const status = document.getElementById("responseStatusSelect");
  const type = document.getElementById("feedbackTypeSelect");
  const confidence = document.getElementById("feedbackConfidenceInput");
  const reviewPool = document.getElementById("reviewPoolToggle");
  const finetunePool = document.getElementById("finetunePoolToggle");
  const note = document.getElementById("feedbackNoteInput");
  const recommendedActionsRoot = document.getElementById("recommendedActions");
  const advisorRoot = document.getElementById("aiInsightsCard");

  const handleRecommendedAction = async (button) => {
    responseState.nextStep = button.dataset.actionTitle || responseState.nextStep;
    responseState.auditTrail.unshift(`12:14 - Recommended action selected: ${responseState.nextStep}.`);
    if (responseState.primaryEventId && String(responseState.nextStep).toLowerCase().includes("firewall")) {
      const action = await tryApi(`/ndr/events/${responseState.primaryEventId}/response-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_type: "generate_firewall_rule" }),
      });
      if (action?.action?.result_message) {
        responseState.auditTrail.unshift(`12:15 - ${action.action.result_message}`);
      }
    }
    renderWorkflowStatus();
    renderResponseTimeline();
  };

  if (assignee) {
    const options = responseState.assigneeOptions.length
      ? responseState.assigneeOptions.map((item) => `<option value="${item.username}">${item.username}</option>`).join("")
      : '<option value="Unassigned">未指派</option>';
    assignee.innerHTML = options;
    if (![...assignee.options].some((option) => option.value === responseState.assignee)) {
      assignee.insertAdjacentHTML("beforeend", `<option value="${responseState.assignee}">${responseState.assignee}</option>`);
    }
    assignee.value = responseState.assignee;
  }
  if (status) status.value = responseState.status;
  if (type) type.value = responseState.feedbackType;
  if (confidence) confidence.value = responseState.confidenceOverride;
  if (reviewPool) reviewPool.checked = responseState.addReviewPool;
  if (finetunePool) finetunePool.checked = responseState.addFinetunePool;
  if (note) note.value = responseState.feedbackNote;

  assignee?.addEventListener("change", async () => {
    responseState.assignee = assignee.value;
    responseState.auditTrail.unshift(`12:12 - Assignee updated to ${responseState.assignee}.`);
    const user = responseState.assigneeOptions.find((item) => item.username === responseState.assignee);
    if (user && responseState.incidentId) {
      await tryApi(`/ndr/incidents/${responseState.incidentId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee_user_id: user.id }),
      });
    }
    renderWorkflowStatus();
    renderResponseTimeline();
  });

  status?.addEventListener("change", () => {
    responseState.status = status.value;
    responseState.auditTrail.unshift(`12:13 - Incident status changed to ${responseState.status}.`);
    renderWorkflowStatus();
    renderResponseTimeline();
  });

  type?.addEventListener("change", () => {
    responseState.feedbackType = type.value;
    renderFeedbackFlow();
  });

  confidence?.addEventListener("input", () => {
    responseState.confidenceOverride = confidence.value;
    renderFeedbackFlow();
  });

  reviewPool?.addEventListener("change", () => {
    responseState.addReviewPool = reviewPool.checked;
    renderFeedbackSummary();
    renderFeedbackFlow();
  });

  finetunePool?.addEventListener("change", () => {
    responseState.addFinetunePool = finetunePool.checked;
    renderFeedbackSummary();
    renderFeedbackFlow();
  });

  note?.addEventListener("input", () => {
    responseState.feedbackNote = note.value;
  });

  document.querySelectorAll("[data-feedback]").forEach((button) => {
    button.addEventListener("click", () => {
      responseState.feedbackLabel = button.dataset.feedback;
      document.querySelectorAll("[data-feedback]").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      renderFeedbackSummary();
      renderFeedbackFlow();
    });
  });

  document.getElementById("submitFeedbackBtn")?.addEventListener("click", async () => {
    const payload = {
      event_id: responseState.primaryEventId || null,
      incident_id: responseState.incidentId || null,
      analyst_label: responseState.feedbackLabel,
      feedback_type: responseState.feedbackType,
      confidence_override: responseState.confidenceOverride ? Number(responseState.confidenceOverride) : null,
      feedback_note: responseState.feedbackNote,
      add_to_review_pool: responseState.addReviewPool,
      add_to_finetune_pool: responseState.addFinetunePool,
    };
    const result = await tryApi("/ndr/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    responseState.auditTrail.unshift(`12:15 - 分析師已提交判斷：${feedbackLabelDisplayLabel(responseState.feedbackLabel)}。`);
    responseState.nextStep =
      responseState.feedbackLabel === "False Positive"
        ? "降低雜訊並準備結案"
        : responseState.feedbackLabel === "True Positive"
          ? "進入封鎖與控制流程"
          : "先補充更多證據再決定是否處置";
    if (result?.feedback) {
      responseState.savedFeedback.unshift(result.feedback);
      responseState.auditTrail.unshift(`12:16 - 回饋已寫入：${result.feedback.feedback_id}。`);
    }
    if (result?.incident) {
      responseState.status = (result.incident.status || responseState.status).replace(/^\w/, (c) => c.toUpperCase());
    }
    if (responseState.incidentId) {
      const [advisor, reviewHistory] = await Promise.all([
        tryApi(`/review/incidents/${responseState.incidentId}/advisor`),
        tryApi(`/review/incidents/${responseState.incidentId}/history`),
      ]);
      applyAdvisorReviewState(advisor?.review, responseState.advisor);
      responseState.reviewHistory = reviewHistory?.entries || responseState.reviewHistory;
    }
    renderWorkflowStatus();
    renderResponseAdvisor();
    renderDecisionHistory();
    renderResponseTimeline();
    renderFeedbackSummary();
    renderFeedbackFlow();
    renderFeedbackHistory();
  });

  document.querySelectorAll(".artifact-action").forEach((button) => {
    button.addEventListener("click", async () => {
      responseState.auditTrail.unshift(`12:16 - Export action triggered: ${button.textContent}.`);
      const actionKey = button.dataset.artifactAction || "";
      if (actionKey.includes("Create Bundle") && responseState.incidentId) {
        const created = await tryApi(`/ndr/incidents/${responseState.incidentId}/artifact-bundle`, {
          method: "POST",
        });
        if (created?.export) {
          responseState.auditTrail.unshift(`12:17 - Artifact bundle created: ${created.export.file_name}.`);
        }
      } else if (actionKey.includes("Playbook") && responseState.incidentId) {
        const text = await tryApi(`/ndr/incidents/${responseState.incidentId}/playbook-export`, {}, "text");
        if (text) {
          responseState.auditTrail.unshift(`12:17 - Playbook export preview loaded (${text.split("\n").length} lines).`);
        }
      }
      renderResponseTimeline();
    });
  });

  recommendedActionsRoot?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action-title]");
    if (!(button instanceof HTMLElement)) return;
    await handleRecommendedAction(button);
  });

  advisorRoot?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action-title]");
    if (!(button instanceof HTMLElement)) return;
    await handleRecommendedAction(button);
  });
}

async function initResponsePage() {
  await loadResponseFromApi();
  renderResponseContext();
  renderWorkflowStatus();
  renderResponseAdvisor();
  renderDecisionHistory();
  renderResponseTimeline();
  renderPlaybook();
  renderFeedbackSummary();
  renderFeedbackFlow();
  renderFeedbackHistory();
  renderArtifacts();
  bindResponseControls();
}

function bindIncidentFilters() {
  const search = document.getElementById("incidentSearchInput");
  const priority = document.getElementById("incidentPriorityFilter");
  const sla = document.getElementById("incidentSlaFilter");
  const assignee = document.getElementById("incidentAssigneeFilter");
  const status = document.getElementById("incidentStatusFilter");

  const update = () => {
    incidentState.search = search?.value || "";
    incidentState.priority = priority?.value || "all";
    incidentState.sla = sla?.value || "all";
    incidentState.assignee = assignee?.value || "all";
    incidentState.status = status?.value || "all";
    renderSlaWatch();
    renderCandidateQueue();
    renderIncidentQueue();
    renderSelectedIncident();
  };

  [search, priority, sla, assignee, status].forEach((node) => {
    if (!node) return;
    node.addEventListener("input", update);
    node.addEventListener("change", update);
  });
}

function bindIncidentEventLedgerControls() {
  const search = document.getElementById("incidentEventSearchInput");
  const buttons = document.querySelectorAll("[data-event-filter]");
  buttons.forEach((node) => {
    if (node.dataset.eventFilter === incidentEventLedgerFilterState.mode) {
      node.classList.remove("ghost-button");
      node.classList.add("primary-button");
    }
  });

  if (search) {
    search.addEventListener("input", () => {
      incidentEventLedgerFilterState.search = search.value || "";
      renderIncidentEventLedger();
      renderIncidentCommandCenter();
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      incidentEventLedgerFilterState.mode = button.dataset.eventFilter || "all";
      buttons.forEach((node) => {
        if (node.dataset.eventFilter === incidentEventLedgerFilterState.mode) {
          node.classList.remove("ghost-button");
          node.classList.add("primary-button");
        } else {
          node.classList.remove("primary-button");
          node.classList.add("ghost-button");
        }
      });
      renderIncidentEventLedger();
      renderIncidentCommandCenter();
    });
  });
}

async function initIncidentPage() {
  await loadIncidentEventLedgerFromApi();
  renderIncidentEventLedger();
  renderIncidentCommandCenter();
  bindIncidentEventLedgerControls();
}

function bindIntakeControls() {
  const strategy = document.getElementById("strategySelect");
  const model = document.getElementById("modelSelect");
  const route = document.getElementById("routeSelect");
  const task = document.getElementById("taskSelect");
  const ae = document.getElementById("aeToggle");
  const guided = document.getElementById("guidedReviewToggle");
  const csvFileInput = document.getElementById("csvFileInput");
  const netflowFileInput = document.getElementById("netflowFileInput");
  const suricataReplayFileInput = document.getElementById("suricataReplayFileInput");
  const importNetflowBtn = document.getElementById("importNetflowBtn");
  const startCaptureBtn = document.getElementById("startCaptureBtn");
  const stopCaptureBtn = document.getElementById("stopCaptureBtn");

  if (importNetflowBtn) {
    importNetflowBtn.disabled = true;
    importNetflowBtn.title = "NetFlow import is not available in this build.";
  }
  [startCaptureBtn, stopCaptureBtn].forEach((button) => {
    if (!button) return;
    button.disabled = true;
    button.title = "Live packet capture is unavailable in this build.";
  });

  const updateConfig = () => {
    intakeState.strategy = strategy?.value || intakeState.strategy;
    intakeState.model = model?.value || intakeState.model;
    intakeState.route = route?.value || intakeState.route;
    intakeState.task = task?.value || intakeState.task;
    intakeState.ae = Boolean(ae?.checked);
    intakeState.guidedReview = Boolean(guided?.checked);
    renderStrategySummary();
    pushIntakeLog(`Detection strategy updated to ${intakeState.strategy}.`);
  };

  [strategy, model, route, task, ae, guided].forEach((node) => {
    if (node) node.addEventListener("change", updateConfig);
  });

  suricataReplayFileInput?.addEventListener("change", () => {
    if (suricataReplayFileInput.files?.length) {
      intakeState.selectedReplayPath = "";
      renderReplayLibrary("suricataReplayLibrary");
      pushIntakeLog(`Replay upload selected: ${suricataReplayFileInput.files[0].name}.`);
    }
  });

  document.getElementById("suricataInterfaceSelect")?.addEventListener("change", () => {
    if (intakeState.selectedReplayPath) {
      intakeState.selectedReplayPath = "";
      renderReplayLibrary("suricataReplayLibrary");
      pushIntakeLog("Replay selection cleared. Live capture mode restored.");
    }
  });

  document.getElementById("refreshSuricataSensorBtn")?.addEventListener("click", async () => {
    const result = await refreshSuricataSensorStatus();
    if (!result) {
      pushIntakeLog(`Suricata sensor refresh failed: ${lastApiErrorMessage || "unknown backend error"}.`, "error");
      return;
    }
    pushIntakeLog(`Suricata sensor status refreshed: ${getSensorRuntimeLabel()}.`);
  });

  document.getElementById("startSuricataSensorBtn")?.addEventListener("click", async () => {
    pushIntakeLog("Suricata live sensor start requested.");
    const result = await startSuricataSensorFromControls({
      interfaceSelectId: "suricataInterfaceSelect",
      replayUploadInputId: "suricataReplayFileInput",
      logPrefix: "Suricata live sensor",
    });
    if (!result) {
      pushIntakeLog(`Suricata live sensor start failed: ${lastApiErrorMessage || "unknown backend error"}.`, "error");
      return;
    }
    if (suricataReplayFileInput) {
      suricataReplayFileInput.value = "";
    }
  });

  document.getElementById("stopSuricataSensorBtn")?.addEventListener("click", async () => {
    const result = await stopSuricataSensorFromControls({ logPrefix: "Suricata live sensor" });
    if (!result) {
      pushIntakeLog(`Suricata live sensor stop failed: ${lastApiErrorMessage || "unknown backend error"}.`, "error");
    }
  });

  document.getElementById("uploadCsvBtn")?.addEventListener("click", async () => {
    const file = csvFileInput?.files?.[0];
    if (!file) {
      pushIntakeLog("CSV upload blocked: no file selected.", "warning");
      return;
    }
    intakeState.source = "csv";
    renderSourceCards();
    renderStrategySummary();
    pushIntakeLog(`Uploading CSV: ${file.name}`);
    const form = new FormData();
    form.append("file", file);
    form.append("source_type", "auto-detect");
    const result = await tryApi("/ndr/events/upload-csv", { method: "POST", body: form });
    if (!result) {
      pushIntakeLog("CSV upload failed, frontend kept current state.", "error");
      return;
    }
    pushIntakeLog(`CSV uploaded: ${result.observation_count || result.count} rows ingested.`);
    pushIntakeLog(`Detected source type: ${result.source_type}.`);
    pushIntakeLog(`Materialized attack events: ${result.count}.`, result.count ? "alert" : "info");
    updateLatestAnalysis({
      sourceLabel: result.source_type === "netflow_basic" ? "NetFlow Import" : "CSV Import",
      items: result.items || [],
      observationCount: result.observation_count || result.count || 0,
    });
  });

  importNetflowBtn?.addEventListener("click", async () => {
    pushIntakeLog("NetFlow import is not available in this build.", "warning");
  });

  startCaptureBtn?.addEventListener("click", async () => {
    pushIntakeLog("Live packet capture is not available in this build.", "warning");
  });

  stopCaptureBtn?.addEventListener("click", async () => {
    pushIntakeLog("Live packet capture is not available in this build.", "warning");
  });

}

async function initIntakePage() {
  if (currentUserIsAdmin()) {
    await refreshSuricataSensorStatus();
  } else {
    resetSensorRuntimeData();
  }
  const existingEvents = await tryApi("/ndr/events");
  if ((existingEvents?.items?.length || 0) > 0) {
    updateLatestAnalysis({
      sourceLabel: "近期平台攻擊事件",
      items: (existingEvents?.items || []).slice(0, 12),
      observationCount: existingEvents?.items?.length || 0,
    });
  }
  renderSourceCards();
  renderStrategySummary();
  renderLatestAnalysis();
  renderTerminal();
  bindIntakeControls();
}

function openTickerModal(index) {
  const modal = document.getElementById("tickerModal");
  const item = dashboardData.ticker[index];
  if (!modal || !item) return;
  modal.classList.add("open");
  document.getElementById("modalSeverity").className = `severity-pill severity-${item.severity}`;
  document.getElementById("modalSeverity").textContent = item.severity;
  document.getElementById("modalTitle").textContent = item.title;
  document.getElementById("modalDetail").textContent = item.detail;
  document.getElementById("modalIncident").textContent = item.incident;
  document.getElementById("modalResponse").textContent = item.response;
}

function closeTickerModal() {
  const modal = document.getElementById("tickerModal");
  if (modal) modal.classList.remove("open");
}

async function initDashboardPage() {
  await loadDashboardFromApi();
  renderSentinelCommandCenter();
  renderDashboardWindowToggle();
  renderKpis();
  renderRiskGauge();
  renderMaterializationFunnel();
  renderMetricsHealth();
  renderConflictDistribution();
  renderTopology();
  renderThreatTrend();
  renderTicker();
  renderAdaptation();
  renderOptimizationStatus();
  renderOptimizationHistory();
  renderTables();

  const closeButton = document.getElementById("closeModal");
  if (closeButton) closeButton.addEventListener("click", closeTickerModal);

  const modal = document.getElementById("tickerModal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeTickerModal();
    });
  }

  window.addEventListener("resize", renderThreatTrend);
}

function initPlaceholderPage() {
  const page = document.body.dataset.page || "dashboard";
  const root = document.getElementById("pagePlaceholders");
  if (!root) return;

  const templates = {
    intake: `
      <article class="placeholder-panel">
        <h3>Data Intake Role</h3>
        <p>This page is the real detection entry point. It receives CSV, NetFlow, Suricata, and live capture telemetry before forwarding data into feature alignment and the detection strategy.</p>
      </article>
      <article class="placeholder-panel">
        <h3>Next Build Items</h3>
        <ul>
          <li>Source selector with CSV, NetFlow, Suricata, and Capture.</li>
          <li>Pre-ingestion validation and schema summary.</li>
          <li>Persisted intake validation tied to the active backend schema.</li>
          <li>Detection strategy selector linked to TransferIDS stages.</li>
        </ul>
      </article>
    `,
    incidents: `
      <article class="placeholder-panel">
        <h3>Incident Queue Role</h3>
        <p>This page will prioritize grouped cases using incident risk, SLA pressure, adaptation context, and response readiness so analysts can decide what to handle first.</p>
      </article>
      <article class="placeholder-panel">
        <h3>Next Build Items</h3>
        <ul>
          <li>Table-first incident queue with filter bar.</li>
          <li>SLA watch strip and response candidate queue.</li>
          <li>Drill-down into incident details and case header view.</li>
          <li>Integration with feedback loop and target review pool.</li>
        </ul>
      </article>
    `,
    response: `
      <article class="placeholder-panel">
        <h3>Response Center Role</h3>
        <p>This page will turn selected incidents into containment tasks, rule generation, response notes, exportable evidence, and analyst feedback actions.</p>
      </article>
      <article class="placeholder-panel">
        <h3>Next Build Items</h3>
        <ul>
          <li>Action queue with priority ordering.</li>
          <li>Firewall rule preview and export panel.</li>
          <li>Playbook guidance and artifact bundle generation.</li>
          <li>Feedback loop into weak-supervision review and target-assisted fine-tuning queues.</li>
        </ul>
      </article>
    `,
    insights: `
      <article class="placeholder-panel">
        <h3>Insights Role</h3>
        <p>This page will hold advanced diagnostics only. It keeps research detail away from the main dashboard while still exposing confidence, drift, comparative performance, and adaptation evidence.</p>
      </article>
      <article class="placeholder-panel">
        <h3>Next Build Items</h3>
        <ul>
          <li>Confidence breakdown and data health summaries.</li>
          <li>Adaptation gain drill-down with stage comparison.</li>
          <li>Drift diagnostics and reliability warnings.</li>
          <li>Autoencoder-enhanced performance context for research users.</li>
        </ul>
      </article>
    `,
    reports: `
      <article class="placeholder-panel">
        <h3>Reports Role</h3>
        <p>This page will produce operator-facing and research-facing outputs, including incident summaries, exported evidence, firewall rule sets, and model comparison reports.</p>
      </article>
      <article class="placeholder-panel">
        <h3>Next Build Items</h3>
        <ul>
          <li>Artifact bundle history table.</li>
          <li>TXT / PDF incident report export panel.</li>
          <li>Firewall rule export templates.</li>
          <li>Research report output for thesis-linked diagnostics.</li>
        </ul>
      </article>
    `,
    settings: `
      <article class="placeholder-panel">
        <h3>Settings Role</h3>
        <p>This page will monitor users, collectors, active detection strategy, and operational controls without exposing deep research detail to everyday users.</p>
      </article>
      <article class="placeholder-panel">
        <h3>Next Build Items</h3>
        <ul>
          <li>User roles and access scope.</li>
          <li>Collector health and ingestion status.</li>
          <li>Detection strategy registry and runtime health.</li>
          <li>Operational refresh actions and thresholds.</li>
        </ul>
      </article>
    `,
  };

  root.innerHTML = templates[page] || "";
}

async function initApp() {
  startLocalization();
  if (!isLoginPage() && isAuthenticated()) {
    const authOk = await syncAuthenticatedUser();
    if (!authOk) return;
  }
  requireAuth();
  setActiveNav();
  initResponsiveSidebar();
  setCurrentTime();
  setInterval(setCurrentTime, 1000);
  hydrateUserPills();
  applyRoleBasedUiAccess();
  ensureLogoutControls();

  if (document.body.dataset.page === "login") {
    initLoginPage();
    scheduleLocalizationPass();
    return;
  }

  if (document.body.dataset.page === "dashboard") {
    await initDashboardPage();
  } else if (document.body.dataset.page === "intake") {
    await initIntakePage();
  } else if (document.body.dataset.page === "incidents") {
    await initIncidentPage();
  } else if (document.body.dataset.page === "response") {
    await initResponsePage();
  } else if (document.body.dataset.page === "learning-queue") {
    await initLearningQueuePage();
  } else if (document.body.dataset.page === "insights") {
    await initInsightsPage();
  } else if (document.body.dataset.page === "reports") {
    await initReportsPage();
  } else if (document.body.dataset.page === "settings") {
    await initSettingsPage();
  } else {
    initPlaceholderPage();
  }

  runWhenIdle(() => startRealtimeFeed(), 700);
  runWhenIdle(() => bootstrapAutomaticDetection(), 1200);
  scheduleLocalizationPass();
}

document.addEventListener("DOMContentLoaded", initApp);
