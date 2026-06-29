/* ===================================================================
   HỆ THỐNG KIỂM KÊ VẬT TƯ — CÔNG TY TNHH TM-SX HUỆ LINH
   Phiên bản V1.0 — Chuẩn hóa dữ liệu ERP Bravo
   Lưu trữ Local-first (localStorage) và đồng bộ Google Sheets thời gian thực.
   =================================================================== */

// Global state variables
// Local Storage Keys
const LS_KEYS = {
  COUNTS: 'hl_kk_counts',
  BOOK_STOCK: 'hl_kk_book_stock',
  CONFIG: 'hl_kk_config'
};

// Global state variables
let currentView = 'dashboard';
let counts = []; // list of recorded counts: {id, ngay, kho, vitri, ma_erp, ma_qr, ten_hang, dvt, loai, nhom, ma_cu, so_luong, tinh_trang, hsd, ghichu, nguoi_kiem, nguoi_kiem_ma, sync_status, sync_time}
let bookStock = {}; // book value stock dictionary: {ma_erp: quantity}
let config = { mode: 'local', sheetUrl: '' };
let currentSelectedProduct = null;
let html5QrCode = null;

// Pagination and Grid filter state for Kiem Ke view
let kkPage = 1;
const kkPageSize = 15;

// === PERFORMANCE OPTIMIZATION: Search Index ===
const SearchIndex = (function() {
  let indexedData = null;
  let searchableStrings = [];

  function buildIndex(items) {
    indexedData = items;
    searchableStrings = items.map(item =>
      `${item.ma_erp} ${item.ma_qr} ${item.ten_hang} ${item.ten_cu} ${item.ma_cu} ${item.ma_erp_full || ''} ${item.nhom} ${item.dvt}`.toLowerCase()
    );
  }

  function search(query) {
    if (!query || !indexedData) return [];
    const q = query.toLowerCase().trim();
    const results = [];
    const maxResults = 30;

    for (let i = 0; i < searchableStrings.length && results.length < maxResults; i++) {
      if (searchableStrings[i].includes(q)) {
        results.push(indexedData[i]);
      }
    }
    return results;
  }

  return { buildIndex, search };
})();

// === DEBOUNCE & LOADING STATE ===
let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 300;
let isSearchLoading = false;

// Keyboard navigation state
let focusedSearchIndex = -1;

// Highlight matching text in search results
function highlightMatch(text, query) {
  if (!query) return sanitize(text);
  const lowerText = String(text).toLowerCase();
  const lowerQuery = query.toLowerCase();
  const startIdx = lowerText.indexOf(lowerQuery);
  if (startIdx === -1) return sanitize(text);

  const endIdx = startIdx + query.length;
  const before = sanitize(text.slice(0, startIdx));
  const match = sanitize(text.slice(startIdx, endIdx));
  const after = sanitize(text.slice(endIdx));

  return `${before}<mark>${match}</mark>${after}`;
}

