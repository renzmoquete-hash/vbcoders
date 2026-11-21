/* ============================================================
   student-portal.js — ISAT U Campus Issue Reporting
   Connects the interactive 2D blueprint campus map to the issue report form
   Posts to api.php?action=create
   ============================================================ */

'use strict';

const API_BASE_URL = 'api.php';

let campus2D = null;
let currentPin = null;

document.addEventListener('DOMContentLoaded', () => {
  initCampusMap();
  setupPhotoUpload();
  setupFormSubmit();
  tickClock();
  setInterval(tickClock, 1000);
});

/**
 * Initializes the unified 2D blueprint campus map in 'report' mode
 */
function initCampusMap() {
  campus2D = window.createISATUCampus2D('report-map', {
    mode: 'report',
    onPinPlaced: (pinData) => {
      currentPin = pinData;

      // Update hidden coordinates inputs
      document.getElementById('report-lat').value = pinData.lat;
      document.getElementById('report-lng').value = pinData.lng;

      // Update pinned location display
      const display = document.getElementById('pin-display');
      const text = document.getElementById('coords-text');
      display.classList.add('has-pin');
      text.textContent = `${pinData.locationText} (${pinData.lat.toFixed(6)}, ${pinData.lng.toFixed(6)})`;

      // Auto-fill location text field if empty or previously autofilled
      const locInput = document.getElementById('location-text');
      if (locInput && (!locInput.value.trim() || locInput.dataset.autofilled === 'true')) {
        locInput.value = pinData.locationText;
        locInput.dataset.autofilled = 'true';
      }

      showAlert('success', `📍 Pinned: <strong>${esc(pinData.locationText)}</strong>`);

      // Show floating mobile confirmation pill if on mobile (does NOT auto-switch; user switches voluntarily)
      showMobilePinNotice(pinData.locationText);
    }
  });
}

/**
 * Photo upload preview and drag-and-drop handling
 */
function setupPhotoUpload() {
  const photoInput  = document.getElementById('photo-input');
  const previewCont = document.getElementById('photo-preview-container');
  const previewImg  = document.getElementById('photo-preview-img');
  const fileName    = document.getElementById('photo-file-name');
  const dropZone    = document.getElementById('photo-drop-zone');
  const removeBtn   = document.getElementById('btn-remove-photo');

  if (!photoInput) return;

  photoInput.addEventListener('change', handleFile);
  removeBtn.addEventListener('click', clearPhoto);
  previewImg.addEventListener('click', () => {
    if (previewImg.src) openImageModal(previewImg.src);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#38bdf8';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '';
    if (e.dataTransfer.files.length) {
      photoInput.files = e.dataTransfer.files;
      handleFile();
    }
  });

  function handleFile() {
    const file = photoInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showAlert('error', '📷 Photo is too large — maximum file size is 5MB.');
      photoInput.value = '';
      return;
    }
    previewImg.src = URL.createObjectURL(file);
    fileName.textContent = file.name;
    previewCont.classList.add('show');
    dropZone.style.display = 'none';
  }

  function clearPhoto() {
    photoInput.value = '';
    previewImg.src = '';
    fileName.textContent = '';
    previewCont.classList.remove('show');
    dropZone.style.display = '';
  }
}

/**
 * Form submission handler
 */
