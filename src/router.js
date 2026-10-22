import { createRouter, createWebHistory } from 'vue-router'
import { auth, authReady, destination, leaveTo, rememberNext } from './auth'

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

router.beforeEach(async (to) => {
  await authReady
  rememberNext(to.query.next)
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
