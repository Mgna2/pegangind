// tracker.js — Order Tracking Page

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trackForm');
  const resiInput = document.getElementById('resiInput');
  const orderIdInput = document.getElementById('orderIdInput');
  const resultSection = document.getElementById('trackResult');
  const loadingBtn = document.getElementById('trackBtn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const resi = resiInput ? resiInput.value.trim() : '';
    const orderId = orderIdInput ? orderIdInput.value.trim() : '';
    const query = resi || orderId;
    if (!query) return;

    // Loading state
    loadingBtn.disabled = true;
    loadingBtn.innerHTML = '<span class="spinner"></span> Melacak...';
    resultSection.innerHTML = '';

    try {
      // Try order_id lookup first if orderId is provided, else try resi
      let res, data;
      if (orderId) {
        res = await fetch(`/api/order?order_id=${encodeURIComponent(orderId)}`);
        data = await res.json();
      } else {
        res = await fetch(`/api/track?resi=${encodeURIComponent(resi)}`);
        data = await res.json();
      }

      if (!data.success) {
        showNotFound(query);
      } else {
        showResult(data.order);
      }
    } catch (err) {
      showError();
    } finally {
      loadingBtn.disabled = false;
      loadingBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Lacak Sekarang';
    }
  });

  function showNotFound(resi) {
    resultSection.innerHTML = `
      <div class="track-result glass-card" style="padding: 48px; text-align: center;">
        <div style="font-size: 3.5rem; margin-bottom: 16px;">🔍</div>
        <h3 style="margin-bottom: 8px; color: var(--text-primary);">Pesanan Tidak Ditemukan</h3>
        <p style="color: var(--text-muted);">Nomor resi <strong style="font-family: 'JetBrains Mono', monospace;">${resi}</strong> tidak terdaftar di sistem kami.</p>
        <p style="margin-top: 12px; font-size: 0.875rem; color: var(--text-muted);">Pastikan nomor resi sudah benar atau hubungi kami di WhatsApp.</p>
      </div>
    `;
  }

  function showError() {
    resultSection.innerHTML = `
      <div class="track-result glass-card" style="padding: 48px; text-align: center;">
        <div style="font-size: 3.5rem; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin-bottom: 8px;">Terjadi Kesalahan</h3>
        <p style="color: var(--text-muted);">Tidak dapat terhubung ke server. Coba lagi.</p>
      </div>
    `;
  }

  function showResult(order) {
    const statuses = ['Pesanan Masuk', 'Sedang Dikerjakan', 'Sedang Dicetak', 'Selesai', 'Siap Dikirim', 'Sudah Dikirim'];
    const currentIdx = statuses.indexOf(order.status);

    const steps = statuses.map((s, i) => {
      let cls = '';
      if (i < currentIdx) cls = 'done';
      else if (i === currentIdx) cls = 'done active';
      const icon = i < currentIdx ? '✓' : i + 1;
      return `
        <div class="step ${cls}">
          <div class="step-circle">${icon}</div>
          <div class="step-label">${s}</div>
        </div>
      `;
    }).join('');

    const allImages = order.images || [];
    const productImages = allImages.filter(img => img.image_type !== 'documentation').slice(0, 4);
    const docImages = allImages.filter(img => img.image_type === 'documentation');

    // Use first product image as hero, or first doc image
    const heroImage = productImages[0] || docImages[0] || null;
    const heroImageHtml = heroImage
      ? `<img src="${heroImage.image_path}" alt="Produk 3D Print" onclick="openLightbox('${heroImage.image_path}')" style="width:100%;height:220px;object-fit:cover;border-radius:10px;cursor:pointer;" />`
      : `<div style="width:100%;height:220px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:0.85rem;flex-direction:column;gap:8px;">
           <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           Belum ada foto produk
         </div>`;

    const productImagesHtml = productImages.slice(1).map(img => `
      <img src="${img.image_path}" alt="Hasil 3D Print" onclick="openLightbox('${img.image_path}')" style="cursor:pointer; border-radius:8px; object-fit:cover; width:100%; height:100%;" />
    `).join('');

    const docImagesHtml = docImages.map(img => `
      <img src="${img.image_path}" alt="Dokumentasi" onclick="openLightbox('${img.image_path}')" style="cursor:pointer; border-radius:8px; object-fit:cover; width:100%; height:100%;" />
    `).join('');

    const formatDate = (d) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const badgeColor = {
      'Pesanan Masuk': 'gray',
      'Sedang Dikerjakan': 'blue',
      'Sedang Dicetak': 'blue',
      'Selesai': 'green',
      'Siap Dikirim': 'orange',
      'Sudah Dikirim': 'dark',
    };
    const bc = badgeColor[order.status] || 'gray';

    const isMidtrans = order.payment_method === 'midtrans';
    const payBadgeColor = { pending: 'orange', paid: 'green', expire: 'red', unpaid: 'red' };
    const payLabel = { pending: 'Pending', paid: 'Lunas', expire: 'Expired', unpaid: 'Unpaid' };

    const material = order.material_type || order.material || '-';
    const layerHeight = order.layer_height ? order.layer_height + ' mm' : '-';

    resultSection.innerHTML = `
      <div class="track-result">

        <!-- Hero: Foto Produk + Info Utama (gaya Shopee) -->
        <div class="glass-card" style="padding: 24px; margin-bottom: 20px;">
          <div style="display: flex; gap: 20px; flex-wrap: wrap;">

            <!-- Foto produk besar -->
            <div style="flex: 0 0 200px; width: 200px;">
              ${heroImageHtml}
            </div>

            <!-- Info produk -->
            <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 10px;">

              <!-- Header: ID + Status -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-family: 'JetBrains Mono', monospace; font-size: 1rem; font-weight: 700; color: var(--brand-blue);">${order.order_id}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${order.client_name}</div>
                  ${isMidtrans && order.midtrans_order_id ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 2px;">${order.midtrans_order_id}</div>` : ''}
                  ${order.resi_shopee ? `<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Resi: <span style="font-family: 'JetBrains Mono', monospace;">${order.resi_shopee}</span></div>` : ''}
                </div>
                <span class="badge badge-${bc}" style="font-size: 0.8rem; padding: 5px 12px;">${order.status}</span>
              </div>

              <!-- Detail Produk -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 12px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600;">Material</div>
                  <div style="font-weight: 600; font-size: 0.9rem; margin-top: 2px;">${material}</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600;">Resolusi</div>
                  <div style="font-weight: 600; font-size: 0.9rem; margin-top: 2px;">${layerHeight}</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600;">Berat</div>
                  <div style="font-weight: 600; font-size: 0.9rem; margin-top: 2px;">${order.gram_weight ? order.gram_weight + ' gram' : '-'}</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600;">Total Bayar</div>
                  <div style="font-weight: 700; font-size: 0.95rem; color: var(--brand-blue); margin-top: 2px;">${order.total_price ? 'Rp ' + order.total_price.toLocaleString('id-ID') : (order.total_price === 0 ? 'Rp 0' : '-')}</div>
                </div>
              </div>

              ${isMidtrans && order.payment_status ? `
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 0.78rem; color: var(--text-muted);">Pembayaran:</span>
                <span class="badge badge-${payBadgeColor[order.payment_status] || 'gray'}" style="font-size: 0.75rem;">${payLabel[order.payment_status] || order.payment_status}</span>
              </div>` : ''}

              ${order.tracking_number ? `
              <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 14px; font-size: 0.82rem;">
                <span style="color: #9a3412;">🚚 Resi Pengiriman:</span>
                <strong style="font-family: 'JetBrains Mono', monospace; color: #9a3412; margin-left: 4px;">${order.tracking_number}</strong>
              </div>` : ''}

              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Dipesan: ${formatDate(order.created_at)}
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Tracker -->
        <div class="glass-card" style="padding: 28px 24px; margin-bottom: 20px;">
          <h4 style="margin-bottom: 20px; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">📦 Progress Pesanan</h4>
          <div class="stepper">${steps}</div>
        </div>

        ${docImagesHtml ? `
        <!-- Dokumentasi -->
        <div class="glass-card" style="padding: 24px; margin-bottom: 20px;">
          <h4 style="margin-bottom: 16px; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">📸 Dokumentasi Pesanan</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;">
            ${docImagesHtml}
          </div>
          <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 10px;">Klik foto untuk memperbesar</p>
        </div>` : ''}

        ${productImagesHtml ? `
        <!-- Foto Produk Tambahan -->
        <div class="glass-card" style="padding: 24px; margin-bottom: 20px;">
          <h4 style="margin-bottom: 16px; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">🖼️ Foto Produk</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
            ${productImagesHtml}
          </div>
        </div>` : ''}

        ${order.notes ? `
        <div class="glass-card" style="padding: 24px;">
          <h4 style="margin-bottom: 12px; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">📝 Catatan</h4>
          <div style="font-size: 0.875rem; color: var(--text-body); line-height: 1.6; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f0f0f0;">${order.notes}</div>
        </div>` : ''}

      </div>
    `;

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
