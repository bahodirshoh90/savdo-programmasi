// Admin panel: Rollar boshqaruvi uchun UI boshlang'ich shablon
const rolesSection = document.createElement('section');
rolesSection.innerHTML = `
  <h2>Rollar boshqaruvi</h2>
  <div id="roles-list">Rollar ro'yxati (TODO: dinamik yuklash)</div>
  <button id="add-role-btn">Yangi rol qo'shish</button>
`;
document.body.appendChild(rolesSection);
// TODO: Rollarni olish, qo'shish, tahrirlash, o'chirish uchun fetch chaqiruvlari va UI
