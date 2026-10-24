// 帳號審核狀態的顯示文字
export const VERIFY_LABEL = { pending: '待審核', approved: '已通過', rejected: '未通過' }

// 校園卡照片在 id-cards 儲存空間裡的位置：每人一個以帳號 id 命名的資料夾
export const CARD_FILE = 'card.jpg'
export const cardPath = (userId) => `${userId}/${CARD_FILE}`

// 「我的帳號」頁列出的各站，只放已經上線的；新站上線後加一行
export const SITES = [
  { name: 'FDFZ 權益牆', url: 'https://wall.fdfz.click', desc: '把校園生活裡遇到的問題告訴權益部' },
  { name: 'FDFZ 樹洞', url: 'https://hole.fdfz.click', desc: '匿名說出想說的話，有受過培訓的同學聽你說' },
  { name: 'FDFZ 社團活動', url: 'https://club.fdfz.click', desc: '各社團的活動公告，可以報名、關注社團' },
]

// 「登入後會回到…」顯示的站名：認得的站用中文名，其他就顯示網域
export function siteName(url) {
  const host = new URL(url).hostname
  return SITES.find((s) => new URL(s.url).hostname === host)?.name ?? host
}
