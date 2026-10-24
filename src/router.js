import { createRouter, createWebHistory } from 'vue-router'
import { auth, authReady, destination, leaveTo, rememberNext, forgetNext } from './auth'

// meta.guest：只給還沒登入的人（登入、註冊）；其他頁都要先登入
const routes = [
  { path: '/login', component: () => import('./views/LoginView.vue'), meta: { guest: true } },
  { path: '/register', component: () => import('./views/RegisterView.vue'), meta: { guest: true } },
  { path: '/pending', component: () => import('./views/PendingView.vue') },
  { path: '/', component: () => import('./views/HomeView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 依登入狀態把人帶到該去的地方；要回別的站就直接離開
export function go(to = destination()) {
  if (typeof to === 'object') return leaveTo(to.external)
  return router.replace(to)
}

// 直接打開帳號中心（網址沒帶 ?next=，不是從別站轉過來）就清掉以前記的站，登入後停在「我的帳號」
if (!new URLSearchParams(location.search).has('next')) forgetNext()

router.beforeEach(async (to) => {
  await authReady
  if (to.query.next) {
    // 記下要回去的站後，把 ?next= 從網址拿掉：不然這個網址會留在瀏覽器紀錄裡，
    // 之後打 account.fdfz.click 被自動補成它，登入完就莫名其妙跳去別站
    rememberNext(to.query.next)
    const { next, ...query } = to.query
    return { path: to.path, query, hash: to.hash, replace: true }
  }
  const dest = destination()
  // 從登入頁、註冊頁、等待頁才自動跳回原來的站；直接打開「我的帳號」的人是來改設定的，不跳走
  if (typeof dest === 'object' && (to.meta.guest || to.path === '/pending')) {
    leaveTo(dest.external)
    return false
  }
  if (to.meta.guest) return auth.session ? dest : true
  if (!auth.session) return '/login'
  // 還沒通過審核只能待在等待頁；通過了就不用再看等待頁
  if (dest === '/pending') return to.path === '/pending' ? true : '/pending'
  if (to.path === '/pending') return '/'
  return true
})
