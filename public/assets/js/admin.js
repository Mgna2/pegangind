// admin.js — Dashboard Scripts

document.addEventListener('DOMContentLoaded', () => {
  initImageUpload();
  initDeleteConfirm();
  initSidebarToggle();
});

// ---- Image Upload Dropzone ----
function initImageUpload() {
  const dropzones = document.querySelectorAll('.dropzone');
  dropzones.forEach(zone => {
    const input = zone.querySelector('input[type="file"]');
    const previewGrid = zone.nextElementSibling;

    if (!input) return;

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('active');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('active'));

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('active');
      if (input.multiple) {
        const dt = new DataTransfer();
        [...input.files, ...e.dataTransfer.files].forEach(f => dt.items.add(f));
        input.files = dt.files;
      } else {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        input.files = dt.files;
      }
      renderPreviews(input, previewGrid);
    });

    input.addEventListener('change', () => renderPreviews(input, previewGrid));
  });
}

function renderPreviews(input, container) {
  if (!container || !container.classList.contains('image-preview-grid')) return;
  container.innerHTML = '';
  [...input.files].forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.className = 'preview-thumb';
    div.innerHTML = `
      <img src="${url}" alt="Preview" />
      <button type="button" class="preview-remove" onclick="removePreview(this, ${i})">✕</button>
    `;
    container.appendChild(div);
  });
}

window.removePreview = function(btn, idx) {
  const thumb = btn.parentElement;
  const container = thumb.parentElement;
  const dropzone = container.previousElementSibling;
  const input = dropzone ? dropzone.querySelector('input[type="file"]') : null;
  if (input) {
    const dt = new DataTransfer();
    [...input.files].filter((_, i) => i !== idx).forEach(f => dt.items.add(f));
    input.files = dt.files;
    renderPreviews(input, container);
  }
};

// ---- Delete Confirm ----
function initDeleteConfirm() {
  document.querySelectorAll('[data-confirm]').forEach(btn => {
    btn.addEventListener('click', e => {
      if (!confirm(btn.dataset.confirm || 'Yakin ingin menghapus?')) {
        e.preventDefault();
      }
    });
  });
}

// ---- Sidebar Toggle (Mobile) ----
function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

// ---- Image delete via AJAX ----
window.deleteImage = function(imageId, btn) {
  if (!confirm('Hapus gambar ini?')) return;
  fetch(`/admin/pesanan/${window._orderId}/images/${imageId}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      if (data.success) btn.closest('.gallery-item').remove();
    })
    .catch(() => alert('Gagal menghapus gambar'));
};
