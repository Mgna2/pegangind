// cart.js — Checkout flow + Admin price recalculation

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // CHECKOUT — Midtrans Snap flow
  // ============================================================
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = checkoutForm.querySelector('button[type="submit"]');
      const formData = new FormData(checkoutForm);

      // Basic client-side validation
      const client_name = formData.get('client_name');
      const whatsapp = formData.get('whatsapp');
      const email = formData.get('email');
      if (!client_name || !whatsapp || !email) {
        alert('Mohon lengkapi semua data.');
        return;
      }

      const address = formData.get('address') || '';
      const city = formData.get('city') || '';
      const province = formData.get('province') || '';
      const postal_code = formData.get('postal_code') || '';
      const notes = formData.get('notes') || '';

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Memproses...';

      try {
        // 1. Get Midtrans Snap token
        const tokenRes = await fetch('/api/midtrans/snap-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name,
            whatsapp,
            email,
            address,
            city,
            province,
            postal_code,
            notes,
          }),
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.success) {
          throw new Error(tokenData.error || 'Gagal membuat token pembayaran.');
        }

        // 2. Open Midtrans Snap popup
        if (typeof window.snap === 'undefined') {
          throw new Error('Midtrans Snap belum loaded. Refresh halaman dan coba lagi.');
        }

        window.snap.pay(tokenData.token, {
          onSuccess: async (result) => {
            // 3. Create order in DB
            const cartData = window.__cartData || [];
            await fetch('/api/midtrans/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                midtransOrderId: tokenData.midtransOrderId,
                client_name,
                whatsapp,
                email,
                address,
                city,
                province,
                postal_code,
                notes,
                cart: JSON.stringify(cartData),
              }),
            });
            window.location.href = `/konfirmasi-pesanan?order_id=${tokenData.midtransOrderId}`;
          },
          onPending: (result) => {
            // User opened popup but hasn't completed payment — still create pending order
            window.location.href = `/konfirmasi-pesanan?order_id=${tokenData.midtransOrderId}`;
          },
          onError: (err) => {
            console.error('Midtrans error:', err);
            alert('Pembayaran gagal. Silakan coba lagi.');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="credit-card" style="width:18px;height:18px;"></i> Bayar dengan Midtrans';
            if (window.lucide) window.lucide.createIcons();
          },
          onClose: () => {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="credit-card" style="width:18px;height:18px;"></i> Bayar dengan Midtrans';
            if (window.lucide) window.lucide.createIcons();
          },
        });
      } catch (err) {
        alert(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="credit-card" style="width:18px;height:18px;"></i> Bayar dengan Midtrans';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // ============================================================
  // ADMIN — Price recalculation on midtrans order edit
  // ============================================================
  const priceCalcForm = document.getElementById('midtransEditForm');
  if (priceCalcForm) {
    const prices = window.__prices || [];

    const recalc = () => {
      const matSel   = priceCalcForm.querySelector('[name="material_type"]');
      const lhSel    = priceCalcForm.querySelector('[name="layer_height"]');
      const gramIn   = priceCalcForm.querySelector('[name="gram_weight"]');
      const priceOut = priceCalcForm.querySelector('#calculatedPrice');

      if (!matSel || !lhSel || !gramIn || !priceOut) return;

      const mat = matSel.value;
      const lh  = lhSel.value;
      const gram = parseFloat(gramIn.value);

      if (!mat || !lh || !gram || gram <= 0) return;

      const row = prices.find(p => p.material === mat && p.layer_height === lh);
      if (!row) return;

      const total = Math.round(row.price_per_gram * gram);
      priceOut.textContent = 'Rp ' + total.toLocaleString('id-ID');
    };

    [ '[name="material_type"]', '[name="layer_height"]', '[name="gram_weight"]' ].forEach(sel => {
      const el = priceCalcForm.querySelector(sel);
      if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', recalc);
    });
  }

});
