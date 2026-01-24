// Seller panel: Bannerlarni boshqarish uchun UI boshlang'ich shablon
const bannersSection = document.createElement('section');
bannersSection.innerHTML = `
  <h2>Bannerlar boshqaruvi</h2>
  <div id="banners-list">Bannerlar ro'yxati (TODO: dinamik yuklash)</div>
  <button id="add-banner-btn">Yangi banner qo'shish</button>
`;
document.body.appendChild(bannersSection);
// TODO: Bannerlarni olish, qo'shish, tahrirlash, o'chirish uchun fetch chaqiruvlari va UI