function setupFormSubmit() {
  const form = document.getElementById('issue-report-form');
  if (!form) return;

  // Track if user manually edits location text so we don't overwrite it
  const locInput = document.getElementById('location-text');
  if (locInput) {
    locInput.addEventListener('input', () => {
      locInput.dataset.autofilled = 'false';
    });
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const lat = document.getElementById('report-lat').value;
    const lng = document.getElementById('report-lng').value;
    const issueType = document.getElementById('issue-type').value;
    const locationText = document.getElementById('location-text').value.trim();
    const description = document.getElementById('issue-description').value.trim();

    if (!lat || !lng) {
      showAlert('error', '📍 Please click on the campus blueprint map to pinpoint the exact location of the issue.');
      return;
    }

    if (!issueType) {
      showAlert('error', '🔧 Please select an issue category.');
      return;
    }

    if (!locationText) {
      showAlert('error', '📍 Please provide a location description.');
      return;
    }

    if (!description) {
      showAlert('error', '📝 Please describe the issue in detail.');
      return;
    }

    // Photo is REQUIRED — check if a file has been selected
    const photoInput = document.getElementById('photo-input');
    if (!photoInput || !photoInput.files || photoInput.files.length === 0) {
      showAlert('error', '📷 Please attach a photo of the issue. A photo is required to verify that the report is valid.');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-report');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span><span>Submitting Report…</span>';

    try {
      const formData = new FormData(this);
      const res = await fetch(`${API_BASE_URL}?action=create`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server error (${res.status})`);
      }

      if (data.merged) {
        showAlert('warning', `
          ⚠️ <b>Duplicate Issue Merged!</b><br>
          A similar issue was already reported within 20m. It has been merged into ticket:
          <code style="font-weight:800;font-size:13px;color:#002663;">${esc(data.ticket_code)}</code>.
          Priority has been increased!
        `);
      } else {
        showAlert('success', `
          ✅ <b>Report Submitted Successfully!</b><br>
          Your official ticket code is: <code style="font-weight:800;font-size:14px;color:#002663;">${esc(data.ticket_code)}</code>.<br>
          Priority Score: <strong>${data.priority_score || 1}</strong>. Maintenance has been dispatched!
        `);
      }

      // Reset form and 2D pin
      form.reset();
      currentPin = null;
      document.getElementById('report-lat').value = '';
      document.getElementById('report-lng').value = '';
      document.getElementById('coords-text').textContent = 'Tap map to pin location';
      document.getElementById('pin-display').classList.remove('has-pin');
      
      if (campus2D) {
        campus2D.clearStudentPin();
      }

      // Reset photo upload UI
      document.getElementById('photo-preview-container').classList.remove('show');
      document.getElementById('photo-drop-zone').style.display = '';
      document.getElementById('photo-preview-img').src = '';

      const notice = document.getElementById('mobile-pin-notice');
      if (notice) notice.classList.remove('show');

    } catch (err) {
      showAlert('error', `❌ <b>Submission Failed:</b> ${esc(err.message)}<br><small>Ensure XAMPP Apache and MySQL are running.</small>`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀</span><span class="btn-label">Submit Report</span>';
    }
  });
}

function showAlert(type, html) {
  const el = document.getElementById('report-alert');
  if (!el) return;
  el.className = `show ${type}`;
  el.innerHTML = `
    <span style="font-size:18px;flex-shrink:0;">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}</span>
    <div style="flex:1;">${html}</div>
    <button type="button" onclick="this.parentElement.classList.remove('show')"
      style="background:none;border:none;cursor:pointer;font-size:16px;opacity:.6;" aria-label="Dismiss">×</button>
  `;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openImageModal(src) {
  const modal = document.getElementById('image-modal');
  const img = document.getElementById('image-modal-src');
  if (modal && img) {
    img.src = src;
    modal.classList.add('open');
  }
}

function closeImageModal() {
  const modal = document.getElementById('image-modal');
  if (modal) modal.classList.remove('open');
}

window.openImageLightbox = openImageModal;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeImageModal();
});

function tickClock() {
  const now = new Date();
  const t = document.getElementById('hdr-time');
  const d = document.getElementById('hdr-date');
  if (t) t.textContent = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (d) d.textContent = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Mobile view switching between 'form' and 'map'
 */
function switchMobileView(mode) {
  const formTab = document.getElementById('tab-btn-form');
  const mapTab = document.getElementById('tab-btn-map');
  const sidebar = document.getElementById('report-sidebar');
  const mapPanel = document.getElementById('map-panel');

  if (mode === 'form') {
    if (formTab) formTab.classList.add('active');
    if (mapTab) mapTab.classList.remove('active');
    if (sidebar) sidebar.classList.remove('mobile-hidden');
    if (mapPanel) mapPanel.classList.add('mobile-hidden');

    const notice = document.getElementById('mobile-pin-notice');
    if (notice) notice.classList.remove('show');
  } else {
    if (mapTab) mapTab.classList.add('active');
    if (formTab) formTab.classList.remove('active');
    if (mapPanel) mapPanel.classList.remove('mobile-hidden');
    if (sidebar) sidebar.classList.add('mobile-hidden');

    if (campus2D) {
      setTimeout(() => {
        campus2D.fitToView();
      }, 60);
    }
  }
}
window.switchMobileView = switchMobileView;

/**
 * Shows an unobtrusive voluntary floating pill on mobile when a location is pinned.
 * The user can tap it to return to form, or use the top tabs, or continue panning/pinning.
 */
function showMobilePinNotice(locationName) {
  if (window.innerWidth > 768) return;

  let notice = document.getElementById('mobile-pin-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'mobile-pin-notice';
    notice.className = 'mobile-pin-notice';
    const mapPanel = document.getElementById('map-panel');
    if (mapPanel) {
      mapPanel.appendChild(notice);
    }
  }

  const shortName = locationName ? locationName.split('(')[0].trim() : 'Spot';
  notice.innerHTML = `
    <span>📍 <b>${esc(shortName)}</b> pinned</span>
    <button type="button" class="btn-return-form" onclick="switchMobileView('form')">
      Go to Form 📋
    </button>
  `;
  notice.classList.add('show');
}
window.showMobilePinNotice = showMobilePinNotice;

function handlePinDisplayClick() {
  if (window.innerWidth <= 768) {
    switchMobileView('map');
  }
}
window.handlePinDisplayClick = handlePinDisplayClick;