// Utilities
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function generateUid() { return 'kk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); }
function sanitize(str) { return (str === null || str === undefined) ? '' : String(str).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function fmtDate(isoStr) { if (!isoStr) return ''; const p = isoStr.split('T')[0].split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : isoStr; }
function toast(msg, type = 'info') {
  const t = $('#toast');
  const txt = $('#toastText');
  const icon = $('#toastIcon');
  if (!t || !txt) return;
  txt.textContent = msg;
  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  t.style.backgroundColor = type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : '#1e293b';
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3000);
}

// Evaluate numeric formula safely
function evaluateFormula(str) {
  if (!str) return 0;
  const sanitized = str.replace(/[^0-9+\-*/().]/g, '');
  if (!sanitized) return 0;
  try {
    const res = new Function(`return (${sanitized});`)();
    return isNaN(res) || !isFinite(res) ? 0 : Number(res);
  } catch (e) {
    return 0;
  }
}

// Local Storage Handlers
const Storage = {
  get(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

// Authentication Flow
function loadUsersDropdown() {
  const sel = $('#loginUser');
  if (!sel) return;
  
  const ns = window.NHAN_SU_DEFAULT || [];
  let html = '<option value="">— Chọn tên nhân sự —</option>';
  html += '<option value="admin">👨‍💼 Kế toán quản trị (Admin/Phó Ban)</option>';
  html += '<option value="truong">👔 Liều Sì Trường (Trưởng Ban)</option>';
  
  // Group workers by department
  const byDept = {};
  ns.forEach(n => {
    (byDept[n.phongban] = byDept[n.phongban] || []).push(n);
  });

  Object.entries(byDept).forEach(([dept, list]) => {
    html += `<optgroup label="${dept}">`;
    list.forEach(n => {
      if (n.manv) {
        html += `<option value="${n.manv}">${n.hoten} (${n.manv} - ${n.chucvu})</option>`;
      }
    });
    html += `</optgroup>`;
  });
  
  sel.innerHTML = html;
}

function doLoginAction(e) {
  if (e) e.preventDefault();
  const usr = $('#loginUser').value;
  const pass = $('#loginPass').value;
  const err = $('#loginError');
  
  if (!usr) {
    err.textContent = 'Vui lòng chọn nhân sự kiểm kê';
    return false;
  }
  
  const res = window.AUTH.login(usr, pass);
  if (res.success) {
    err.textContent = '';
    $('#loginPass').value = '';
    $('#loginOverlay').style.display = 'none';
    toast(`Đăng nhập thành công: ${res.user.hoten}`, 'success');
    updateSidebarByRole();
    updateUserDisplay();
    switchView('dashboard');
  } else {
    err.textContent = res.message;
  }
}

function doLogoutAction() {
  window.AUTH.logout();
  $('#loginOverlay').style.display = 'flex';
  updateUserDisplay();
  toast('Đã đăng xuất khỏi hệ thống');
}

function updateUserDisplay() {
  const session = window.AUTH.getSession();
  const topActions = $('#topActions');
  if (!topActions) return;

  if (session) {
    const roleLabels = { admin: 'Admin/Phó Ban', quanly: 'Giám sát', congnhan: 'Tổ kiểm đếm' };
    const roleColor = { admin: 'var(--danger)', quanly: 'var(--warning)', congnhan: 'var(--primary)' };
    
    topActions.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--neutral-light);border-radius:8px;font-size:12px;margin-right:8px">
        <b>${session.user.hoten}</b>
        <span style="color:${roleColor[session.user.role]};font-weight:700">[${roleLabels[session.user.role]}]</span>
        ${session.user.phongban ? `<span class="muted">· ${session.user.phongban}</span>` : ''}
      </span>
      <button class="btn sec sm" onclick="doLogoutAction()">Đăng xuất</button>
    `;
  } else {
    topActions.innerHTML = '';
  }
}

function updateSidebarByRole() {
  const session = window.AUTH.getSession();
  const nav = $('#nav');
  if (!nav || !session) return;

  $$('button', nav).forEach(btn => {
    const view = btn.dataset.view;
    if (view === 'doichieu') {
      // Only Admin and Managers can see the Reconciliation view
      btn.style.display = (session.user.role === 'admin') ? '' : 'none';
    } else {
      btn.style.display = '';
    }
  });
}

// Navigation
function switchView(view) {
  if (!window.AUTH.isAuthenticated()) {
    $('#loginOverlay').style.display = 'flex';
    return;
  }

  const session = window.AUTH.getSession();
  if (view === 'doichieu' && session.user.role !== 'admin') {
    toast('Bạn không có quyền truy cập bảng đối chiếu', 'error');
    return;
  }

  currentView = view;
  
  // Update sidebar active state
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  
  // Update view visibility
  $$('.view').forEach(s => s.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');

  // Stop camera if leaving Kiêm Kê view
  if (view !== 'kiemke') {
    dungScanner();
  }

  // Update headers
  const headers = {
    dashboard: { title: 'Bảng điều khiển', sub: 'Tổng quan tiến độ và cơ cấu số liệu kiểm kê' },
    kiemke: { title: 'Quét mã & Kiểm kê vật tư', sub: 'Công cụ đếm vật tư thực tế tại kho' },
    lichsu: { title: 'Nhật ký kiểm kê', sub: 'Danh sách các lần kiểm đếm đã ghi nhận trên máy này' },
    danhmuc: { title: 'Danh mục vật tư chuẩn hóa', sub: 'Tra cứu nhanh mã hàng, mã vạch ERP Bravo' },
    doichieu: { title: 'Đối chiếu chênh lệch', sub: 'So sánh thực tế đếm với Sổ sách kế toán Bravo' },
    caidat: { title: 'Cấu hình & Đồng bộ', sub: 'Kết nối Google Sheets và sao lưu dữ liệu' }
  };

  $('#viewTitle').textContent = headers[view]?.title || view;
  $('#viewSub').textContent = headers[view]?.sub || '';

  // Trigger view renders
  if (view === 'dashboard') renderDashboard();
  if (view === 'kiemke') renderKiemKe();
  if (view === 'lichsu') renderLichSu();
  if (view === 'danhmuc') renderDanhMuc();
  if (view === 'doichieu') renderDoiChieu();
  if (view === 'caidat') renderCaiDat();
}

// --- VIEW: Dashboard ---
function renderDashboard() {
  const dbTotalCounts = $('#dbTotalCounts');
  const dbTotalQty = $('#dbTotalQty');
  const dbUniqueItems = $('#dbUniqueItems');
  const dbUniqueRatio = $('#dbUniqueRatio');
  const dbDiscrepantItems = $('#dbDiscrepantItems');
  
  // Load data
  counts = Storage.get(LS_KEYS.COUNTS, []);
  bookStock = Storage.get(LS_KEYS.BOOK_STOCK, {});
  
  // Totals
  dbTotalCounts.textContent = counts.length;
  const totalQty = counts.reduce((acc, c) => acc + (c.so_luong || 0), 0);
  dbTotalQty.textContent = totalQty.toLocaleString('vi-VN');
  
  // Dynamic list of unique item units
  const unitsMap = {};
  counts.forEach(c => { unitsMap[c.dvt] = (unitsMap[c.dvt] || 0) + c.so_luong; });
  const unitsStr = Object.entries(unitsMap).map(([dvt, q]) => `${q.toLocaleString('vi-VN')} ${dvt}`).join(' | ');
  $('#dbTotalUnits').textContent = unitsStr || 'Chưa có số liệu';

  // Scanned ratio
  const scannedErpCodes = new Set(counts.map(c => c.ma_cu || c.ma_erp));
  dbUniqueItems.textContent = scannedErpCodes.size;
  const totalMasterCount = (window.VAT_TU_DEFAULT || []).length || 1;
  const scannedRatio = Math.round((scannedErpCodes.size / totalMasterCount) * 100);
  dbUniqueRatio.textContent = `${scannedRatio}% của danh mục (${totalMasterCount} mã)`;

  // Discrepancies count
  let discrepantCount = 0;
  if (Object.keys(bookStock).length > 0) {
    // Map aggregated actual counts
    const actualMap = {};
    counts.forEach(c => { 
      const code = c.ma_cu || c.ma_erp;
      actualMap[code] = (actualMap[code] || 0) + c.so_luong; 
    });
    
    // Check discrepant
    const allUniqueErp = new Set([...Object.keys(bookStock), ...Object.keys(actualMap)]);
    allUniqueErp.forEach(code => {
      const book = bookStock[code] || 0;
      const actual = actualMap[code] || 0;
      if (book !== actual) discrepantCount++;
    });
    $('#dbReconCard').style.display = '';
  } else {
    $('#dbReconCard').style.display = 'none';
  }
  dbDiscrepantItems.textContent = discrepantCount;

  // Warehouses progress
  const whProgress = $('#dbWarehouseProgress');
  const whCounts = {};
  const whUnique = {};
  counts.forEach(c => {
    whCounts[c.kho] = (whCounts[c.kho] || 0) + c.so_luong;
    whUnique[c.kho] = whUnique[c.kho] || new Set();
    whUnique[c.kho].add(c.ma_cu || c.ma_erp);
  });
  
  const khos = window.KHO_DEFAULT || [];
  let whHtml = '';
  khos.forEach(k => {
    const code = k.makho;
    const name = k.tenkho;
    const qty = whCounts[code] || 0;
    const unique = whUnique[code] ? whUnique[code].size : 0;
    
    // Render progress row
    const maxVal = Math.max(...Object.values(whCounts), 100);
    whHtml += barRowHTML(name, qty, maxVal, 'var(--primary)', `${qty.toLocaleString('vi-VN')} (${unique} mặt hàng)`);
  });
  whProgress.innerHTML = whHtml || '<p class="muted">Chưa có số liệu đếm tại các kho.</p>';

  // Condition Chart
  const condProgress = $('#dbConditionChart');
  const condCounts = { tot: 0, kem: 0, thanhly: 0 };
  counts.forEach(c => {
    if (condCounts[c.tinh_trang] !== undefined) condCounts[c.tinh_trang] += c.so_luong;
  });
  const condMax = Math.max(condCounts.tot, condCounts.kem, condCounts.thanhly, 1);
  let condHtml = '';
  condHtml += barRowHTML('🔴 Phế phẩm/Thanh lý', condCounts.thanhly, condMax, 'var(--danger)', condCounts.thanhly.toLocaleString('vi-VN'));
  condHtml += barRowHTML('🟡 Chất lượng kém', condCounts.kem, condMax, 'var(--warning)', condCounts.kem.toLocaleString('vi-VN'));
  condHtml += barRowHTML('🟢 Chất lượng tốt', condCounts.tot, condMax, 'var(--success)', condCounts.tot.toLocaleString('vi-VN'));
  condProgress.innerHTML = condHtml;

  // Recent counts logs
  const recentTable = $('#dbRecentCounts');
  const sorted = counts.slice().sort((a, b) => b.id.localeCompare(a.id)).slice(0, 8);
  
  let recentHtml = '';
  if (sorted.length > 0) {
    sorted.forEach(c => {
      const statusLabels = { tot: '🟢 Tốt', kem: '🟡 Kém', thanhly: '🔴 Hỏng' };
      const condBadge = statusLabels[c.tinh_trang] || c.tinh_trang;
      
      const whName = getWarehouseName(c.kho);
      const whDisp = c.vitri ? `${whName} / ${c.vitri}` : whName;
      
      recentHtml += `
        <tr>
          <td class="muted">${new Date(c.sync_time || c.id.split('_')[1] * 1).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</td>
          <td><b>${sanitize(whDisp)}</b></td>
          <td><code>${sanitize(c.ma_cu || c.ma_erp)}</code></td>
          <td>${sanitize(c.ten_hang)}</td>
          <td class="right"><b>${c.so_luong.toLocaleString('vi-VN')}</b></td>
          <td class="center muted">${sanitize(c.dvt)}</td>
          <td>${sanitize(c.nguoi_kiem)}</td>
          <td class="center">${condBadge}</td>
        </tr>
      `;
    });
  } else {
    recentHtml = `<tr><td colspan="8" class="center muted">Chưa ghi nhận lần kiểm đếm nào.</td></tr>`;
  }
  recentTable.innerHTML = recentHtml;
}

function barRowHTML(label, val, max, color, displayVal) {
  const pct = max ? Math.min(100, (val / max) * 100) : 0;
  return `
    <div class="bar-row">
      <div class="bl">${sanitize(label)}</div>
      <div class="bt">
        <div class="bf" style="width:${pct}%;background:${color}">${displayVal}</div>
      </div>
    </div>
  `;
}

function getWarehouseName(code) {
  const khos = window.KHO_DEFAULT || [];
  const found = khos.find(k => k.makho === code);
  return found ? found.tenkho : code;
}

// --- VIEW: Scan & Count ---
let currentSearchList = [];
let searchLoadingTimer = null;

function renderKiemKe() {
  // Load warehouse select
  const whSel = $('#kk_kho');
  const khos = window.KHO_DEFAULT || [];
  let whHtml = '';
  khos.forEach(k => {
    whHtml += `<option value="${k.makho}">${k.tenkho} (${k.makho})</option>`;
  });
  whSel.innerHTML = whHtml;

  // Load position suggestions from recent entries
  const datalist = $('#suggest_vitri');
  const posSet = new Set();
  counts.forEach(c => { if (c.vitri) posSet.add(c.vitri); });
  let datalistHtml = '';
  posSet.forEach(p => { datalistHtml += `<option value="${sanitize(p)}">`; });
  datalist.innerHTML = datalistHtml;

  // Set default warehouse to NVL if available
  if (whSel.querySelector('option[value="NVL"]')) {
    whSel.value = 'NVL';
  }

  // Populate group dropdown filter
  updateGroupFilters();

  // Load table list
  kkPage = 1;
  renderMaterialTable();

  // Listeners
  whSel.onchange = () => {
    kkPage = 1;
    updateGroupFilters();
    renderMaterialTable();
  };

  $('#kk_vitri').oninput = () => {
    renderMaterialTable();
  };

  $('#kk_search').oninput = () => {
    kkPage = 1;
    renderMaterialTable();
  };

  $('#kk_group_filter').onchange = () => {
    kkPage = 1;
    renderMaterialTable();
  };

  $('#btnKkPrevPage').onclick = () => {
    if (kkPage > 1) {
      kkPage--;
      renderMaterialTable();
    }
  };

  $('#btnKkNextPage').onclick = () => {
    kkPage++;
    renderMaterialTable();
  };

  function updateGroupFilters() {
    const wh = whSel.value;
    const whItems = (window.VAT_TU_DEFAULT || []).filter(item => item.kho === wh);
    const groups = [...new Set(whItems.map(item => item.nhom).filter(g => g))].sort();
    
    let html = '<option value="">— Tất cả nhóm —</option>';
    groups.forEach(g => {
      html += `<option value="${sanitize(g)}">${sanitize(g)}</option>`;
    });
    $('#kk_group_filter').innerHTML = html;
  }

  // Save/Reset count binds
  $('#btnSaveCount').onclick = saveCountRecord;
  $('#btnResetCount').onclick = cancelCountRecord;
}

function renderMaterialTable() {
  const wh = $('#kk_kho').value;
  const pos = $('#kk_vitri').value.trim();
  const query = $('#kk_search').value.trim().toLowerCase();
  const group = $('#kk_group_filter').value;
  
  let filtered = (window.VAT_TU_DEFAULT || []).filter(item => item.kho === wh);
  if (group) {
    filtered = filtered.filter(item => item.nhom === group);
  }
  if (query) {
    filtered = filtered.filter(item => 
      (item.ten_hang && item.ten_hang.toLowerCase().includes(query)) ||
      (item.ma_erp && item.ma_erp.toLowerCase().includes(query)) ||
      (item.ma_cu && item.ma_cu.toLowerCase().includes(query)) ||
      (item.ma_erp_full && item.ma_erp_full.toLowerCase().includes(query))
    );
  }
  
  const total = filtered.length;
  const startIdx = (kkPage - 1) * kkPageSize;
  const endIdx = Math.min(startIdx + kkPageSize, total);
  const pageItems = filtered.slice(startIdx, endIdx);
  
  const pText = $('#kkPaginationText');
  if (pText) {
    pText.textContent = total > 0 
      ? `Hiển thị ${startIdx + 1} - ${endIdx} của ${total} vật tư` 
      : 'Không có vật tư nào';
  }
    
  $('#btnKkPrevPage').disabled = (kkPage <= 1);
  $('#btnKkNextPage').disabled = (endIdx >= total);
  
  const body = $('#kkMaterialTableBody');
  if (!body) return;
  
  // Reload counts and bookStock to be fresh
  counts = Storage.get(LS_KEYS.COUNTS, []);
  bookStock = Storage.get(LS_KEYS.BOOK_STOCK, {});
  
  let html = '';
  if (pageItems.length > 0) {
    pageItems.forEach(item => {
      // With new ERP data: ma_erp = ERP Final code, ma_cu = old code
      const primaryCode = item.ma_erp;  // ERP Final is the primary display code
      
      // Get book stock: keyed by ma_erp (ERP Final)
      const bookQty = bookStock[item.ma_erp] !== undefined ? bookStock[item.ma_erp]
                    : bookStock[item.ma_cu]   !== undefined ? bookStock[item.ma_cu]
                    : 0;
      
      // Sum actual counted quantity for this warehouse (all positions)
      // If a position filter is applied, only count matching positions; otherwise show total for warehouse
      const itemCounts = counts.filter(c => 
        (c.ma_cu === item.ma_cu || c.ma_erp === item.ma_erp || c.ma_cu === item.ma_erp || c.ma_erp === item.ma_cu) && 
        c.kho === wh &&
        (pos === '' || (c.vitri || '').trim() === pos)
      );
      const actualQty = itemCounts.reduce((sum, c) => sum + (c.so_luong || 0), 0);
      
      const isCounted = actualQty > 0;
      const rowStyle = isCounted ? 'background-color: #f0fdf4;' : '';
      const actualDisp = isCounted 
        ? `<b style="color: var(--success)">🟢 ${actualQty.toLocaleString('vi-VN')}</b>` 
        : '<span class="muted">—</span>';
        
      html += `
        <tr style="${rowStyle}">
          <td><b><code>${sanitize(primaryCode)}</code></b>${item.ma_cu ? `<br><small class="muted">${sanitize(item.ma_cu)}</small>` : ''}</td>
          <td>${sanitize(item.ten_hang)}</td>
          <td class="center muted">${sanitize(item.dvt)}</td>
          <td style="font-size: 12px;" class="muted">${sanitize(item.nhom || 'Chưa nhóm')}</td>
          <td class="right text-muted">${bookQty > 0 ? bookQty.toLocaleString('vi-VN') : '—'}</td>
          <td class="right">${actualDisp}</td>
          <td class="center no-print">
            <button class="btn sm" onclick="selectProductFromTable('${sanitize(item.ma_erp)}')">
              ${isCounted ? '📝 Sửa' : '🎯 Đếm'}
            </button>
          </td>
        </tr>
      `;
    });
  } else {
    html = `<tr><td colspan="7" class="center muted">Không có vật tư nào khớp bộ lọc.</td></tr>`;
  }
  body.innerHTML = html;
}

function selectProductFromTable(ma_erp) {
  const master = window.VAT_TU_DEFAULT || [];
  const found = master.find(item => item.ma_erp === ma_erp);
  if (found) {
    selectProduct(found);
  }
}

// Bind to window for global onclick scope
window.selectProductFromTable = selectProductFromTable;

function selectProduct(product) {
  currentSelectedProduct = product;
  
  const spotlight = $('#itemSpotlight');
  const inputCard = $('#countInputCard');
  
  // Display product info in spotlight
  $('#sl_name').textContent = product.ten_hang;
  $('#sl_ma_erp').textContent = product.ma_erp;  // Primary: ERP Final code
  $('#sl_ma_qr').textContent = product.ma_qr;
  $('#sl_dvt').textContent = product.dvt;
  $('#sl_nhom').textContent = product.nhom || 'Chưa nhóm';
  
  // Show old code (ma_cu) as secondary reference
  if (product.ma_cu && product.ma_cu !== product.ma_erp) {
    $('#sl_ma_cu_container').style.display = '';
    $('#sl_ma_cu').textContent = product.ma_cu;  // Old/legacy barcode
  } else {
    $('#sl_ma_cu_container').style.display = 'none';
  }

  // Pre-fill location if defined in master item record
  if (product.vitri) {
    const posInput = $('#kk_vitri');
    if (!posInput.value) {
      posInput.value = product.vitri;
    }
  }

  spotlight.style.display = 'block';
  inputCard.style.display = 'block';
  
  // Pre-fill form fields if count already exists
  const wh = $('#kk_kho').value;
  const pos = $('#kk_vitri').value.trim();
  const session = window.AUTH.getSession();
  
  counts = Storage.get(LS_KEYS.COUNTS, []);
  const existing = counts.find(c => 
    (c.ma_cu === product.ma_cu || c.ma_erp === product.ma_erp || c.ma_cu === product.ma_erp || c.ma_erp === product.ma_cu) && 
    c.kho === wh && 
    (c.vitri || '').trim() === pos &&
    c.nguoi_kiem_ma === session.user.username
  );

  if (existing) {
    $('#kk_qty').value = existing.so_luong;
    $('#kk_tinhtrang').value = existing.tinh_trang;
    $('#kk_hsd').value = existing.hsd || '';
    $('#kk_ghichu').value = existing.ghichu || '';
  } else {
    $('#kk_qty').value = '';
    $('#kk_tinhtrang').value = 'tot';
    $('#kk_hsd').value = '';
    $('#kk_ghichu').value = '';
  }
  
  // Set focus to quantity input
  $('#kk_qty').focus();
}

function pressCalc(char) {
  const qtyInput = $('#kk_qty');
  if (!qtyInput) return;
  
  let val = qtyInput.value;
  if (char === 'C') {
    qtyInput.value = '';
  } else if (char === '=') {
    const evaluated = evaluateFormula(val);
    qtyInput.value = evaluated ? evaluated : 0;
  } else {
    qtyInput.value = val + char;
  }
}

// Camera Scanner Stubs (Left empty to prevent ReferenceErrors)
function xuLyQuetThanhCong(decodedText) {}
function batScanner() {}
function dungScanner() {}

function saveCountRecord() {
  const wh = $('#kk_kho').value;
  const pos = $('#kk_vitri').value.trim();
  const qtyStr = $('#kk_qty').value.trim();
  const cond = $('#kk_tinhtrang').value;
  const hsd = $('#kk_hsd').value;
  const notes = $('#kk_ghichu').value.trim();

  if (!wh) { toast('Vui lòng chọn Kho hàng', 'error'); return; }
  if (!pos) { toast('Vui lòng nhập vị trí', 'error'); return; }
  if (!qtyStr) { toast('Vui lòng nhập số lượng kiểm đếm', 'error'); return; }
  if (!currentSelectedProduct) { toast('Vui lòng chọn vật tư hàng hóa', 'error'); return; }

  const qty = evaluateFormula(qtyStr);
  if (qty <= 0) {
    toast('Số lượng kiểm đếm phải lớn hơn 0', 'error');
    return;
  }

  const session = window.AUTH.getSession();
  
  // Save local
  counts = Storage.get(LS_KEYS.COUNTS, []);
  
  const existingIdx = counts.findIndex(c => 
    (c.ma_cu === currentSelectedProduct.ma_cu || c.ma_erp === currentSelectedProduct.ma_erp || c.ma_cu === currentSelectedProduct.ma_erp || c.ma_erp === currentSelectedProduct.ma_cu) && 
    c.kho === wh && 
    (c.vitri || '').trim() === pos &&
    c.nguoi_kiem_ma === session.user.username
  );

  let targetRec;
  if (existingIdx !== -1) {
    // Update existing
    counts[existingIdx].so_luong = qty;
    counts[existingIdx].tinh_trang = cond;
    counts[existingIdx].hsd = hsd;
    counts[existingIdx].ghichu = notes;
    counts[existingIdx].sync_status = 'unsynced';
    counts[existingIdx].sync_time = new Date().toISOString();
    targetRec = counts[existingIdx];
    toast(`✓ Đã cập nhật đếm: ${qty} ${targetRec.dvt} cho ${targetRec.ten_hang}`, 'success');
  } else {
    // Add new
    targetRec = {
      id: generateUid(),
      ngay: new Date().toISOString().slice(0, 10),
      kho: wh,
      vitri: pos,
      ma_erp: currentSelectedProduct.ma_erp,
      ma_qr: currentSelectedProduct.ma_qr,
      ten_hang: currentSelectedProduct.ten_hang,
      dvt: currentSelectedProduct.dvt,
      loai: currentSelectedProduct.loai,
      nhom: currentSelectedProduct.nhom,
      ma_cu: currentSelectedProduct.ma_cu,
      so_luong: qty,
      tinh_trang: cond,
      hsd: hsd,
      ghichu: notes,
      nguoi_kiem: session.user.hoten,
      nguoi_kiem_ma: session.user.username,
      sync_status: 'unsynced',
      sync_time: new Date().toISOString()
    };
    counts.push(targetRec);
    toast(`✓ Đã ghi nhận đếm: ${qty} ${targetRec.dvt} cho ${targetRec.ten_hang}`, 'success');
  }
  
  Storage.set(LS_KEYS.COUNTS, counts);
  
  // Auto sync if Google Sheets is enabled
  const cfg = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  if (cfg.mode === 'sheet' && cfg.sheetUrl) {
    syncSingleRecord(targetRec);
  }

  // Reset inputs & refresh material table
  cancelCountRecord();
  renderMaterialTable();
}

function cancelCountRecord() {
  currentSelectedProduct = null;
  $('#itemSpotlight').style.display = 'none';
  $('#countInputCard').style.display = 'none';
  $('#kk_qty').value = '';
  $('#kk_ghichu').value = '';
  $('#kk_hsd').value = '';
}

// Unrecognized item declarations
function openKhaiBaoHangLa(prefilledQr = '') {
  // Populate warehouse option dropdown in the modal
  const mKho = $('#hl_kho');
  const khos = window.KHO_DEFAULT || [];
  let whHtml = '';
  khos.forEach(k => {
    whHtml += `<option value="${k.makho}">${k.tenkho} (${k.makho})</option>`;
  });
  mKho.innerHTML = whHtml;

  $('#hl_ten').value = '';
  $('#hl_qty').value = '';
  $('#hl_vitri').value = $('#kk_vitri').value;
  $('#hl_ghichu').value = prefilledQr ? `Mã vạch quét được: ${prefilledQr}` : '';
  
  $('#modalHangLa').style.display = 'flex';
}

function closeKhaiBaoHangLa() {
  $('#modalHangLa').style.display = 'none';
}

function saveHangLa() {
  const kho = $('#hl_kho').value;
  const vitri = $('#hl_vitri').value.trim();
  const ten = $('#hl_ten').value.trim();
  const dvt = $('#hl_dvt').value;
  const qtyVal = $('#hl_qty').value;
  const cond = $('#hl_tinhtrang').value;
  const ghichu = $('#hl_ghichu').value.trim();

  if (!vitri) { toast('Nhập vị trí', 'error'); return; }
  if (!ten) { toast('Mô tả tên hàng lạ', 'error'); return; }
  if (!qtyVal) { toast('Nhập số lượng đếm', 'error'); return; }
  
  const qty = Number(qtyVal);
  if (qty <= 0) { toast('Số lượng phải lớn hơn 0', 'error'); return; }

  const session = window.AUTH.getSession();
  
  // Auto generate temp code: TEMP-LOAI-STT
  const tempCode = 'TEMP-LA-' + Date.now().toString().substr(-5);
  
  const rec = {
    id: generateUid(),
    ngay: new Date().toISOString().slice(0, 10),
    kho: kho,
    vitri: vitri,
    ma_erp: tempCode,
    ma_qr: tempCode,
    ten_hang: `[HÀNG LẠ] ${ten}`,
    dvt: dvt,
    loai: 'PP', // Scrap / Extra category
    nhom: 'Hàng ngoài danh mục',
    ma_cu: '',
    so_luong: qty,
    tinh_trang: cond,
    hsd: '',
    ghichu: ghichu,
    nguoi_kiem: session.user.hoten,
    nguoi_kiem_ma: session.user.username,
    sync_status: 'unsynced',
    sync_time: new Date().toISOString()
  };

  counts = Storage.get(LS_KEYS.COUNTS, []);
  counts.push(rec);
  Storage.set(LS_KEYS.COUNTS, counts);

  toast(`✓ Khai báo thành công hàng lạ: ${tempCode}`, 'success');

  const cfg = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  if (cfg.mode === 'sheet' && cfg.sheetUrl) {
    syncSingleRecord(rec);
  }

  closeKhaiBaoHangLa();
  renderDashboard();
}

// --- VIEW: Count History ---
function renderLichSu() {
  counts = Storage.get(LS_KEYS.COUNTS, []);
  const body = $('#histTableBody');
  if (!body) return;

  // Sort by time descending
  const sorted = counts.slice().sort((a, b) => b.id.localeCompare(a.id));

  let html = '';
  if (sorted.length > 0) {
    sorted.forEach((c, idx) => {
      const isSynced = c.sync_status === 'synced';
      const syncBadge = isSynced 
        ? `<span class="badge b-tot">Đã sync</span>` 
        : `<span class="badge b-unsync" style="cursor:pointer;" onclick="syncSingleRecordFromTable('${c.id}')">Chờ sync ⬆</span>`;
      
      const condLabels = { tot: 'Tốt', kem: 'Kém', thanhly: 'Hỏng' };
      const condColor = { tot: 'var(--success)', kem: 'var(--warning)', thanhly: 'var(--danger)' };
      const condText = condLabels[c.tinh_trang] || c.tinh_trang;
      const condColorVal = condColor[c.tinh_trang] || '#333';
      
      const timeStr = new Date(c.sync_time || c.id.split('_')[1] * 1).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit'});

      html += `
        <tr>
          <td class="muted">${timeStr}</td>
          <td><b>${sanitize(getWarehouseName(c.kho))}</b>${c.vitri ? ` / ` + sanitize(c.vitri) : ''}</td>
          <td><code>${sanitize(c.ma_cu || c.ma_erp)}</code></td>
          <td>${sanitize(c.ten_hang)}</td>
          <td class="right"><b>${c.so_luong.toLocaleString('vi-VN')}</b></td>
          <td class="center muted">${sanitize(c.dvt)}</td>
          <td class="center" style="font-weight: 700; color: ${condColorVal};">${condText}</td>
          <td class="muted">${sanitize(c.ghichu)}</td>
          <td class="center">${syncBadge}</td>
          <td class="center no-print">
            <button class="btn sm sec" onclick="suaPhieuDem('${c.id}')">Sửa</button>
            <button class="btn sm danger" onclick="xoaPhieuDem('${c.id}')">Xóa</button>
          </td>
        </tr>
      `;
    });
  } else {
    html = `<tr><td colspan="10" class="center muted">Không có bản ghi nào được tìm thấy trên thiết bị này.</td></tr>`;
  }
  body.innerHTML = html;
}

function suaPhieuDem(id) {
  const item = counts.find(c => c.id === id);
  if (!item) return;

  const newQtyStr = prompt(`Sửa số lượng đếm cho mặt hàng:\n${item.ten_hang}\n\nNhập số lượng mới:`, item.so_luong);
  if (newQtyStr === null) return;

  const newQty = evaluateFormula(newQtyStr);
  if (newQty <= 0) {
    toast('Số lượng mới không hợp lệ', 'error');
    return;
  }

  // Update in array
  item.so_luong = newQty;
  item.sync_status = 'unsynced'; // Needs re-sync
  item.sync_time = new Date().toISOString();
  
  Storage.set(LS_KEYS.COUNTS, counts);
  toast('✓ Đã cập nhật số lượng', 'success');
  
  // Re-sync if enabled
  const cfg = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  if (cfg.mode === 'sheet' && cfg.sheetUrl) {
    // Send an update or delete & insert. The GAS Script handles updates if we sync the updated ID.
    // Our GAS script dedups by ID, so if it exists, it ignores.
    // In a real database, we would update. For simplicity in GAS with appendRow, we ask them to clear the sheets in Excel, or we send a request.
    // Let's call standard sync.
    syncSingleRecord(item);
  }
  
  renderLichSu();
}

function xoaPhieuDem(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa bản ghi kiểm đếm này?')) return;
  
  counts = Storage.get(LS_KEYS.COUNTS, []).filter(c => c.id !== id);
  Storage.set(LS_KEYS.COUNTS, counts);
  
  toast('✓ Đã xóa bản ghi', 'success');
  renderLichSu();
}

function syncSingleRecordFromTable(id) {
  const item = counts.find(c => c.id === id);
  if (item) {
    toast('Đang đồng bộ dòng chọn...', 'info');
    syncSingleRecord(item, true);
  }
}

// --- VIEW: Search Catalog ---
let catCurrentPage = 1;
const catPageSize = 25;
let catFilteredList = [];

function renderDanhMuc() {
  const searchInput = $('#cat_search');
  const typeFilter = $('#cat_loai');
  
  const master = window.VAT_TU_DEFAULT || [];
  catFilteredList = master;

  const updateTable = () => {
    const q = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;
    
    // Filter
    catFilteredList = master.filter(v => {
      const matchText = `${v.ma_erp} ${v.ma_qr} ${v.ten_hang} ${v.ten_cu} ${v.ma_cu} ${v.nhom}`.toLowerCase();
      const matchSearch = matchText.includes(q);
      const matchType = type ? (v.loai === type) : true;
      return matchSearch && matchType;
    });

    catCurrentPage = 1;
    displayCatPage();
  };

  searchInput.oninput = updateTable;
  typeFilter.onchange = updateTable;
  
  updateTable();
}

function displayCatPage() {
  const body = $('#catTableBody');
  const totalText = $('#catTotalText');
  const pagination = $('#catPagination');
  if (!body) return;

  const total = catFilteredList.length;
  totalText.textContent = `Tìm thấy ${total.toLocaleString('vi-VN')} mặt hàng chuẩn hóa.`;

  const totalPages = Math.ceil(total / catPageSize) || 1;
  if (catCurrentPage > totalPages) catCurrentPage = totalPages;

  const startIdx = (catCurrentPage - 1) * catPageSize;
  const endIdx = Math.min(startIdx + catPageSize, total);
  const pageItems = catFilteredList.slice(startIdx, endIdx);

  let html = '';
  if (pageItems.length > 0) {
    pageItems.forEach((item, idx) => {
      const stt = startIdx + idx + 1;
      // ma_erp = mã kiểm kê (PREFIX-STT, e.g. NVL-1)
      // ma_cu  = mã cũ / barcode cũ
      // ma_erp_full = Mã ERP Final đầy đủ
      const maErpFull = item.ma_erp_full
        ? `<code style="font-size:11px;">${sanitize(item.ma_erp_full)}</code>`
        : '<span class="muted">—</span>';
      html += `
        <tr style="cursor: pointer;" onclick="quickSelectFromCatalog('${item.ma_erp}')">
          <td class="center muted">${stt}</td>
          <td><b><code style="background:#eff6ff;color:#1e3a8a;padding:2px 6px;border-radius:4px;">${sanitize(item.ma_erp)}</code></b></td>
          <td><code style="font-size:11px;color:#6b7280;">${sanitize(item.ma_cu || '—')}</code></td>
          <td><b>${sanitize(item.ten_hang)}</b></td>
          <td>${maErpFull}</td>
          <td class="center">${sanitize(item.dvt)}</td>
          <td>${sanitize(item.nhom)}</td>
          <td><span class="tag">${sanitize(item.vitri || 'Chưa định vị')}</span></td>
        </tr>
      `;
    });
  } else {
    html = `<tr><td colspan="8" class="center muted">Không tìm thấy vật tư nào khớp với bộ lọc.</td></tr>`;
  }
  body.innerHTML = html;

  // Render pagination buttons
  let pagHtml = '';
  if (totalPages > 1) {
    const prevDisabled = catCurrentPage === 1 ? 'disabled' : '';
    pagHtml += `<button class="btn sm sec" ${prevDisabled} onclick="changeCatPage(-1)">◀ Trước</button>`;
    pagHtml += `<span style="align-self: center; font-size:12px;" class="muted">Trang <b>${catCurrentPage}</b> / ${totalPages}</span>`;
    const nextDisabled = catCurrentPage === totalPages ? 'disabled' : '';
    pagHtml += `<button class="btn sm sec" ${nextDisabled} onclick="changeCatPage(1)">Sau ▶</button>`;
  }
  pagination.innerHTML = pagHtml;
}

function changeCatPage(dir) {
  catCurrentPage += dir;
  displayCatPage();
}

function quickSelectFromCatalog(ma_erp) {
  const master = window.VAT_TU_DEFAULT || [];
  const found = master.find(v => v.ma_erp === ma_erp);
  if (found) {
    switchView('kiemke');
    selectProduct(found);
    $('#kk_search').value = found.ma_cu || found.ma_erp;
    toast(`Đã chọn nhanh từ danh mục: ${found.ten_hang}`, 'success');
  }
}

// Ensure book stock is available for reconciliation
function ensureBookStockLoaded() {
  bookStock = Storage.get(LS_KEYS.BOOK_STOCK, {});
  if (Object.keys(bookStock).length === 0 && window.BOOK_STOCK_DEFAULT && Object.keys(window.BOOK_STOCK_DEFAULT).length > 0) {
    bookStock = { ...window.BOOK_STOCK_DEFAULT };
    Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
    console.log(`[BookStock] Auto-loaded ${Object.keys(bookStock).length} items from BOOK_STOCK_DEFAULT`);
  }
  return bookStock;
}

// --- VIEW: Reconciliation (Đối chiếu) ---
function renderDoiChieu() {
  counts = Storage.get(LS_KEYS.COUNTS, []);
  bookStock = ensureBookStockLoaded();

  // Populate warehouse filter dropdown in reconciliation
  const filterWh = $('#rc_filter_warehouse');
  const khos = window.KHO_DEFAULT || [];
  let whHtml = '<option value="">— Tất cả kho —</option>';
  khos.forEach(k => {
    whHtml += `<option value="${k.makho}">${k.tenkho}</option>`;
  });
  filterWh.innerHTML = whHtml;

  // Search filter and status filter bindings
  $('#rc_filter_search').oninput = refreshDoiChieuTable;
  $('#rc_filter_warehouse').onchange = refreshDoiChieuTable;
  $('#rc_filter_status').onchange = refreshDoiChieuTable;

  refreshDoiChieuTable();
}

function refreshDoiChieuTable() {
  const searchQ = $('#rc_filter_search').value.trim().toLowerCase();
  const whFilter = $('#rc_filter_warehouse').value;
  const statusFilter = $('#rc_filter_status').value;

  const tableBody = $('#rcTableBody');
  if (!tableBody) return;

  // Aggregate scanned actual quantities
  // actualMap: {primary_code: {kho: quantity}}
  const actualMap = {};
  counts.forEach(c => {
    const code = c.ma_erp || c.ma_cu;
    actualMap[code] = actualMap[code] || {};
    actualMap[code][c.kho] = (actualMap[code][c.kho] || 0) + c.so_luong;
  });

  // Unique list of products
  // We need to compare for each product in Book Stock and Actual Scanned
  const allUniqueErp = new Set([...Object.keys(bookStock), ...Object.keys(actualMap)]);
  const master = window.VAT_TU_DEFAULT || [];

  let rows = [];

  allUniqueErp.forEach(code => {
    const item = master.find(v => v.ma_erp === code || v.ma_cu === code || v.ma_qr === code) || { ma_erp: code, ten_hang: 'Vật tư lạ/Chưa đăng ký', dvt: 'Kg', nhom: '' };
    
    // Sổ sách quantity
    const bookQty = bookStock[code] || 0;
    
    // Scanned quantity
    const actualWhQuantities = actualMap[code] || {};
    
    if (Object.keys(actualWhQuantities).length > 0) {
      // If scanned in multiple warehouses, show lines for each
      Object.entries(actualWhQuantities).forEach(([kho, actQty]) => {
        if (whFilter && kho !== whFilter) return;

        const diff = actQty - bookQty;
        rows.push({
          code,
          name: item.ten_hang,
          dvt: item.dvt,
          kho,
          book: bookQty, // Note: Book stock is usually global, or per warehouse. Here we assume Bravo book stock matches code.
          actual: actQty,
          diff
        });
      });
    } else {
      // If a warehouse filter is selected, keep only book-stock rows belonging to that warehouse
      if (whFilter && item.kho !== whFilter) return;

      const diff = 0 - bookQty;
      rows.push({
        code,
        name: item.ten_hang,
        dvt: item.dvt,
        kho: item.kho || 'Chưa đếm',
        book: bookQty,
        actual: 0,
        diff
      });
    }
  });

  // Apply search query filter
  if (searchQ) {
    rows = rows.filter(r => `${r.code} ${r.name}`.toLowerCase().includes(searchQ));
  }

  // Apply status filter
  if (statusFilter) {
    if (statusFilter === 'lech') {
      rows = rows.filter(r => r.diff !== 0);
    } else if (statusFilter === 'khop') {
      rows = rows.filter(r => r.diff === 0);
    } else if (statusFilter === 'thua') {
      rows = rows.filter(r => r.diff > 0);
    } else if (statusFilter === 'thieu') {
      rows = rows.filter(r => r.diff < 0);
    }
  }

  // Render rows
  let html = '';
  if (rows.length > 0) {
    rows.forEach(r => {
      let statusBadge = '';
      let rowStyle = '';
      if (r.diff === 0) {
        statusBadge = '<span class="badge b-tot">Khớp 🟢</span>';
      } else if (r.diff > 0) {
        statusBadge = '<span class="badge b-kem">Thừa 🟡</span>';
        rowStyle = 'background-color: #fffbeb;'; // Light warning
      } else {
        statusBadge = '<span class="badge b-thanhly">Thiếu 🔴</span>';
        rowStyle = 'background-color: #fef2f2;'; // Light danger
      }

      const diffValDisp = r.diff > 0 ? `+${r.diff.toLocaleString('vi-VN')}` : r.diff.toLocaleString('vi-VN');
      const whName = r.kho === 'Chưa đếm' ? '<span class="muted">Chưa đếm</span>' : getWarehouseName(r.kho);

      // Get notes from recent counts of this item
      const itemCounts = counts.filter(c => (c.ma_erp || c.ma_cu) === r.code && c.kho === r.kho);
      const notes = itemCounts.map(c => c.ghichu).filter(n => n).join('; ') || '<span class="muted">—</span>';

      html += `
        <tr style="${rowStyle}">
          <td><b><code>${sanitize(r.code)}</code></b></td>
          <td>${sanitize(r.name)}</td>
          <td class="center muted">${sanitize(r.dvt)}</td>
          <td><b>${sanitize(whName)}</b></td>
          <td class="right text-muted">${r.book.toLocaleString('vi-VN')}</td>
          <td class="right"><b>${r.actual.toLocaleString('vi-VN')}</b></td>
          <td class="right" style="font-weight: 700; color: ${r.diff === 0 ? 'var(--neutral-dark)' : r.diff > 0 ? 'var(--warning)' : 'var(--danger)'}">${diffValDisp}</td>
          <td class="center">${statusBadge}</td>
          <td class="no-print" style="max-width: 250px; font-size:12px;">${sanitize(notes)}</td>
        </tr>
      `;
    });
  } else {
    html = `<tr><td colspan="9" class="center muted">Không tìm thấy dữ liệu đối chiếu khớp bộ lọc.</td></tr>`;
  }
  tableBody.innerHTML = html;
  
  $('#rcTotalText').textContent = `Hiển thị ${rows.length} dòng đối chiếu. Có ${rows.filter(r => r.diff !== 0).length} dòng lệch sổ sách.`;
}

function importBookStock() {
  const dataArea = $('#rc_book_data');
  const text = dataArea.value.trim();
  if (!text) {
    toast('Vui lòng dán dữ liệu sổ sách trước', 'error');
    return;
  }

  // Parse TSV/CSV format
  // Format: Code [Tab/Comma] Quantity
  const lines = text.split('\n');
  const tempBook = {};
  let successCount = 0;

  lines.forEach(line => {
    const parts = line.split(/[\t,;]+/);
    if (parts.length >= 2) {
      const code = parts[0].trim();
      const qty = Number(parts[1].trim().replace(/[^0-9.-]/g, ''));
      if (code && !isNaN(qty)) {
        tempBook[code] = qty;
        successCount++;
      }
    }
  });

  if (successCount > 0) {
    bookStock = tempBook;
    Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
    toast(`✓ Nạp thành công sổ sách: ${successCount} mặt hàng`, 'success');
    dataArea.value = '';
    renderDoiChieu();
    renderDashboard();
  } else {
    toast('Lỗi cấu trúc dữ liệu sổ sách dán vào. Hãy copy dạng cột (Mã hàng <Tab> Số lượng).', 'error');
  }
}

function loadSampleBookStock() {
  // Populate database with some realistic sample book values for the items in DM_VẬT TƯ
  const master = window.VAT_TU_DEFAULT || [];
  const tempBook = {};
  
  // Fill sample book values for first 50 items
  master.slice(0, 50).forEach(item => {
    // Generate random stock values between 100 and 10000
    tempBook[item.ma_cu || item.ma_erp] = Math.floor(Math.random() * 20) * 50 + 100;
  });

  bookStock = tempBook;
  Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
  toast('✓ Đã nạp mẫu sổ sách ngẫu nhiên', 'success');
  renderDoiChieu();
  renderDashboard();
}

function clearBookStock() {
  if (!confirm('Bạn có muốn xóa toàn bộ số liệu Sổ sách đã nạp?')) return;
  bookStock = {};
  Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
  toast('✓ Đã xóa số liệu sổ sách', 'success');
  renderDoiChieu();
  renderDashboard();
}

function reloadBookStockFromDefault() {
  if (!window.BOOK_STOCK_DEFAULT || Object.keys(window.BOOK_STOCK_DEFAULT).length === 0) {
    toast('⚠ Không tìm thấy dữ liệu BOOK_STOCK_DEFAULT. Hãy chạy generate_final.py lại.', 'error');
    return;
  }
  const itemCount = Object.keys(window.BOOK_STOCK_DEFAULT).length;
  if (!confirm(`Xác nhận nạp lại sổ sách từ file ERP?\n\nTổng: ${itemCount} mặt hàng sẽ được cập nhật.\nDữ liệu sổ sách hiện tại sẽ bị ghi đè.`)) return;
  
  bookStock = { ...window.BOOK_STOCK_DEFAULT };
  Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
  toast(`✓ Đã nạp lại sổ sách ERP: ${itemCount} mặt hàng`, 'success');
  renderDoiChieu();
  renderDashboard();
}

function xuatExcelDoichieu() {
  // Export CSV ready for Bravo ERP Import
  // Bravo import columns: STT | Mã Kho | Vị trí | Mã ERP Final | Tên vật tư | ĐVT | Sổ sách | Thực tế | Chênh lệch | Ghi chú
  counts = Storage.get(LS_KEYS.COUNTS, []);
  if (!counts.length) {
    toast('Chưa có dữ liệu kiểm đếm thực tế để xuất', 'error');
    return;
  }

  const head = ['STT', 'Ma_Kho', 'Vi_Tri', 'Ma_Kiem_Ke_Chinh', 'Ma_ERP_Final', 'Ma_Barcode_Final', 'Ten_Vat_Tu', 'DVT', 'Ton_So_Sach', 'Ton_Thuc_Te', 'Chenh_Lech', 'Tinh_Trang', 'Nguoi_Kiem', 'Ghi_Chu'];
  
  // Group counts by Code & Warehouse & Position
  const grouped = {};
  counts.forEach(c => {
    const code = c.ma_erp || c.ma_cu;
    const key = `${code}_${c.kho}_${c.vitri}`;
    if (!grouped[key]) {
      grouped[key] = { ...c, so_luong: 0 };
    }
    grouped[key].so_luong += c.so_luong;
  });

  const rows = Object.values(grouped).map((c, idx) => {
    const code = c.ma_erp || c.ma_cu;
    const bookQty = bookStock[code] || 0;
    const diff = c.so_luong - bookQty;
    const statusLabels = { tot: 'Tốt', kem: 'Kém', thanhly: 'Hỏng/Phế phẩm' };
    const condDisp = statusLabels[c.tinh_trang] || c.tinh_trang;
    
    return [
      idx + 1,
      c.kho,
      c.vitri || '',
      code,
      c.ma_erp,
      c.ma_qr,
      c.ten_hang,
      c.dvt,
      bookQty,
      c.so_luong,
      diff,
      condDisp,
      c.nguoi_kiem,
      c.ghichu || ''
    ];
  });

  // Adding BOM UTF-8 for Excel compatibility
  const csvContent = '\ufeff' + [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Import_KiemKe_Bravo_HueLinh_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('✓ Đã xuất tệp CSV Import Bravo', 'success');
}

function xuatBienBanKiemKe() {
  $('#printDateStr').textContent = new Date().toLocaleDateString('vi-VN');
  window.print();
}

// --- VIEW: Settings & Sync (Cấu hình) ---
function renderCaiDat() {
  config = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  counts = Storage.get(LS_KEYS.COUNTS, []);
  
  // Fill input configurations
  const urlInput = $('#cfg_gas_url');
  if (urlInput) urlInput.value = config.sheetUrl || '';

  const modes = $$('input[name="store_mode"]');
  modes.forEach(r => {
    r.checked = (r.value === config.mode);
    if (r.value === 'sheet' && r.checked) {
      $('#sheetSettingsSection').style.display = 'block';
    }
  });

  // Bind radio toggles
  modes.forEach(r => {
    r.onchange = () => {
      $('#sheetSettingsSection').style.display = (r.value === 'sheet') ? 'block' : 'none';
    };
  });

  $('#cfgLocalCount').textContent = counts.length;
  $('#gasSourceCodeBox').value = GAS_CODE_SNIPPET;
}

function saveConfiguration() {
  const mode = $('input[name="store_mode"]:checked').value;
  const sheetUrl = $('#cfg_gas_url').value.trim();

  if (mode === 'sheet' && !sheetUrl) {
    toast('Vui lòng nhập liên kết Apps Script khi chọn chế độ đồng bộ Google Sheets', 'error');
    return;
  }

  config = { mode, sheetUrl };
  Storage.set(LS_KEYS.CONFIG, config);
  
  // Update status pills
  const pill = $('#modePill');
  if (pill) {
    pill.textContent = mode === 'sheet' ? 'Chế độ: Google Sheets' : 'Chế độ: Cục bộ';
  }

  // Update sync banner visibility
  updateSyncBanner();
  
  toast('✓ Đã lưu cài đặt cấu hình', 'success');
}

function updateSyncBanner() {
  const banner = $('#syncBanner');
  if (!banner) return;

  const cfg = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  const localCounts = Storage.get(LS_KEYS.COUNTS, []);
  const unsyncedCount = localCounts.filter(c => c.sync_status !== 'synced').length;

  if (cfg.mode === 'sheet' && cfg.sheetUrl && unsyncedCount > 0) {
    $('#syncBannerText').textContent = `Bạn có ${unsyncedCount} bản ghi chưa được đồng bộ lên Google Sheets.`;
    banner.className = 'sync-banner no-print'; // amber coloring
    banner.style.display = 'flex';
  } else if (cfg.mode === 'sheet' && cfg.sheetUrl) {
    $('#syncBannerText').textContent = '✓ Dữ liệu kiểm kê đã được đồng bộ hoàn chỉnh.';
    banner.className = 'sync-banner synced no-print'; // green coloring
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// Background sync scripts
function syncSingleRecord(rec, forceToast = false) {
  const cfg = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  if (!cfg.sheetUrl) return;

  // Use POST request via fetch in a no-cors fire-and-forget mode to bypass CORS flight
  fetch(cfg.sheetUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'save', record: rec })
  })
  .then(() => {
    // Update local database record sync status
    counts = Storage.get(LS_KEYS.COUNTS, []);
    const found = counts.find(c => c.id === rec.id);
    if (found) {
      found.sync_status = 'synced';
      Storage.set(LS_KEYS.COUNTS, counts);
    }
    updateSyncBanner();
    if (forceToast) {
      toast('✓ Đồng bộ dữ liệu thành công', 'success');
      renderLichSu();
    }
  })
  .catch((err) => {
    console.error('Sync failed', err);
    if (forceToast) {
      toast('⚠ Lỗi kết nối Google Sheets. Hãy kiểm tra lại internet.', 'error');
    }
  });
}

function dongBoTatCaPhieu() {
  const cfg = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
  if (!cfg.sheetUrl) {
    toast('Chưa thiết lập URL Google Apps Script', 'error');
    return;
  }

  counts = Storage.get(LS_KEYS.COUNTS, []);
  const unsynced = counts.filter(c => c.sync_status !== 'synced');
  
  if (unsynced.length === 0) {
    toast('Dữ liệu đã được đồng bộ từ trước.', 'success');
    return;
  }

  toast(`Bắt đầu đồng bộ ${unsynced.length} dòng lên Google Sheets...`, 'info');

  let successCount = 0;
  let promises = unsynced.map(rec => {
    return fetch(cfg.sheetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'save', record: rec })
    })
    .then(() => {
      rec.sync_status = 'synced';
      successCount++;
    })
    .catch(e => console.error(e));
  });

  Promise.all(promises).then(() => {
    Storage.set(LS_KEYS.COUNTS, counts);
    updateSyncBanner();
    toast(`✓ Đồng bộ thành công ${successCount}/${unsynced.length} dòng lên Google Sheets.`, 'success');
    if (currentView === 'lichsu') renderLichSu();
    if (currentView === 'caidat') renderCaiDat();
  });
}

function testGASConnection() {
  const url = $('#cfg_gas_url').value.trim();
  if (!url) {
    toast('Vui lòng nhập URL Google Apps Script', 'error');
    return;
  }

  toast('Đang gửi tín hiệu kiểm tra (Ping)...', 'info');
  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'ping' })
  })
  .then(() => {
    toast('✓ Đã kết nối thành công. Vui lòng mở Google Sheets kiểm tra dòng PING.', 'success');
  })
  .catch(err => {
    toast('⚠ Kết nối thất bại. Hãy kiểm tra lại URL hoặc cấu hình quyền truy cập Apps Script.', 'error');
    console.error(err);
  });
}

function xuatSaoLuuJSON() {
  counts = Storage.get(LS_KEYS.COUNTS, []);
  const data = {
    app: 'HL-KK-BRAVO',
    version: '1.0',
    exportAt: new Date().toISOString(),
    counts,
    bookStock
  };
  
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `SaoLuu_KiemKe_HueLinh_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('✓ Đã tải xuống tệp sao lưu dữ liệu', 'success');
}

function nhapSaoLuuJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.app !== 'HL-KK-BRAVO') {
        toast('Tệp sao lưu không hợp lệ hoặc không đúng cấu trúc ứng dụng', 'error');
        return;
      }
      
      const newCounts = data.counts || [];
      const currentCounts = Storage.get(LS_KEYS.COUNTS, []);
      
      // Merge by ID
      const map = {};
      currentCounts.forEach(c => map[c.id] = c);
      newCounts.forEach(c => map[c.id] = c);

      const merged = Object.values(map);
      Storage.set(LS_KEYS.COUNTS, merged);

      if (Object.keys(data.bookStock || {}).length > 0) {
        bookStock = data.bookStock;
        Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
      }

      toast(`✓ Đã nhập và hợp nhất thành công ${merged.length} dòng dữ liệu`, 'success');
      
      // Reset file input
      e.target.value = '';
      renderCaiDat();
      renderDashboard();
    } catch (err) {
      toast('Lỗi giải mã tệp dữ liệu. Định dạng tệp phải là JSON.', 'error');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Hành động này sẽ XÓA SẠCH toàn bộ số liệu kiểm kê thực tế đã ghi trên máy này.\nHãy chắc chắn bạn đã đồng bộ hoặc tải file Sao lưu JSON.\n\nBạn có muốn tiếp tục?')) return;
  if (!confirm('Xác nhận lần cuối: Bạn thực sự muốn xóa hết?')) return;

  Storage.set(LS_KEYS.COUNTS, []);
  Storage.set(LS_KEYS.BOOK_STOCK, {});
  
  counts = [];
  bookStock = {};
  
  toast('✓ Đã xóa sạch dữ liệu trên thiết bị', 'success');
  renderCaiDat();
  renderDashboard();
}

function copyGASCode() {
  const box = $('#gasSourceCodeBox');
  box.select();
  document.execCommand('copy');
  toast('✓ Đã sao chép mã nguồn Apps Script vào clipboard', 'success');
}

// Google Apps Script source code
const GAS_CODE_SNIPPET = `// =====================================================================
// Google Apps Script — App Kiểm Kê Vật Tư Huệ Linh ERP Bravo
// Paste toàn bộ code này vào Apps Script, Deploy > Web app > Anyone
// =====================================================================

function doPost(e){
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // Ping test
    if(data.action === 'ping'){
      var shPing = ss.getSheetByName('KiemKe') || ss.insertSheet('KiemKe');
      shPing.appendRow([new Date(), 'PING', '— Kết nối thành công từ App Kiểm Kê Huệ Linh']);
      return ok();
    }

    var p = data.record;

    // Sheet 'KiemKe'
    var sh = ss.getSheetByName('KiemKe') || ss.insertSheet('KiemKe');
    
    // Find matching ID to update or append
    var lastRow = sh.getLastRow();
    var rowToEdit = -1;
    if(lastRow > 1){
      var ids = sh.getRange(2, 1, lastRow-1, 1).getValues().flat();
      var idx = ids.indexOf(p.id);
      if(idx >= 0){
        rowToEdit = idx + 2; // 1-based index and account for header
      }
    }
    
    if(lastRow === 0){
      sh.appendRow(['ID', 'Ngày kiểm', 'Mã Kho', 'Vị trí', 'Mã ERP Final', 'Mã Barcode Final',
        'Tên vật tư', 'ĐVT', 'Phân loại', 'Nhóm hàng', 'Mã cũ',
        'Số lượng thực đếm', 'Tình trạng', 'Hạn sử dụng', 'Ghi chú', 'Người kiểm', 'Mã NV người kiểm', 'Đồng bộ lúc']);
    }
    
    var rowValues = [
      p.id,
      p.ngay,
      p.kho,
      p.vitri,
      p.ma_erp,
      p.ma_qr,
      p.ten_hang,
      p.dvt,
      p.loai,
      p.nhom,
      p.ma_cu,
      p.so_luong,
      p.tinh_trang,
      p.hsd || '',
      p.ghichu || '',
      p.nguoi_kiem,
      p.nguoi_kiem_ma,
      p.sync_time
    ];
    
    if(rowToEdit >= 2){
      sh.getRange(rowToEdit, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sh.appendRow(rowValues);
    }

    return ok();
  } catch(err) {
    return ContentService.createTextOutput('ERROR: ' + err.message);
  }
}

function ok(){ return ContentService.createTextOutput('OK'); }

function doGet(e){ return ContentService.createTextOutput('App Kiểm Kê Huệ Linh — GAS đang hoạt động. Dùng POST để gửi dữ liệu.'); }`;


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Pre-fill user names in login screen
  loadUsersDropdown();
  
  // Set up navigation
  $$('#nav button').forEach(b => {
    b.onclick = () => switchView(b.dataset.view);
  });
  
  // Hamburger and menu overlay for mobile
  $('#hamburger').onclick = () => {
    $('#sidebar').classList.add('open');
    $('#overlay').classList.add('open');
  };
  
  $('#overlay').onclick = () => {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('open');
  };

  // Check authentication
  if (window.AUTH.isAuthenticated()) {
    $('#loginOverlay').style.display = 'none';
    updateSidebarByRole();
    updateUserDisplay();
    
    // Load local storage states
    counts = Storage.get(LS_KEYS.COUNTS, []);
    bookStock = ensureBookStockLoaded();
    config = Storage.get(LS_KEYS.CONFIG, { mode: 'local', sheetUrl: '' });
    
    // Auto-seed book stock from data_vattu.js if localStorage is empty
    if (Object.keys(bookStock).length === 0 && window.BOOK_STOCK_DEFAULT && Object.keys(window.BOOK_STOCK_DEFAULT).length > 0) {
      bookStock = window.BOOK_STOCK_DEFAULT;
      Storage.set(LS_KEYS.BOOK_STOCK, bookStock);
      console.log(`[Init] Auto-seeded book stock: ${Object.keys(bookStock).length} items from BOOK_STOCK_DEFAULT`);
    }
    
    // Update config badge display
    const pill = $('#modePill');
    if (pill) {
      pill.textContent = config.mode === 'sheet' ? 'Chế độ: Google Sheets' : 'Chế độ: Cục bộ';
    }
    
    updateSyncBanner();
    switchView('dashboard');
  } else {
    $('#loginOverlay').style.display = 'flex';
  }
});
