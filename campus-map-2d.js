/* ============================================================
   campus-map-2d.js — ISAT U Interactive 2D Blueprint Campus Engine
   100% Accurate 2D Blueprint Representation (Zero External Map APIs)
   Unified for Student Portal (index.html) & Maintenance (dashboard.html)
   ============================================================ */

'use strict';

// ── Geographic Calibration for ISAT U La Paz Main Campus ──
const ISATU_2D_GEO = {
  minLng: 122.5642, // West boundary (x = 0%)
  maxLng: 122.5688, // East boundary (x = 100%)
  minLat: 10.7130,  // South boundary (y = 100%)
  maxLat: 10.7180   // North boundary (y = 0%)
};

// ── Precise 2D Blueprint Hotspots based on the official ISAT U campus plan ──
const ISATU_2D_HOTSPOTS = [
  // ── Administration & Central ──
  { id: 'admin', name: 'Administration Building', zone: 'admin', x: 34.5, y: 41.2, icon: '🏛️' },
  { id: 'lopez_jaena', name: 'Graciano Lopez Jaena Bldg (Teachers Ed / Cafeteria)', zone: 'coe', x: 36.2, y: 45.4, icon: '🍽️' },
  { id: 'guard_main', name: 'Main Campus Guardhouse', zone: 'admin', x: 31.5, y: 45.0, icon: '👮' },

  // ── CIT (College of Industrial Technology - Purple) ──
  { id: 'cit_main', name: 'CIT Building', zone: 'cit', x: 36.0, y: 26.5, icon: '💻' },
  { id: 'civil_tech', name: 'Civil Technology Building', zone: 'cit', x: 33.2, y: 28.0, icon: '🏗️' },
  { id: 'machine_shop', name: 'Machine Shop (Sarmento Bldg)', zone: 'cit', x: 29.8, y: 36.2, icon: '⚙️' },
  { id: 'power_house', name: 'AME Power House (Tabiana-Montinola)', zone: 'cit', x: 29.5, y: 39.0, icon: '⚡' },
  { id: 'transformer', name: 'Transformer Building', zone: 'cit', x: 29.8, y: 33.0, icon: '🔌' },
  { id: 'tle_hometel', name: 'Hometel (TLE Center)', zone: 'cit', x: 25.8, y: 19.5, icon: '🏠' },
  { id: 'supply_office', name: 'Supply Office & Storage', zone: 'cit', x: 25.8, y: 24.5, icon: '📦' },
  { id: 'ict_bldg', name: 'ICT Building & Water Tank', zone: 'cit', x: 44.5, y: 19.5, icon: '🖥️' },

  // ── Main Grounds & Sports (Green) ──
  { id: 'football_field', name: 'Open Field / Football Ground', zone: 'grounds', x: 45.0, y: 52.0, icon: '⚽' },
  { id: 'basketball_court', name: 'Open Basketball Court', zone: 'grounds', x: 34.0, y: 51.0, icon: '🏀' },
  { id: 'badminton_court', name: 'Proposed Badminton Court', zone: 'grounds', x: 33.0, y: 54.2, icon: '🏸' },
  { id: 'grandstand', name: 'Stage / Grandstand', zone: 'grounds', x: 32.2, y: 57.2, icon: '🎪' },
  { id: 'tennis_court', name: 'Tennis Court', zone: 'grounds', x: 34.8, y: 65.8, icon: '🎾' },
  { id: 'science_classroom', name: 'N-Bldg (3-Storey Science Classroom)', zone: 'cas', x: 34.2, y: 61.2, icon: '🔬' },

  // ── CEA (College of Engineering and Architecture - Orange) ──
  { id: 'cea_bldg', name: 'CEA Building', zone: 'cea', x: 65.0, y: 36.5, icon: '📐' },
  { id: 'cyber_nook', name: "Students' Cyber Nook Park", zone: 'cea', x: 62.0, y: 37.0, icon: '🌳' },
  { id: 'alumni_bldg', name: 'Alumni Building & Park', zone: 'cea', x: 63.5, y: 40.2, icon: '🏛️' },
  { id: 'cea_bridge', name: 'CEA-ICT Interconnecting Bridge', zone: 'cea', x: 69.5, y: 34.0, icon: '🌉' },

  // ── CAS (College of Arts and Sciences - Pink) ──
  { id: 'covered_gym', name: 'Multi-Purpose Covered Gym', zone: 'cas', x: 67.2, y: 47.0, icon: '🏟️' },
  { id: 'museum_bakery', name: 'ISAT U Proposed Museum & Bakery', zone: 'cas', x: 68.0, y: 50.0, icon: '🥐' },
  { id: 'mendoza_bldg', name: 'Teachers Education Bldg (Mendoza Bldg)', zone: 'coe', x: 69.0, y: 53.0, icon: '📚' },
  { id: 'mini_forest', name: 'Mini Forest & Eco Zone', zone: 'grounds', x: 67.0, y: 56.0, icon: '🌲' },
  { id: 'hrt_bldg', name: 'HRT Building & Kitchen', zone: 'cas', x: 69.8, y: 58.5, icon: '🍳' },
  { id: 'gso_office', name: 'General Services Management (GSO)', zone: 'admin', x: 70.5, y: 62.0, icon: '🛠️' },
  { id: 'library_bldg', name: 'Library (Roldan Hall)', zone: 'admin', x: 69.0, y: 65.0, icon: '📖' },
  { id: 'k_l_bldg', name: 'K & L Buildings', zone: 'cas', x: 70.0, y: 68.0, icon: '🏫' },

  // ── COE & Dormitories (Yellow) ──
  { id: 'pe_bldg', name: 'PE Building (1-Storey)', zone: 'coe', x: 55.0, y: 69.2, icon: '🏃' },
  { id: 'athletes_dorm', name: "Athletes' Dormitory", zone: 'coe', x: 52.0, y: 72.0, icon: '🛏️' },
  { id: 'kitchen_dorm', name: 'Kitchen Dormitory', zone: 'coe', x: 51.0, y: 75.0, icon: '🍲' },
  { id: 'alumni_dorm', name: 'Alumni Dormitory', zone: 'coe', x: 50.0, y: 77.2, icon: '🏢' },
  { id: 'lab_school', name: 'Laboratory School', zone: 'coe', x: 48.0, y: 81.0, icon: '🎒' },
  { id: 'cofta_dorm', name: 'COFTA Dormitory (Ladies)', zone: 'coe', x: 47.0, y: 84.0, icon: '🛌' },
  { id: 'proposed_wellness', name: 'Proposed Gymnasium & Wellness Center', zone: 'coe', x: 37.0, y: 76.0, icon: '🧘' },
  { id: 'pres_cottage', name: "President's Cottage & COE Extension", zone: 'coe', x: 36.0, y: 82.0, icon: '🏡' },

  // ── NEW SITE Complex (North-East - Orange/Cyan) ──
  { id: 'academic_hub', name: 'Academic & Innovation Hub Building', zone: 'newsite', x: 74.0, y: 9.0, icon: '💡' },
  { id: 'mechanical_power', name: 'Mechanical Shop & Power House', zone: 'newsite', x: 78.0, y: 13.0, icon: '🔧' },
  { id: 'cultural_heritage', name: 'Cultural Heritage & Research Bldg', zone: 'newsite', x: 80.0, y: 16.0, icon: '🎨' },
  { id: 'research_hub', name: 'Research Hub Building', zone: 'newsite', x: 82.0, y: 21.0, icon: '🔬' },
  { id: 'student_services', name: 'Students Services Building', zone: 'newsite', x: 83.2, y: 24.0, icon: '🤝' },
  { id: 'science_lab_new', name: 'Science Laboratory (Dirilon Bldg)', zone: 'newsite', x: 84.0, y: 27.2, icon: '🧪' },
  { id: 'science_bldg_new', name: 'Science Building', zone: 'newsite', x: 80.5, y: 31.0, icon: '🔭' },
  { id: 'tvet_newsite', name: 'Bldg. A - TVEP / Entrepreneurial Lake', zone: 'newsite', x: 62.0, y: 24.0, icon: '🦆' }
];

