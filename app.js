/* ============================================================
   ISATU Campus Maintenance & Issue Reporting System
   Track 3 — app.js
   Frontend SPA | MapLibre GL JS + MapTiler + Tailwind CSS
   ============================================================ */

'use strict';

// ══════════════════════════════════════════════════════════════
// 1.  TOP-LEVEL CONFIGURATION  (edit Laptop B IP here)
// ══════════════════════════════════════════════════════════════

// Set Laptop B's IP address (e.g. http://192.168.1.15/api.php
//                             or  http://192.168.1.15:8000/api.php)
const API_BASE_URL = 'http://localhost/api.php';

const MAPTILER_KEY    = 'guHcH7diPQJI56dDsa2f';
const ISATU_CENTER    = [122.5662, 10.7154];   // [lng, lat]
const ISATU_ZOOM      = 17.2;
const ISATU_BOUNDS    = [[122.5630, 10.7120], [122.5695, 10.7185]];

// ISATU La Paz Main Campus Boundary Polygon
const ISATU_CAMPUS_BOUNDARY = [
  [122.56475, 10.71715],
  [122.56475, 10.71634],
  [122.56480, 10.71566],
  [122.56480, 10.71490],
  [122.56485, 10.71387],
  [122.56510, 10.71330],
  [122.56640, 10.71410],
  [122.56715, 10.71470],
  [122.56660, 10.71557],
  [122.56815, 10.71685],
  [122.56760, 10.71760],
  [122.56700, 10.71720],
  [122.56589, 10.71615],
  [122.56556, 10.71665],
  [122.56520, 10.71715],
  [122.56475, 10.71715]
];

// INVERTED WHITE MASK: Outside campus is solid white (#FFFFFF), inside shows MapTiler
const ISATU_MASK_GEOJSON = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
        ISATU_CAMPUS_BOUNDARY
      ]
    }
  }]
};

/**
 * Applies the white inverted campus mask + blue border outline
 * to a given MapLibre map instance. Safe to call before or after style load.
 * @param {maplibregl.Map} map
 */
function applyCampusMask(map) {
  const addLayers = () => {
    // ── White inverted mask: covers everything outside campus ──
    if (!map.getSource('isatu-mask-src')) {
      map.addSource('isatu-mask-src', { type: 'geojson', data: ISATU_MASK_GEOJSON });
      map.addLayer({
        id:     'isatu-mask-layer',
        type:   'fill',
        source: 'isatu-mask-src',
        paint: {
          'fill-color':   '#ffffff',
          'fill-opacity': 1.0
        }
      });
    }
    // ── Campus boundary outline ──
    if (!map.getSource('isatu-outline-src')) {
      map.addSource('isatu-outline-src', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: ISATU_CAMPUS_BOUNDARY }
        }
      });
      map.addLayer({
        id:     'isatu-border-outline',
        type:   'line',
        source: 'isatu-outline-src',
        paint: {
          'line-color':   '#002663',
          'line-width':    3,
          'line-opacity':  0.95
        }
      });
    }
  };

  if (map.isStyleLoaded()) addLayers();
  else map.once('load', addLayers);
}


// ══════════════════════════════════════════════════════════════
// 2.  APP STATE
// ══════════════════════════════════════════════════════════════

const state = {
  tickets:        [],         // raw array from API
  filtered:       [],         // after filter/search
  reportMap:      null,       // MapLibre instance (Tab 1)
  reportMarker:   null,       // draggable pin marker
  dispatchMap:    null,       // MapLibre instance (Tab 2)
  dispatchMarkers:[],         // pin markers on dispatch map
  claimTargetId:  null,       // ticket id pending claim
  filterStatus:   'all',
  filterRole:     '',
  filterSearch:   '',
  mapsInitialized:{ report: false, dispatch: false }
};


// ══════════════════════════════════════════════════════════════
// 3.  UTILITY HELPERS
// ══════════════════════════════════════════════════════════════

/** Clamp a value between min and max */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Clamp lat/lng to ISATU campus bounding box */
function clampToCampus(lat, lng) {
  return {
    lat: clamp(lat, ISATU_BOUNDS[0][1], ISATU_BOUNDS[1][1]),
    lng: clamp(lng, ISATU_BOUNDS[0][0], ISATU_BOUNDS[1][0])
  };
}

