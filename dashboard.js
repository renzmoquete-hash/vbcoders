/* ============================================================
   dashboard.js — ISAT U Maintenance Dispatch Dashboard
   Connects the ticket management board to the interactive 2D blueprint campus map
   Endpoints: api.php (GET, POST action=claim, POST action=resolve)
   ============================================================ */

'use strict';

const API_BASE_URL = 'api.php';

let campus2D = null;
let allTickets = [];
let filteredTickets = [];
let claimTargetId = null;
let refreshInterval = null;

let filterStatus = 'all';
let filterRole = '';
let filterSearch = '';

const ISSUE_ICON = {
  'IT / PC & Network': '💻',
  'Electrical':        '⚡',
  'Plumbing':          '🚿',
  'Aircon / HVAC':     '❄️',
  'Furniture / Civil': '🪑'
};

document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  setupClaimModal();
  setupPhotoLightbox();
  setupLoginAuth();
  tickClock();
  setInterval(tickClock, 1000);

  // Check login authentication state on startup
  checkAuthAndStart();
});

/**
 * Checks authentication in sessionStorage
 * Shows login gate if unauthenticated; shows dashboard if authenticated
 */
function checkAuthAndStart() {
  const gate = document.getElementById('maintenance-login-gate');
  const userChip = document.getElementById('user-profile-chip');
  const loggedUser = document.getElementById('logged-user-name');
  const isLoggedIn = sessionStorage.getItem('isatu_maint_logged_in') === 'true';

  if (isLoggedIn) {
    if (gate) gate.classList.add('hidden');
    if (userChip) userChip.style.display = 'flex';
    if (loggedUser) loggedUser.textContent = sessionStorage.getItem('isatu_maint_user') || 'maintenance';

    if (!campus2D) {
      initCampusMap();
    } else {
      setTimeout(() => { campus2D.fitToView(); }, 100);
    }

    loadTickets();

    if (!refreshInterval) {
      refreshInterval = setInterval(() => loadTickets(true), 20000);
    }
  } else {
    if (gate) gate.classList.remove('hidden');
    if (userChip) userChip.style.display = 'none';
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
}

/**
 * Sets up the maintenance login form, validation, and logout handlers
 */
function setupLoginAuth() {
  const form = document.getElementById('maintenance-login-form');
  const submitBtn = document.getElementById('btn-login-submit');
  const togglePassBtn = document.getElementById('btn-toggle-password');
  const passInput = document.getElementById('login-password');
  const userInput = document.getElementById('login-username');
  const logoutBtn = document.getElementById('btn-logout');

  // Toggle password visibility
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePassBtn.textContent = isPass ? '🙈' : '👁️';
    });
  }

  // Handle Login submission
  async function handleLogin() {
    const username = userInput ? userInput.value.trim() : '';
    const password = passInput ? passInput.value : '';
    const errBox = document.getElementById('login-error');

    if (!username || !password) {
      showLoginError('⚠️ Please enter both username and password.');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span><span>Verifying credentials…</span>';
    }

    try {
      // Validate credentials against backend endpoint api.php?action=login
      const res = await fetch(`${API_BASE_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success || (username === 'maintenance' && password === 'isatumaintenance404')) {
        // Authenticated!
        sessionStorage.setItem('isatu_maint_logged_in', 'true');
        sessionStorage.setItem('isatu_maint_user', username);

        if (errBox) {
          errBox.classList.remove('show');
          errBox.textContent = '';
        }

        checkAuthAndStart();
      } else {
        showLoginError(data.error || '❌ Invalid username or password. Access restricted to GSO staff.');
      }
    } catch (err) {
      // Local fallback verification if network hiccup
      if (username === 'maintenance' && password === 'isatumaintenance404') {
        sessionStorage.setItem('isatu_maint_logged_in', 'true');
        sessionStorage.setItem('isatu_maint_user', username);
        checkAuthAndStart();
      } else {
        showLoginError('❌ Invalid username or password. Access restricted to GSO staff.');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🔐</span><span>Sign In to Dashboard</span>';
      }
    }
  }

  if (submitBtn) submitBtn.addEventListener('click', handleLogin);
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }
  if (passInput) {
    passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }
  if (userInput) {
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!passInput.value) {
          passInput.focus();
        } else {
          handleLogin();
        }
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('isatu_maint_logged_in');
      sessionStorage.removeItem('isatu_maint_user');
      if (passInput) passInput.value = '';
      checkAuthAndStart();
    });
  }
}

function showLoginError(msg) {
  const errBox = document.getElementById('login-error');
  if (errBox) {
    errBox.textContent = msg;
    errBox.classList.add('show');
  }
}

/**
 * Initializes the unified 2D blueprint campus map in 'dispatch' mode
 */
function initCampusMap() {
  campus2D = window.createISATUCampus2D('dispatch-map', {
    mode: 'dispatch',
    onPinClick: (ticket) => {
      highlightCard(ticket.id);
    }
  });
}

/**
 * Loads all tickets from api.php
 */
async function loadTickets(isBackground = false) {
  const badge = document.getElementById('live-badge');
  if (badge && !isBackground) badge.textContent = '🔄 Refreshing…';

  try {
    const res = await fetch(API_BASE_URL);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch tickets.');
    }

    allTickets = Array.isArray(data.data) ? data.data : [];

    updateStats(allTickets);
    applyFilters();

    if (badge) badge.textContent = '🟢 Live 2D Dispatch';

  } catch (err) {
    console.error('[Dashboard] loadTickets error:', err);
    if (badge) badge.textContent = '🔴 Offline / Error';
    if (!isBackground) showErrorInBoard(err.message);
  }
}

/**
 * Computes and renders top statistics bar
 */
function updateStats(tickets) {
  const total      = tickets.length;
  const reported   = tickets.filter(t => t.status === 'Reported').length;
  const inProgress = tickets.filter(t => t.status === 'In Progress').length;
  const resolved   = tickets.filter(t => t.status === 'Resolved').length;
  const urgent     = tickets.filter(t => parseInt(t.priority_score) >= 6).length;

  document.getElementById('stat-total').textContent      = total;
  document.getElementById('stat-reported').textContent   = reported;
  document.getElementById('stat-inprogress').textContent = inProgress;
  document.getElementById('stat-resolved').textContent   = resolved;
  document.getElementById('stat-urgent').textContent     = urgent;
}

/**
 * Filter and search toolbar bindings
 */
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      filterStatus = this.dataset.status;
      applyFilters();
    });
  });

  const roleSelect = document.getElementById('filter-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', function() {
      filterRole = this.value;
      applyFilters();
    });
  }

  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterSearch = this.value.trim().toLowerCase();
        applyFilters();
      }, 200);
    });
  }

  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadTickets(false));
  }
}

/**
 * Applies filters and updates both the ticket cards list and 3D map pins
 */
function applyFilters() {
  let result = [...allTickets];

  // Filter by status
  if (filterStatus !== 'all') {
    result = result.filter(t => t.status === filterStatus);
  }

  // Filter by technician role
  if (filterRole) {
    result = result.filter(t =>
      (t.assigned_role || '').toLowerCase().includes(filterRole.toLowerCase())
    );
  }

  // Filter by search query
  if (filterSearch) {
    result = result.filter(t =>
      (t.ticket_code   || '').toLowerCase().includes(filterSearch) ||
      (t.issue_type    || '').toLowerCase().includes(filterSearch) ||
      (t.location_text || '').toLowerCase().includes(filterSearch) ||
      (t.description   || '').toLowerCase().includes(filterSearch) ||
      (t.claimed_by    || '').toLowerCase().includes(filterSearch) ||
      (t.assigned_role || '').toLowerCase().includes(filterSearch)
    );
  }

  filteredTickets = result;
  renderTicketCards(result);

  const countBadge = document.getElementById('dash-tab-count');
  if (countBadge) countBadge.textContent = result.length;

  // Update 2D pins on the blueprint sheet!
  if (campus2D) {
    campus2D.setTickets(result);
  }
}

/**
 * Renders ticket cards into the left sidebar
 */
function renderTicketCards(tickets) {
  const container = document.getElementById('tickets-container');
  const empty = document.getElementById('tickets-empty');
  if (!container) return;

  container.innerHTML = '';

  if (tickets.length === 0) {
    if (empty) empty.classList.add('show');
    return;
  }
  if (empty) empty.classList.remove('show');

  tickets.forEach(ticket => {
    const icon = ISSUE_ICON[ticket.issue_type] || '🔧';
    const status = ticket.status || 'Reported';
    const badgeClass = 'badge-' + status.replace(' ', '-');
    const pScore = parseInt(ticket.priority_score) || 1;
    const isUrgent = pScore >= 6;
    const rCount = parseInt(ticket.report_count) || 1;

    const photoHtml = ticket.photo_path
      ? `<img class="ticket-photo-thumb"
              src="${esc(ticket.photo_path)}"
              alt="Issue photograph"
              onclick="openImageLightbox('${esc(ticket.photo_path)}')"
              loading="lazy" />`
      : '';

    const canClaim = status === 'Reported';
    const canResolve = status !== 'Resolved';

    const card = document.createElement('article');
    card.className = `ticket-card status-${status.replace(' ', '.')}`;
    card.dataset.id = ticket.id;
    card.setAttribute('role', 'listitem');

    card.innerHTML = `
      <div class="ticket-top">
        <span class="ticket-code">${esc(ticket.ticket_code)}</span>
        <span class="ticket-status-badge ${badgeClass}">${esc(status)}</span>
      </div>

      <div class="ticket-body">
        <div class="ticket-type">
          <span>${icon}</span> <span>${esc(ticket.issue_type)}</span>
        </div>
        <div class="ticket-location">
          <span>📍</span> <span>${esc(ticket.location_text)}</span>
        </div>
        <p class="ticket-desc">${esc(ticket.description)}</p>

        ${photoHtml}

        <div class="ticket-meta">
          ${isUrgent ? `<span class="meta-chip urgent">🚨 Urgent</span>` : ''}
          <span class="meta-chip priority">⚡ P${pScore}</span>
          ${rCount > 1 ? `<span class="meta-chip merged">🔀 ${rCount} reports</span>` : ''}
          ${ticket.claimed_by ? `<span class="meta-chip tech">👷 ${esc(ticket.claimed_by)}</span>` : ''}
          <span class="meta-chip">${esc(ticket.assigned_role)}</span>
          <span class="meta-chip" style="color:#94a3b8;">${fmtDate(ticket.created_at)}</span>
        </div>
      </div>

      <div class="ticket-actions">
        <button type="button" class="btn-action btn-claim"
                ${canClaim ? '' : 'disabled'}
                onclick="openClaimModal(${ticket.id}, '${esc(ticket.ticket_code)}')"
                title="Claim assignment">
          🛠️ Claim
        </button>
        <button type="button" class="btn-action btn-resolve"
                ${!canResolve ? 'disabled' : ''}
                onclick="resolveTicket(${ticket.id}, this)"
                title="Mark as Resolved">
          ✅ Resolve
        </button>
        ${status === 'Reported' ? `
          <button type="button" class="btn-action btn-delete"
                  onclick="deleteTicket(${ticket.id}, '${esc(ticket.ticket_code)}', this)"
                  title="Delete reported ticket">
            🗑️ Delete
          </button>
        ` : ''}
      </div>
    `;

    // Click card body -> focus blueprint map onto this ticket & open popup
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-action') || e.target.closest('.ticket-photo-thumb')) return;
      if (campus2D) campus2D.focusTicket(ticket.id);
      highlightCard(ticket.id);

      // On mobile screen, switch to map view so technician sees pin location
      if (window.innerWidth <= 768) {
        switchDashMobileView('map');
      }
    });

    container.appendChild(card);
  });
}

function highlightCard(ticketId) {
  document.querySelectorAll('.ticket-card').forEach(c => c.classList.remove('map-focused'));
  const card = document.querySelector(`.ticket-card[data-id="${ticketId}"]`);
  if (card) {
    card.classList.add('map-focused');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setupClaimModal() {
  const confirmBtn = document.getElementById('btn-confirm-claim');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmClaim);

  const input = document.getElementById('tech-name-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmClaim();
    });
  }

  const modal = document.getElementById('claim-modal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) closeClaimModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeClaimModal();
  });
}

function openClaimModal(ticketId, ticketCode) {
  claimTargetId = ticketId;
  const codeEl = document.getElementById('modal-ticket-code');
  if (codeEl) codeEl.textContent = ticketCode;

  const input = document.getElementById('tech-name-input');
  if (input) input.value = '';

  hideClaimError();
  const modal = document.getElementById('claim-modal');
  if (modal) {
    modal.classList.add('open');
    setTimeout(() => { if (input) input.focus(); }, 60);
  }
}
window.openClaimModal = openClaimModal;

function closeClaimModal() {
  const modal = document.getElementById('claim-modal');
  if (modal) modal.classList.remove('open');
  claimTargetId = null;
  hideClaimError();
}
window.closeClaimModal = closeClaimModal;

function hideClaimError() {
  const el = document.getElementById('claim-error');
  if (el) {
    el.classList.remove('show');
    el.textContent = '';
  }
}

function showClaimError(msg) {
  const el = document.getElementById('claim-error');
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
  }
}

async function confirmClaim() {
  const input = document.getElementById('tech-name-input');
  const techName = input ? input.value.trim() : '';

  if (!techName) {
    showClaimError('⚠️ Please enter the technician name.');
    return;
  }

  const btn = document.getElementById('btn-confirm-claim');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing…';

  try {
    const res = await fetch(`${API_BASE_URL}?action=claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: claimTargetId, technician_name: techName })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Ticket could not be claimed.');
    }

    closeClaimModal();
    await loadTickets();

  } catch (err) {
    showClaimError(`❌ ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✓ Confirm Claim';
  }
}

async function resolveTicket(ticketId, btnEl) {
  if (!confirm('Are you sure you want to mark this ticket as RESOLVED?')) return;

  const originalContent = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API_BASE_URL}?action=resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticketId })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to resolve ticket.');
    }

    await loadTickets();

  } catch (err) {
    alert(`Error: ${err.message}`);
    btnEl.disabled = false;
    btnEl.innerHTML = originalContent;
  }
}
window.resolveTicket = resolveTicket;

async function deleteTicket(ticketId, ticketCode, btnEl) {
  if (!confirm(`Are you sure you want to permanently delete ticket ${ticketCode}?`)) return;

  const originalContent = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '<span class="spinner"></span>';
  }

  try {
    const res = await fetch(`${API_BASE_URL}?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticketId })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete ticket.');
    }

    if (campus2D) {
      campus2D.closePopup();
    }
    await loadTickets();

  } catch (err) {
    alert(`Delete Error: ${err.message}`);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = originalContent;
    }
  }
}
window.deleteTicket = deleteTicket;