/**
 * Converts map percentage (0 to 100) to latitude & longitude
 */
function percentToGeoCoords2D(xPct, yPct) {
  const lng = ISATU_2D_GEO.minLng + (xPct / 100) * (ISATU_2D_GEO.maxLng - ISATU_2D_GEO.minLng);
  const lat = ISATU_2D_GEO.maxLat - (yPct / 100) * (ISATU_2D_GEO.maxLat - ISATU_2D_GEO.minLat);
  return {
    lat: Number(lat.toFixed(7)),
    lng: Number(lng.toFixed(7))
  };
}

/**
 * Converts latitude & longitude back to map percentage (0 to 100)
 */
function geoCoordsToPercent2D(lat, lng) {
  const x = ((lng - ISATU_2D_GEO.minLng) / (ISATU_2D_GEO.maxLng - ISATU_2D_GEO.minLng)) * 100;
  const y = ((ISATU_2D_GEO.maxLat - lat) / (ISATU_2D_GEO.maxLat - ISATU_2D_GEO.minLat)) * 100;
  return {
    x: Math.max(0, Math.min(100, Number(x.toFixed(2)))),
    y: Math.max(0, Math.min(100, Number(y.toFixed(2))))
  };
}

/**
 * Finds nearest building hotspot to an (x, y) percent click
 */