/** Point-in-polygon test (ray casting) */
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Format date/time nicely */
function fmtDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/** Sanitise user-generated text for safe innerHTML insertion */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Debounce */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}


// ══════════════════════════════════════════════════════════════
// 4.  HEADER CLOCK
// ══════════════════════════════════════════════════════════════

function tickClock() {
  const now = new Date();
  const timeEl = document.getElementById('hdr-time');
  const dateEl = document.getElementById('hdr-date');
  if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}
setInterval(tickClock, 1000);
tickClock();


// ══════════════════════════════════════════════════════════════
// 5.  TAB NAVIGATION
// ══════════════════════════════════════════════════════════════

const TAB_BTNS   = document.querySelectorAll('.tab-btn');
const TAB_PANELS = document.querySelectorAll('.tab-panel');

function activateTab(panelId) {
  TAB_BTNS.forEach(btn => {
    const isActive = btn.dataset.panel === panelId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  TAB_PANELS.forEach(panel => {
    panel.classList.toggle('active', panel.id === panelId);
  });

  // Lazy-init maps only when their tab becomes visible
  if (panelId === 'tab-report'   && !state.mapsInitialized.report)   initReportMap();
  if (panelId === 'tab-dispatch' && !state.mapsInitialized.dispatch) {
    initDispatchMap();
    loadTickets();
  }
}

TAB_BTNS.forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.panel));
});


// ══════════════════════════════════════════════════════════════
// 6.  MODAL HELPERS
// ══════════════════════════════════════════════════════════════

function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.focus(); }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  if (id === 'claim-modal') {
    document.getElementById('technician-name-input').value = '';
    hideClaimError();
  }
}

// Close modal on overlay click
document.getElementById('claim-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal('claim-modal');
});

// ESC key closes any open modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('claim-modal');
    closeModal('image-modal');
  }
});


// ══════════════════════════════════════════════════════════════
// 7.  MAP INITIALIZATION — REPORT TAB (Tab 1)
// ══════════════════════════════════════════════════════════════

function initReportMap() {
  if (state.mapsInitialized.report) return;
  state.mapsInitialized.report = true;

  const mapStyle = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

  state.reportMap = new maplibregl.Map({
    container:  'report-map',
    style:       mapStyle,
    center:      ISATU_CENTER,
    zoom:        ISATU_ZOOM,
    maxBounds:   ISATU_BOUNDS,
    attributionControl: false
  });

  state.reportMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  state.reportMap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  // Apply campus mask on load
  state.reportMap.on('load', () => {
    applyCampusMask(state.reportMap);
  });

  // Click-to-pin
  state.reportMap.on('click', e => {
    const { lat, lng } = e.lngLat;
    placeReportPin(lat, lng);
  });
}

/** Place / move the draggable report pin */
function placeReportPin(lat, lng) {
  const clamped = clampToCampus(lat, lng);

  // Update hidden inputs
  document.getElementById('report-lat').value = clamped.lat.toFixed(6);
  document.getElementById('report-lng').value = clamped.lng.toFixed(6);

  // Update coords display
  const coordsText = document.getElementById('coords-text');
  if (coordsText) {
    coordsText.textContent = `Lat: ${clamped.lat.toFixed(6)},  Lng: ${clamped.lng.toFixed(6)}`;
  }

  // Create / move marker
  if (!state.reportMarker) {
    const el = document.createElement('div');
    el.innerHTML = '📌';
    el.style.cssText = 'font-size:28px;cursor:grab;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));';
    el.title = 'Drag to adjust location';

    state.reportMarker = new maplibregl.Marker({ element: el, draggable: true })
      .setLngLat([clamped.lng, clamped.lat])
      .addTo(state.reportMap);

    state.reportMarker.on('dragend', () => {
      const pos = state.reportMarker.getLngLat();
      placeReportPin(pos.lat, pos.lng);
    });
  } else {
    state.reportMarker.setLngLat([clamped.lng, clamped.lat]);
  }

  // Pan map to pin
  state.reportMap.flyTo({ center: [clamped.lng, clamped.lat], zoom: Math.max(state.reportMap.getZoom(), 18) });
}