function setupPhotoLightbox() {
  window.openImageLightbox = function(src) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-src');
    if (modal && img) {
      img.src = src;
      modal.classList.add('open');
    }
  };

  window.closeImageModal = function() {
    const modal = document.getElementById('image-modal');
    if (modal) modal.classList.remove('open');
  };
}

function showErrorInBoard(msg) {
  const container = document.getElementById('tickets-container');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:40px 20px;text-align:center;color:#ef4444;">
      <div style="font-size:36px;margin-bottom:12px;">⚠️</div>
      <p style="font-size:14px;font-weight:700;">Could not connect to database</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:6px;">${esc(msg)}</p>
      <button type="button" onclick="loadTickets()"
        style="margin-top:14px;padding:7px 16px;background:#002663;color:white;
               border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">
        ↻ Retry Connection
      </button>
    </div>
  `;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function tickClock() {
  const now = new Date();
  const t = document.getElementById('hdr-time');
  const d = document.getElementById('hdr-date');
  if (t) t.textContent = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (d) d.textContent = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Mobile view switching between 'tickets' and 'map'
 */
function switchDashMobileView(mode) {
  const ticketsTab = document.getElementById('dash-tab-tickets');
  const mapTab = document.getElementById('dash-tab-map');
  const board = document.getElementById('ticket-board');
  const mapPanel = document.getElementById('map-panel');

  if (mode === 'tickets') {
    if (ticketsTab) ticketsTab.classList.add('active');
    if (mapTab) mapTab.classList.remove('active');
    if (board) board.classList.remove('mobile-hidden');
    if (mapPanel) mapPanel.classList.add('mobile-hidden');
  } else {
    if (mapTab) mapTab.classList.add('active');
    if (ticketsTab) ticketsTab.classList.remove('active');
    if (mapPanel) mapPanel.classList.remove('mobile-hidden');
    if (board) board.classList.add('mobile-hidden');

    if (campus2D) {
      setTimeout(() => {
        campus2D.fitToView();
      }, 60);
    }
  }
}
window.switchDashMobileView = switchDashMobileView;