function findNearestHotspot2D(x, y, maxDistance = 6.5) {
  let nearest = null;
  let minD = Infinity;
  ISATU_2D_HOTSPOTS.forEach(spot => {
    const d = Math.hypot(spot.x - x, spot.y - y);
    if (d < minD) {
      minD = d;
      nearest = spot;
    }
  });
  return (minD <= maxDistance) ? nearest : null;
}

/**
 * ISATUCampus2D Class
 * Smooth pan/zoom interactive 2D blueprint map
 */
class ISATUCampus2D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`ISATUCampus2D: Container #${containerId} not found.`);
      return;
    }

    this.options = Object.assign({
      mode: 'report',            // 'report' (student click-to-pin) or 'dispatch' (maintenance board)
      imageSrc: 'assets/campus-map.jpg',
      onPinPlaced: null,
      onPinClick: null
    }, options);

    // Pan & Zoom State
    this.scale = 1.0;
    this.minScale = 0.5;
    this.maxScale = 4.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.hasMoved = false;

    // Pins & Data State
    this.studentPin = null;
    this.tickets = [];
    this.ticketPinsMap = new Map();
    this.activePopup = null;
    this.labelsVisible = true;

    this.init();
  }

  init() {
    this.buildDOM();
    this.bindEvents();

    // Auto-fit blueprint sheet to viewport on startup & image load
    const img = this.sheet.querySelector('.campus-2d-img');
    if (img) {
      if (img.complete) {
        this.fitToView();
      } else {
        img.addEventListener('load', () => this.fitToView());
      }
    }

    setTimeout(() => {
      this.fitToView();
    }, 100);
  }

  buildDOM() {
    this.container.classList.add('campus-2d-viewport');
    this.container.innerHTML = `
      <!-- Toolbar Navigation Controls -->
      <div class="campus-2d-toolbar">
        <button type="button" class="btn-2d-tool" data-action="reset">↺ Reset</button>
        <button type="button" class="btn-2d-tool" data-jump="main">🏛️ Main</button>
        <button type="button" class="btn-2d-tool" data-jump="newsite">🏗️ New Site</button>
        <button type="button" class="btn-2d-tool" data-jump="cit">💻 CIT</button>
        <button type="button" class="btn-2d-tool" data-jump="cea">📐 CEA</button>
        <button type="button" class="btn-2d-tool" data-jump="grounds">⚽ Grounds</button>
        <button type="button" class="btn-2d-tool" data-action="toggle-labels">🏷️ Labels</button>
      </div>

      <!-- Hint Banner -->
      <div class="campus-2d-hint">
        ${this.options.mode === 'report' ? 'Tap map to pin location' : 'Live Campus Map'}
      </div>

      <!-- Floating Zoom In / Out Buttons -->
      <div class="campus-2d-floating-nav">
        <button type="button" class="btn-2d-circle" data-zoom="in" title="Zoom In">+</button>
        <button type="button" class="btn-2d-circle" data-zoom="out" title="Zoom Out">−</button>
        <button type="button" class="btn-2d-circle" data-action="fit" title="Fit Blueprint to View">↔</button>
      </div>

      <!-- Legend Indicator (Bottom Left) -->
      <div class="campus-2d-legend">
        ${this.options.mode === 'report' ? `
          <span>📍 Tap map to pin</span>
        ` : `
          <span><span style="color:#ef4444;">●</span> Reported</span>
          <span><span style="color:#f59e0b;">●</span> Active</span>
          <span><span style="color:#22c55e;">●</span> Fixed</span>
        `}
      </div>

      <!-- Canvas Transform Container -->
      <div class="campus-2d-canvas" id="${this.container.id}-canvas">
        <div class="campus-2d-sheet" id="${this.container.id}-sheet">
          <img src="${this.options.imageSrc}" alt="ISAT U Campus 2D Blueprint" class="campus-2d-img" />
          <div class="campus-2d-overlay" id="${this.container.id}-overlay"></div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById(`${this.container.id}-canvas`);
    this.sheet = document.getElementById(`${this.container.id}-sheet`);
    this.overlay = document.getElementById(`${this.container.id}-overlay`);

    // Render 2D building hotspots
    this.renderHotspots();
  }

  renderHotspots() {
    ISATU_2D_HOTSPOTS.forEach(spot => {
      const el = document.createElement('div');
      el.className = `hotspot-2d zone-${spot.zone}`;
      el.style.left = `${spot.x}%`;
      el.style.top = `${spot.y}%`;
      el.dataset.id = spot.id;
      el.innerHTML = `<span>${spot.icon}</span> <span>${spot.name.split('(')[0].trim()}</span>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleHotspotClick(spot);
      });

      this.overlay.appendChild(el);
    });
  }

  bindEvents() {
    // ── Mouse Pan ──
    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.campus-2d-toolbar') || e.target.closest('.campus-2d-floating-nav')) return;
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.startX) - this.panX;
      const dy = (e.clientY - this.startY) - this.panY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMoved = true;
      }
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // ── Mouse Wheel Zoom at Cursor ──
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY < 0 ? 1.15 : 0.85;
      this.zoomAtPoint(mouseX, mouseY, delta);
    }, { passive: false });

    // ── Click on 2D Blueprint Overlay ──
    this.overlay.addEventListener('click', (e) => {
      if (this.hasMoved) return;

      const rect = this.overlay.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const xPercent = (clickX / rect.width) * 100;
      const yPercent = (clickY / rect.height) * 100;

      if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
        this.handleMapClick(xPercent, yPercent);
      }
    });

    // ── Toolbar & Floating Navigation Buttons ──
    this.container.querySelectorAll('[data-action], [data-jump], [data-zoom]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.action) this.handleAction(btn.dataset.action, btn);
        if (btn.dataset.jump) this.handleJump(btn.dataset.jump);
        if (btn.dataset.zoom) this.handleZoom(btn.dataset.zoom);
      });
    });

    // ── Touch Gestures (Pinch to zoom, pan) ──
    let initialTouchDistance = 0;
    let initialScale = 1;

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.hasMoved = false;
        this.startX = e.touches[0].clientX - this.panX;
        this.startY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        initialTouchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = this.scale;
      }
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.hasMoved = true;
        this.panX = e.touches[0].clientX - this.startX;
        this.panY = e.touches[0].clientY - this.startY;
        this.applyTransform();
      } else if (e.touches.length === 2) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialTouchDistance > 0) {
          const newScale = initialScale * (currentDist / initialTouchDistance);
          this.scale = Math.min(this.maxScale, Math.max(this.minScale, newScale));
          this.applyTransform();
        }
      }
    }, { passive: true });

    this.container.addEventListener('touchend', () => {
      this.isDragging = false;
      initialTouchDistance = 0;
    });

    window.addEventListener('resize', () => this.fitToView());
  }

  handleHotspotClick(spot) {
    if (this.options.mode === 'report') {
      this.placeStudentPin(spot.x, spot.y, spot.name);
    } else {
      this.focusOnPercent(spot.x, spot.y, 1.6);
    }
  }

  handleMapClick(xPct, yPct) {
    if (this.options.mode === 'report') {
      const nearest = findNearestHotspot2D(xPct, yPct, 6.0);
      const name = nearest ? nearest.name : `Campus Location (${xPct.toFixed(1)}%, ${yPct.toFixed(1)}%)`;
      this.placeStudentPin(xPct, yPct, name);
    } else {
      this.closePopup();
    }
  }

  /**
   * Places or moves the student's issue pinpoint on the 2D blueprint
   */
  placeStudentPin(xPct, yPct, locationText) {
    if (this.studentPin && this.studentPin.parentElement) {
      this.studentPin.remove();
    }

    const pin = document.createElement('div');
    pin.className = 'pin-2d-student';
    pin.style.left = `${xPct}%`;
    pin.style.top = `${yPct}%`;

    pin.innerHTML = `
      <div class="pin-2d-marker">
        <span>📍</span>
      </div>
      <div class="pin-2d-tag">${locationText ? locationText.split('(')[0].trim() : 'Pinned Spot'}</div>
    `;

    this.overlay.appendChild(pin);
    this.studentPin = pin;

    const coords = percentToGeoCoords2D(xPct, yPct);

    if (typeof this.options.onPinPlaced === 'function') {
      this.options.onPinPlaced({
        x: xPct,
        y: yPct,
        lat: coords.lat,
        lng: coords.lng,
        locationText: locationText
      });
    }
  }

  clearStudentPin() {
    if (this.studentPin && this.studentPin.parentElement) {
      this.studentPin.remove();
    }
    this.studentPin = null;
  }

  /**
   * Renders all tickets from database onto the 2D blueprint (Maintenance Dashboard)
   */
  setTickets(tickets) {
    this.tickets = tickets || [];

    // Clear old pins
    this.ticketPinsMap.forEach(pin => pin.remove());
    this.ticketPinsMap.clear();
    this.closePopup();

    this.tickets.forEach(ticket => {
      const lat = parseFloat(ticket.latitude);
      const lng = parseFloat(ticket.longitude);

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const pct = geoCoordsToPercent2D(lat, lng);
      const statusClass = ticket.status === 'Resolved' ? 'status-Resolved'
                        : ticket.status === 'In Progress' ? 'status-InProgress' : 'status-Reported';

      const icon = ticket.issue_type?.includes('IT') ? '💻'
                 : ticket.issue_type?.includes('Electrical') ? '⚡'
                 : ticket.issue_type?.includes('Plumbing') ? '🚿'
                 : ticket.issue_type?.includes('Aircon') ? '❄️' : '🪑';

      const pin = document.createElement('div');
      pin.className = `pin-2d-dispatch ${statusClass}`;
      pin.style.left = `${pct.x}%`;
      pin.style.top = `${pct.y}%`;
      pin.dataset.id = ticket.id;

      pin.innerHTML = `
        <div class="dispatch-badge">
          <span>${icon}</span> <span>${ticket.ticket_code}</span>
        </div>
        <div class="dispatch-pointer"></div>
      `;

      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showTicketPopup(ticket, pct.x, pct.y);
        if (typeof this.options.onPinClick === 'function') {
          this.options.onPinClick(ticket);
        }
      });

      this.overlay.appendChild(pin);
      this.ticketPinsMap.set(String(ticket.id), pin);
    });
  }

  showTicketPopup(ticket, xPct, yPct) {
    this.closePopup();

    const popup = document.createElement('div');
    popup.className = 'popup-2d-card';
    if (yPct < 22) {
      popup.classList.add('popup-below');
    }
    popup.style.left = `${xPct}%`;
    popup.style.top = `${yPct}%`;

    const statusColor = ticket.status === 'Resolved' ? '#22c55e'
                      : ticket.status === 'In Progress' ? '#f59e0b' : '#ef4444';

    popup.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:800;color:#38bdf8;letter-spacing:0.4px;">${ticket.ticket_code}</span>
        <button type="button" class="popup-2d-close" style="background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer;">✕</button>
      </div>

      <div style="font-size:12px;font-weight:700;color:#ffffff;margin-bottom:4px;">${ticket.issue_type}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">📍 ${ticket.location_text}</div>

      <p style="font-size:11.5px;color:#cbd5e1;line-height:1.4;margin-bottom:8px;max-height:60px;overflow-y:auto;">
        ${ticket.description || 'No description provided.'}
      </p>

      ${ticket.photo_path ? `
        <div style="margin-bottom:8px;">
          <img src="${ticket.photo_path}" alt="Issue photo"
               style="width:100%;height:65px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid #334155;"
               onclick="window.openImageLightbox && window.openImageLightbox('${ticket.photo_path}')" />
        </div>
      ` : ''}

      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:10px;">
        <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">
          ${ticket.status}
        </span>
        <span style="font-size:10px;font-weight:600;color:#94a3b8;">
          Priority: ⚡ P${ticket.priority_score || 1}
        </span>
      </div>

      <div style="display:flex;gap:6px;">
        ${ticket.status === 'Reported' ? `
          <button type="button" class="btn-2d-claim" data-id="${ticket.id}"
                  style="flex:1;padding:6px 8px;background:#002663;color:white;border:1px solid #38bdf8;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">
            🛠️ Claim
          </button>
          <button type="button" class="btn-2d-delete" data-id="${ticket.id}"
                  style="padding:6px 10px;background:#7f1d1d;color:#fca5a5;border:1px solid #ef4444;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">
            🗑️ Delete
          </button>
        ` : ''}
        ${ticket.status !== 'Resolved' ? `
          <button type="button" class="btn-2d-resolve" data-id="${ticket.id}"
                  style="flex:1;padding:6px 8px;background:#15803d;color:#ffffff;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">
            ✅ Resolve
          </button>
        ` : ''}
      </div>
    `;

    popup.querySelector('.popup-2d-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closePopup();
    });

    const claimBtn = popup.querySelector('.btn-2d-claim');
    if (claimBtn) {
      claimBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.openClaimModal) window.openClaimModal(ticket.id, ticket.ticket_code);
      });
    }

    const deleteBtn = popup.querySelector('.btn-2d-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.deleteTicket) window.deleteTicket(ticket.id, ticket.ticket_code, deleteBtn);
      });
    }

    const resolveBtn = popup.querySelector('.btn-2d-resolve');
    if (resolveBtn) {
      resolveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.resolveTicket) window.resolveTicket(ticket.id, resolveBtn);
      });
    }

    this.overlay.appendChild(popup);
    this.activePopup = popup;
  }

  closePopup() {
    if (this.activePopup && this.activePopup.parentElement) {
      this.activePopup.remove();
    }
    this.activePopup = null;
  }

  /**
   * Smoothly pans the blueprint sheet directly onto a ticket WITHOUT zooming in,
   * ensuring the popup card is fully visible without being clipped.
   */
  focusTicket(ticketId) {
    const ticket = this.tickets.find(t => String(t.id) === String(ticketId));
    if (!ticket) return;

    const lat = parseFloat(ticket.latitude);
    const lng = parseFloat(ticket.longitude);
    if (!lat || !lng) return;

    const pct = geoCoordsToPercent2D(lat, lng);
    // Pan smoothly without changing zoom scale, leaving headroom for the popup card
    this.focusOnPercent(pct.x, pct.y, null, 0.58);

    this.ticketPinsMap.forEach(p => p.classList.remove('active-focus'));
    const pin = this.ticketPinsMap.get(String(ticketId));
    if (pin) pin.classList.add('active-focus');

    setTimeout(() => {
      this.showTicketPopup(ticket, pct.x, pct.y);
    }, 280);
  }

  focusOnPercent(xPct, yPct, targetScale = null, yRatio = 0.5) {
    const vRect = this.container.getBoundingClientRect();
    const sheetW = this.sheet.offsetWidth;
    const sheetH = this.sheet.offsetHeight;

    if (targetScale !== null && targetScale !== undefined) {
      this.scale = targetScale;
    }
    const targetPixelX = (xPct / 100) * sheetW;
    const targetPixelY = (yPct / 100) * sheetH;

    this.panX = (vRect.width / 2) - (targetPixelX * this.scale);
    this.panY = (vRect.height * yRatio) - (targetPixelY * this.scale);

    this.applyTransform(true);
  }

  handleJump(zone) {
    switch (zone) {
      case 'main':
        this.focusOnPercent(35, 45, 1.5);
        break;
      case 'newsite':
        this.focusOnPercent(78, 20, 1.6);
        break;
      case 'cit':
        this.focusOnPercent(34, 30, 1.6);
        break;
      case 'cea':
        this.focusOnPercent(65, 38, 1.6);
        break;
      case 'grounds':
        this.focusOnPercent(44, 53, 1.45);
        break;
    }
  }

  handleAction(action, btn) {
    if (action === 'reset' || action === 'fit') {
      this.fitToView();
    } else if (action === 'toggle-labels') {
      this.labelsVisible = !this.labelsVisible;
      btn.textContent = this.labelsVisible ? '🏷️ Labels' : '🏷️ Hidden';
      this.overlay.querySelectorAll('.hotspot-2d').forEach(el => {
        el.style.display = this.labelsVisible ? 'flex' : 'none';
      });
    }
  }

  handleZoom(dir) {
    const factor = dir === 'in' ? 1.25 : 0.8;
    const vRect = this.container.getBoundingClientRect();
    this.zoomAtPoint(vRect.width / 2, vRect.height / 2, factor);
  }

  zoomAtPoint(pixelX, pixelY, factor) {
    const oldScale = this.scale;
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, oldScale * factor));
    if (newScale === oldScale) return;

    this.panX = pixelX - (pixelX - this.panX) * (newScale / oldScale);
    this.panY = pixelY - (pixelY - this.panY) * (newScale / oldScale);
    this.scale = newScale;

    this.applyTransform();
  }

  fitToView() {
    const vRect = this.container.getBoundingClientRect();
    const sheetW = this.sheet.offsetWidth;
    const sheetH = this.sheet.offsetHeight;

    const scaleX = (vRect.width * 0.94) / sheetW;
    const scaleY = (vRect.height * 0.94) / sheetH;
    this.scale = Math.min(scaleX, scaleY, 1.3);

    this.panX = (vRect.width - sheetW * this.scale) / 2;
    this.panY = (vRect.height - sheetH * this.scale) / 2;

    this.applyTransform(true);
  }

  applyTransform(smooth = false) {
    if (smooth) {
      this.canvas.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
      setTimeout(() => {
        this.canvas.style.transition = '';
      }, 320);
    }
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }
}

// Global factory helper
window.createISATUCampus2D = function(containerId, options) {
  return new ISATUCampus2D(containerId, options);
};