// ══════════════════════════════════════════════════════════════
// 8.  MAP INITIALIZATION — DISPATCH TAB (Tab 2)
// ══════════════════════════════════════════════════════════════

function initDispatchMap() {
  if (state.mapsInitialized.dispatch) return;
  state.mapsInitialized.dispatch = true;

  const mapStyle = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

  state.dispatchMap = new maplibregl.Map({
    container:  'dispatch-map',
    style:       mapStyle,
    center:      ISATU_CENTER,
    zoom:        ISATU_ZOOM,
    maxBounds:   ISATU_BOUNDS,
    attributionControl: false
  });

  state.dispatchMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  state.dispatchMap.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  // Apply campus mask on load
  state.dispatchMap.on('load', () => {
    applyCampusMask(state.dispatchMap);
  });
}

/** Render color-coded pins on the dispatch map */
function renderDispatchPins(tickets) {
  // Remove old markers
  state.dispatchMarkers.forEach(m => m.remove());
  state.dispatchMarkers = [];

  if (!state.dispatchMap || !state.mapsInitialized.dispatch) return;

  const colorMap = {
    reported:    '🔴',
    in_progress: '🟡',
    resolved:    '🟢'
  };

  tickets.forEach(ticket => {
    const lat = parseFloat(ticket.lat);
    const lng = parseFloat(ticket.lng);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const emoji = colorMap[ticket.status] || '⚫';
    const el = document.createElement('div');
    el.innerHTML = emoji;
    el.style.cssText = 'font-size:20px;cursor:pointer;filter:drop-shadow(0 1px 3px rgba(0,0,0,.3));transition:.15s;';
    el.title = `${ticket.ticket_code} — ${ticket.issue_type}\n${ticket.location_text}`;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Ticket ${ticket.ticket_code}: ${ticket.issue_type} at ${ticket.location_text}`);

    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)'; });
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

    const popup = new maplibregl.Popup({ offset: 20, closeButton: false, maxWidth: '240px' })
      .setHTML(`
        <div style="font-family:Inter,sans-serif;font-size:12px;line-height:1.5;">
          <div style="font-weight:800;color:#002663;font-size:13px;margin-bottom:4px;">
            ${esc(ticket.ticket_code)}
          </div>
          <div style="color:#374151;margin-bottom:2px;"><b>${esc(ticket.issue_type)}</b></div>
          <div style="color:#64748b;margin-bottom:4px;">📍 ${esc(ticket.location_text)}</div>
          <span style="font-size:10px;padding:2px 7px;border-radius:10px;font-weight:700;
            background:${ticket.status==='resolved'?'#f0fdf4':ticket.status==='in_progress'?'#fffbeb':'#fef2f2'};
            color:${ticket.status==='resolved'?'#16a34a':ticket.status==='in_progress'?'#d97706':'#ef4444'}">
            ${esc(ticket.status)}
          </span>
        </div>
      `);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(state.dispatchMap);

    el.addEventListener('click', () => marker.togglePopup());

    state.dispatchMarkers.push(marker);
  });
}


// ══════════════════════════════════════════════════════════════
// 9.  GPS BUTTON — with campus clamping
// ══════════════════════════════════════════════════════════════

document.getElementById('btn-use-gps').addEventListener('click', function() {
  if (!navigator.geolocation) {
    showReportAlert('error', '⚠️ Geolocation is not supported by your browser.');
    return;
  }

  this.disabled = true;
  this.innerHTML = '<span class="spinner"></span> Locating…';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const clamped = clampToCampus(lat, lng);
      const wasClamped = (clamped.lat !== lat || clamped.lng !== lng);

      if (!state.mapsInitialized.report) initReportMap();
      placeReportPin(clamped.lat, clamped.lng);

      if (wasClamped) {
        showReportAlert('warning', '📡 GPS location was outside the campus boundary — clamped to nearest campus point.');
      }

      this.disabled = false;
      this.innerHTML = '<span>📡</span> Use My GPS';
    },
    err => {
      showReportAlert('error', `📡 GPS error: ${err.message}`);
      this.disabled = false;
      this.innerHTML = '<span>📡</span> Use My GPS';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});


// ══════════════════════════════════════════════════════════════
// 10. BUILDING CHIPS
// ══════════════════════════════════════════════════════════════

document.querySelectorAll('.building-chip').forEach(chip => {
  chip.addEventListener('click', function() {
    // Deselect all
    document.querySelectorAll('.building-chip').forEach(c => c.classList.remove('selected'));
    this.classList.add('selected');

    const lat  = parseFloat(this.dataset.lat);
    const lng  = parseFloat(this.dataset.lng);
    const name = this.dataset.building;

    if (!state.mapsInitialized.report) initReportMap();

    // Slight delay to allow map init if needed
    setTimeout(() => {
      placeReportPin(lat, lng);
      // Also populate the location text with building name if empty
      const locInput = document.getElementById('location-text');
      if (locInput && !locInput.value) {
        locInput.value = `${name} Building`;
      }
    }, 100);
  });
});


// ══════════════════════════════════════════════════════════════
// 11. PHOTO UPLOAD PREVIEW
// ══════════════════════════════════════════════════════════════

const photoInput     = document.getElementById('photo-input');
const previewCont    = document.getElementById('photo-preview-container');
const previewImg     = document.getElementById('photo-preview-img');
const photoFileName  = document.getElementById('photo-file-name');
const btnRemovePhoto = document.getElementById('btn-remove-photo');
const photoDropZone  = document.getElementById('photo-drop-zone');

photoInput.addEventListener('change', handlePhotoChange);

function handlePhotoChange() {
  const file = photoInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showReportAlert('error', '📷 Photo too large — maximum file size is 5MB.');
    photoInput.value = '';
    return;
  }
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  photoFileName.textContent = file.name;
  previewCont.classList.add('show');
  photoDropZone.style.display = 'none';
}

btnRemovePhoto.addEventListener('click', clearPhoto);

function clearPhoto() {
  photoInput.value = '';
  previewImg.src = '';
  photoFileName.textContent = '';
  previewCont.classList.remove('show');
  photoDropZone.style.display = '';
}

// Click preview to open lightbox
previewImg.addEventListener('click', () => {
  if (previewImg.src) openImageModal(previewImg.src);
});

// Drag-and-drop onto the zone
photoDropZone.addEventListener('dragover', e => { e.preventDefault(); photoDropZone.style.borderColor = 'var(--isatu-blue)'; });
photoDropZone.addEventListener('dragleave', ()  => { photoDropZone.style.borderColor = ''; });
photoDropZone.addEventListener('drop', e => {
  e.preventDefault();
  photoDropZone.style.borderColor = '';
  const files = e.dataTransfer.files;
  if (files.length) {
    photoInput.files = files;        // assign DataTransfer
    handlePhotoChange();
  }
});


// ══════════════════════════════════════════════════════════════
// 12. REPORT ALERT HELPER
// ══════════════════════════════════════════════════════════════

function showReportAlert(type, html, autoDismissMs = 0) {
  const el = document.getElementById('report-alert');
  el.className = `show ${type}`;
  el.innerHTML = `
    <span style="font-size:18px;flex-shrink:0;">${type==='success'?'✅':type==='warning'?'⚠️':'❌'}</span>
    <div style="flex:1;">${html}</div>
    <button onclick="document.getElementById('report-alert').classList.remove('show')"
      style="background:none;border:none;cursor:pointer;font-size:16px;opacity:.6;"
      aria-label="Dismiss">×</button>
  `;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (autoDismissMs) setTimeout(() => el.classList.remove('show'), autoDismissMs);
}


// ══════════════════════════════════════════════════════════════
// 13. FORM SUBMISSION — Create Ticket (Tab 1)
// ══════════════════════════════════════════════════════════════

document.getElementById('issue-report-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const lat = document.getElementById('report-lat').value;
  const lng = document.getElementById('report-lng').value;

  // Validation
  if (!lat || !lng) {
    showReportAlert('error', '📍 Please pin your location on the map first (click the map or tap a building chip).');
    return;
  }
  if (!document.getElementById('issue-type').value) {
    showReportAlert('error', '🔧 Please select an issue type.');
    return;
  }
  if (!document.getElementById('location-text').value.trim()) {
    showReportAlert('error', '📍 Please enter a location description.');
    return;
  }
  if (!document.getElementById('issue-description').value.trim()) {
    showReportAlert('error', '📝 Please describe the issue.');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-report');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span><span>Submitting…</span>';

  try {
    // POST with FormData so the photo file is included
    const formData = new FormData(this);

    const res = await fetch(`${API_BASE_URL}?action=create`, {
      method: 'POST',
      body:   formData
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || `Server returned ${res.status}`);
    }

    if (data.merged) {
      showReportAlert('warning',
        `⚠️ <b>Duplicate Detected & Clustered</b><br>
        Your report was merged into existing ticket
        <code style="font-weight:800;">${esc(data.ticket_code)}</code>.
        A technician will address it soon.`
      );
    } else {
      showReportAlert('success',
        `✅ <b>Report Submitted Successfully!</b><br>
        Your ticket code is <code style="font-weight:800;">${esc(data.ticket_code)}</code>.
        Please save this for reference.`,
        10000
      );
    }

    // Reset form
    this.reset();
    clearPhoto();
    document.getElementById('report-lat').value = '';
    document.getElementById('report-lng').value = '';
    document.getElementById('coords-text').textContent = 'No pin placed yet';
    document.querySelectorAll('.building-chip').forEach(c => c.classList.remove('selected'));
    if (state.reportMarker) { state.reportMarker.remove(); state.reportMarker = null; }

  } catch (err) {
    showReportAlert('error', `❌ <b>Submission Failed:</b> ${esc(err.message)}<br><small>Check your connection to the backend server.</small>`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>🚀</span><span class="btn-label">Submit Report</span>';
  }
});


// ══════════════════════════════════════════════════════════════
// 14. LOAD TICKETS — GET  (Tab 2)
// ══════════════════════════════════════════════════════════════

async function loadTickets() {
  try {
    const res  = await fetch(API_BASE_URL);
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'API error');

    state.tickets = Array.isArray(data.data) ? data.data : [];
    updateStats();
    applyFilters();
    renderDispatchPins(state.tickets);

  } catch (err) {
    console.error('[ISATU] loadTickets:', err);
    // Show empty state with error note
    const container = document.getElementById('tickets-container');
    container.innerHTML = `
      <div style="grid-column:1/-1;padding:40px;text-align:center;color:#ef4444;">
        <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
        <p style="font-size:14px;font-weight:600;">Could not load tickets</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(err.message)}</p>
      </div>
    `;
  }
}

/** Update the stats counters and badge */
function updateStats() {
  const tickets = state.tickets;
  const total      = tickets.length;
  const reported   = tickets.filter(t => t.status === 'reported').length;
  const inProgress = tickets.filter(t => t.status === 'in_progress').length;
  const resolved   = tickets.filter(t => t.status === 'resolved').length;
  const urgent     = tickets.filter(t => t.is_urgent == 1 || t.is_urgent === true).length;

  document.getElementById('stat-total').textContent       = total;
  document.getElementById('stat-reported').textContent    = reported;
  document.getElementById('stat-in-progress').textContent = inProgress;
  document.getElementById('stat-resolved').textContent    = resolved;
  document.getElementById('stat-urgent').textContent      = urgent;
  document.getElementById('badge-total-tickets').textContent = total;
}


// ══════════════════════════════════════════════════════════════
// 15. FILTERS
// ══════════════════════════════════════════════════════════════

document.querySelectorAll('.filter-status-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-status-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    this.classList.add('active');
    this.setAttribute('aria-pressed', 'true');
    state.filterStatus = this.dataset.status;
    applyFilters();
  });
});

document.getElementById('filter-role-select').addEventListener('change', function() {
  state.filterRole = this.value;
  applyFilters();
});

document.getElementById('filter-search-input').addEventListener('input', debounce(function() {
  state.filterSearch = this.value.trim().toLowerCase();
  applyFilters();
}, 250));

document.getElementById('btn-refresh-icon').addEventListener('click', () => loadTickets());

function applyFilters() {
  let filtered = [...state.tickets];

  if (state.filterStatus !== 'all') {
    filtered = filtered.filter(t => t.status === state.filterStatus);
  }
  if (state.filterRole) {
    filtered = filtered.filter(t =>
      (t.preferred_tech || '').toLowerCase().includes(state.filterRole.toLowerCase())
    );
  }
  if (state.filterSearch) {
    const q = state.filterSearch;
    filtered = filtered.filter(t =>
      (t.ticket_code   || '').toLowerCase().includes(q) ||
      (t.issue_type    || '').toLowerCase().includes(q) ||
      (t.location_text || '').toLowerCase().includes(q) ||
      (t.description   || '').toLowerCase().includes(q) ||
      (t.technician    || '').toLowerCase().includes(q)
    );
  }

  state.filtered = filtered;
  renderTickets(filtered);
}


// ══════════════════════════════════════════════════════════════
// 16. RENDER TICKET CARDS
// ══════════════════════════════════════════════════════════════

const statusLabel = { reported: 'Reported', in_progress: 'In Progress', resolved: 'Resolved' };
const issueIcon   = {
  'IT / PC & Network': '💻',
  'Electrical':        '⚡',
  'Plumbing':          '🚿',
  'Aircon / HVAC':     '❄️',
  'Furniture / Civil': '🪑'
};

function renderTickets(tickets) {
  const container = document.getElementById('tickets-container');
  const empty     = document.getElementById('tickets-empty');

  container.innerHTML = '';

  if (!tickets.length) {
    empty.classList.add('show');
    return;
  }
  empty.classList.remove('show');

  tickets.forEach(ticket => {
    const icon   = issueIcon[ticket.issue_type] || '🔧';
    const status = ticket.status || 'reported';
    const label  = statusLabel[status] || status;
    const isUrgent  = ticket.is_urgent == 1 || ticket.is_urgent === true;
    const isMerged  = ticket.merged_count > 0;
    const hasTech   = !!ticket.technician;

    const photoHtml = ticket.photo_path
      ? `<img class="ticket-photo-thumb" src="${esc(ticket.photo_path)}"
             alt="Issue photo for ${esc(ticket.ticket_code)}"
             onclick="openImageModal('${esc(ticket.photo_path)}')"
             loading="lazy" />`
      : '';

    const claimDisabled  = (status !== 'reported')   ? 'disabled' : '';
    const resolveDisabled= (status === 'resolved')   ? 'disabled' : '';

    const card = document.createElement('article');
    card.className = `ticket-card status-${status}`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Ticket ${ticket.ticket_code}`);
    card.dataset.ticketId = ticket.id;

    card.innerHTML = `
      <div class="ticket-status-bar" aria-hidden="true"></div>

      <div class="ticket-header">
        <span class="ticket-code">${esc(ticket.ticket_code)}</span>
        <span class="ticket-status-badge">${esc(label)}</span>
      </div>

      <div class="ticket-body">
        <div class="ticket-type">
          <span aria-hidden="true">${icon}</span>
          ${esc(ticket.issue_type)}
        </div>
        <div class="ticket-location">
          <span aria-hidden="true">📍</span>
          ${esc(ticket.location_text)}
        </div>
        <p class="ticket-desc">${esc(ticket.description)}</p>

        ${photoHtml}

        <div class="ticket-meta">
          ${isUrgent  ? '<span class="meta-chip urgent">🚨 Urgent</span>' : ''}
          ${isMerged  ? `<span class="meta-chip merged">🔀 +${ticket.merged_count} merged</span>` : ''}
          ${hasTech   ? `<span class="meta-chip tech">👷 ${esc(ticket.technician)}</span>` : ''}
          <span class="meta-chip" title="Submitted on">${fmtDateTime(ticket.created_at)}</span>
        </div>
      </div>

      <div class="ticket-actions">
        <button class="btn-action btn-claim"
                ${claimDisabled}
                onclick="openClaimModal(${ticket.id}, '${esc(ticket.ticket_code)}')"
                aria-label="Claim ticket ${esc(ticket.ticket_code)}">
          🛠️ Claim
        </button>
        <button class="btn-action btn-resolve"
                ${resolveDisabled}
                onclick="resolveTicket(${ticket.id}, this)"
                aria-label="Mark ticket ${esc(ticket.ticket_code)} as resolved">
          ✅ Resolve
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}


// ══════════════════════════════════════════════════════════════
// 17. CLAIM TICKET (POST action=claim)
// ══════════════════════════════════════════════════════════════

function openClaimModal(ticketId, ticketCode) {
  state.claimTargetId = ticketId;
  document.getElementById('modal-ticket-code').textContent = ticketCode;
  document.getElementById('technician-name-input').value   = '';
  hideClaimError();
  openModal('claim-modal');
  setTimeout(() => document.getElementById('technician-name-input').focus(), 50);
}

function hideClaimError() {
  const el = document.getElementById('claim-error-message');
  el.classList.remove('show');
  el.textContent = '';
}

function showClaimError(msg) {
  const el = document.getElementById('claim-error-message');
  el.textContent = msg;
  el.classList.add('show');
}

document.getElementById('btn-confirm-claim').addEventListener('click', async function() {
  const techName = document.getElementById('technician-name-input').value.trim();
  if (!techName) {
    showClaimError('⚠️ Please enter your name.');
    return;
  }

  this.disabled = true;
  this.innerHTML = '<span class="spinner" style="border-top-color:#fff;"></span> Claiming…';

  try {
    const res = await fetch(`${API_BASE_URL}?action=claim`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: state.claimTargetId, technician_name: techName })
    });

    if (res.status === 409) {
      const data = await res.json();
      throw new Error(data.message || 'This ticket has already been claimed by another technician.');
    }

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || `Error ${res.status}`);

    closeModal('claim-modal');
    await loadTickets();

  } catch (err) {
    showClaimError(`❌ ${err.message}`);
  } finally {
    this.disabled = false;
    this.textContent = '✓ Confirm Claim';
  }
});

// Enter key in name input triggers confirm
document.getElementById('technician-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-confirm-claim').click();
});


// ══════════════════════════════════════════════════════════════
// 18. RESOLVE TICKET (POST action=resolve)
// ══════════════════════════════════════════════════════════════

async function resolveTicket(ticketId, btnEl) {
  if (!confirm('Mark this ticket as RESOLVED? This cannot be undone.')) return;

  const originalHtml = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.innerHTML = '<span class="spinner" style="border-top-color:#16a34a;width:14px;height:14px;border-width:2px;"></span>';

  try {
    const res = await fetch(`${API_BASE_URL}?action=resolve`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: ticketId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || `Error ${res.status}`);

    await loadTickets();

  } catch (err) {
    alert(`Failed to resolve ticket: ${err.message}`);
    btnEl.disabled = false;
    btnEl.innerHTML = originalHtml;
  }
}


// ══════════════════════════════════════════════════════════════
// 19. IMAGE LIGHTBOX
// ══════════════════════════════════════════════════════════════

function openImageModal(src) {
  document.getElementById('image-modal-src').src = src;
  openModal('image-modal');
}


// ══════════════════════════════════════════════════════════════
// 20. BENCHMARK TAB
// ══════════════════════════════════════════════════════════════

/** Load 10 sample records into the textarea */
function loadSampleBenchmarkData() {
  const samples = [
    'IT / PC & Network | CIT Building Room 201 | Projector not displaying — no signal from laptop HDMI',
    'Electrical | Admin Building 2nd Floor | Flickering fluorescent lights in corridor near restroom',
    'Plumbing | CEA Building CR | Leaking faucet near sink 3 — water pooling on floor',
    'Aircon / HVAC | Library 1st Floor | AC unit dripping water and making loud rattling noise',
    'Furniture / Civil | Engineering Building Room 105 | 3 plastic chairs with broken backrests',
    'IT / PC & Network | ICT Lab 2 | Desktop PC #14 not powering on — no POST beep',
    'Electrical | Education Building | Power outlet at Room 302 is sparking — safety hazard',
    'Plumbing | CIT CR 1st Floor | Toilet bowl not flushing — clogged drain',
    'Aircon / HVAC | CEA Room 204 | Remote control lost for window-type AC unit',
    'IT / PC & Network | Admin Office | Network switch at server rack overheating — blinking orange'
  ];
  document.getElementById('benchmark-textarea').value = samples.join('\n');
}

/** Run the benchmark */
document.getElementById('btn-run-benchmark').addEventListener('click', async function() {
  const textarea = document.getElementById('benchmark-textarea');
  const raw = textarea.value.trim();

  if (!raw) {
    alert('Please enter at least one row or click "Load Sample Data".');
    return;
  }

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // Parse each line: issue_type | location_text | description
  const rows = [];
  const parseErrors = [];

  lines.forEach((line, i) => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length < 3) {
      parseErrors.push({ lineNum: i + 1, line, reason: 'Missing fields (need 3 pipe-separated values)' });
      return;
    }
    rows.push({
      issue_type:    parts[0],
      location_text: parts[1],
      description:   parts[2]
    });
  });

  this.disabled = true;
  this.innerHTML = '<span class="spinner"></span> Running…';

  const scorecard   = document.getElementById('benchmark-scorecard');
  const logContainer= document.getElementById('benchmark-log-container');
  scorecard.classList.add('show');
  logContainer.innerHTML = '';

  // Log parse errors
  parseErrors.forEach(e => {
    appendLog(logContainer, e.lineNum, 'err',
      `PARSE ERROR — "${esc(e.line.substring(0,50))}" → ${e.reason}`);
  });

  document.getElementById('metric-exec-time').textContent = '…';
  document.getElementById('metric-inserted').textContent  = '…';
  document.getElementById('metric-merged').textContent    = '…';
  document.getElementById('metric-rejected').textContent  = '…';

  const t0 = performance.now();
  let inserted = 0, merged = 0, rejected = 0;

  try {
    const res = await fetch(`${API_BASE_URL}?action=batch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ rows })
    });

    const elapsed = performance.now() - t0;

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || `Server error ${res.status}`);

    // Tally results
    const results = Array.isArray(data.results) ? data.results : [];

    results.forEach((r, i) => {
      const lineNum = i + 1;
      if (r.rejected || r.status === 'rejected') {
        rejected++;
        appendLog(logContainer, lineNum, 'err',
          `REJECTED — ${esc(r.issue_type || rows[i]?.issue_type)} | ${esc(r.reason || 'Invalid data')}`);
      } else if (r.merged || r.status === 'merged') {
        merged++;
        appendLog(logContainer, lineNum, 'warn',
          `MERGED → ${esc(r.ticket_code)} | ${esc(r.issue_type || rows[i]?.issue_type)}`);
      } else {
        inserted++;
        appendLog(logContainer, lineNum, 'ok',
          `INSERTED → ${esc(r.ticket_code)} | ${esc(r.issue_type || rows[i]?.issue_type)} @ ${esc(r.location_text || rows[i]?.location_text)}`);
      }
    });

    // Parse errors also count as rejected
    rejected += parseErrors.length;

    // Update scorecard metrics
    document.getElementById('metric-exec-time').textContent = elapsed.toFixed(1);
    document.getElementById('metric-inserted').textContent  = inserted;
    document.getElementById('metric-merged').textContent    = merged;
    document.getElementById('metric-rejected').textContent  = rejected;
    document.getElementById('scorecard-timestamp').textContent =
      new Date().toLocaleString('en-PH');

    appendLog(logContainer, '—', 'info',
      `BENCHMARK COMPLETE: ${elapsed.toFixed(1)}ms | ${inserted} inserted | ${merged} merged | ${rejected} rejected`);

    // Reload dispatch board if visible
    if (state.mapsInitialized.dispatch) loadTickets();

  } catch (err) {
    const elapsed = performance.now() - t0;
    document.getElementById('metric-exec-time').textContent = elapsed.toFixed(1);
    document.getElementById('metric-inserted').textContent  = '—';
    document.getElementById('metric-merged').textContent    = '—';
    document.getElementById('metric-rejected').textContent  = '—';
    appendLog(logContainer, '!', 'err', `FATAL ERROR: ${esc(err.message)}`);
  } finally {
    this.disabled = false;
    this.innerHTML = '<span>▶</span> Run Benchmark';
  }
});

function appendLog(container, num, type, msg) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `
    <span class="log-num">${num}.</span>
    <span class="log-${type}">${msg}</span>
  `;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}


// ══════════════════════════════════════════════════════════════
// 21. AUTO-REFRESH DISPATCH BOARD (every 60 seconds)
// ══════════════════════════════════════════════════════════════

setInterval(() => {
  if (state.mapsInitialized.dispatch) loadTickets();
}, 60_000);


// ══════════════════════════════════════════════════════════════
// 22. BOOT — Initialize Report Tab Map on startup
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the report map immediately (Tab 1 is default active)
  initReportMap();
});
