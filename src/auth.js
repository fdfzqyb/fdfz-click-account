import { reactive } from 'vue'
import { supabase } from './supabase'
import { safeNext } from './fdfz'

// 全站共用的登入狀態：session 是 Supabase 的登入資訊，profile 是 profiles 表裡自己那一筆
export const auth = reactive({
  ready: false,
  session: null,
  profile: null,
  error: '', // 連不上 Supabase 時顯示給同學看的訊息
})

let markReady
// 路由會等這個 Promise，確認完登入狀態才決定要去哪一頁
export const authReady = new Promise((resolve) => (markReady = resolve))

export async function loadProfile() {
  if (!auth.session) {
    auth.profile = null
    return
  }
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.session.user.id)
    .maybeSingle()
  auth.profile = data
}

async function loadSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  auth.session = data.session
  await loadProfile()
}

// 在別的 fdfz.click 站登入或登出後，cookie 變了，但這個分頁不會收到通知；
// 所以每次切回這個分頁都重新讀一次，換了人或被登出就更新畫面
async function recheck() {
  if (document.visibilityState !== 'visible') return
  const { data } = await supabase.auth.getSession()
  if (data.session?.user.id === auth.session?.user.id) return
  auth.session = data.session
  await loadProfile()
}

export async function initAuth() {
  // 網路很慢時不要一直空白：15 秒還沒好就先提示，之後連上了照樣會進站
  const slow = setTimeout(() => {
    auth.error = '連線很慢，還在嘗試連上伺服器…'
  }, 15000)
  try {
    await loadSession()
    auth.error = ''
  } catch (e) {
    console.error(e)
    auth.error = '連不上伺服器，請檢查網路後重新整理。'
    return
  } finally {
    clearTimeout(slow)
  }
  auth.ready = true
  markReady()

  supabase.auth.onAuthStateChange((_event, session) => {
    auth.session = session
    // 不能在這個回呼裡直接 await Supabase 查詢，所以放到下一輪執行
    setTimeout(loadProfile, 0)
  })
  document.addEventListener('visibilitychange', recheck)
}

export const isApproved = () => auth.profile?.verify_status === 'approved'

// 輸入八位數字當學號，否則當 email
export async function signIn(account, password) {
  let email = account.trim()
  if (/^\d{8}$/.test(email)) {
    const { data, error } = await supabase.rpc('login_email', { sid: email, pw: password })
    if (error || !data) return '學號或密碼錯誤'
    email = data
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) return null
  if (error.message.includes('Email not confirmed')) return '請先到信箱點擊驗證連結'
  return '帳號或密碼錯誤'
}

export async function signOut() {
  await supabase.auth.signOut()
  auth.profile = null
}

// 從別站過來時網址帶著 ?next=，記在這個分頁裡，註冊、等待審核、改密碼之後都還能回去
const NEXT_KEY = 'fdfz-next'
const BOUNCE_KEY = 'fdfz-bounce'

export function rememberNext(value) {
  const next = safeNext(value)
  if (next) sessionStorage.setItem(NEXT_KEY, next)
}

export const pendingNext = () => sessionStorage.getItem(NEXT_KEY)

// 帳號可以用了（已審核、不用改密碼）就回到原來的站
export function leaveTo(next) {
  sessionStorage.removeItem(NEXT_KEY)
  sessionStorage.setItem(BOUNCE_KEY, String(Date.now()))
  window.location.assign(next)
}

// 登入狀態確認後該去哪：帳號還不能用就留在帳號中心處理；能用而且有要回去的站，就自動跳回去。
// 若 10 秒內剛跳走又被送回來（例如那個站讀不到登入狀態），就不再自動跳，免得來回打轉
export function destination() {
  if (!auth.session) return '/login'
  if (!isApproved()) return '/pending'
  if (auth.profile?.must_change_password) return '/'
  const next = pendingNext()
  const bounced = Date.now() - Number(sessionStorage.getItem(BOUNCE_KEY) || 0) < 10000
  if (next && !bounced) return { external: next }
  return '/'
}
