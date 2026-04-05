const { v4: uuidv4 } = require('uuid');

const generateOrderId = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `PG-${date}-${suffix}`;
};

const formatRupiah = (amount) => {
  if (!amount) return 'Rp 0';
  return 'Rp ' + parseInt(amount).toLocaleString('id-ID');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const statusColors = {
  'Pesanan Masuk': 'gray',
  'Sedang Dikerjakan': 'blue',
  'Sedang Dicetak': 'blue',
  'Selesai': 'green',
  'Siap Dikirim': 'orange',
  'Sudah Dikirim': 'darkgreen',
};

const generateWAMessage = (order) => {
  const msg = `Halo ${order.client_name}! Pesanan kamu (${order.order_id}) sudah update ke status: *${order.status}*. Terima kasih sudah order di pegangind! 🙏`;
  return `https://wa.me/${order.whatsapp?.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`;
};

module.exports = { generateOrderId, formatRupiah, formatDate, formatDateTime, statusColors, generateWAMessage };
