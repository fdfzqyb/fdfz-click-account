<script setup>
import { locale, setLocale, t } from '../i18n'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { auth, signOut, loadProfile, pendingNext, leaveTo } from '../auth'
import { VERIFY_LABEL, SITES, siteName } from '../constants'

const router = useRouter()

const profile = computed(() => auth.profile ?? {})
const email = computed(() => auth.session?.user?.email ?? '')
// 從別的站點「帳號設定」過來的，給一個回去的按鈕
const next = ref(pendingNext())
const nextName = computed(() => (next.value ? siteName(next.value) : ''))

const current = ref('')
const fresh = ref('')
const again = ref('')
const error = ref('')
const message = ref('')
const saving = ref(false)

async function changePassword() {
  error.value = ''
  message.value = ''
  if (fresh.value.length < 8) return (error.value = '新密碼至少 8 個字元')
  if (fresh.value !== again.value) return (error.value = '兩次輸入的新密碼不一樣')
  saving.value = true
  // 先用舊密碼登入一次，確認是本人在操作
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: email.value, password: current.value })
  if (wrong) {
    saving.value = false
    return (error.value = '目前密碼不正確')
  }
  const { error: failed } = await supabase.auth.updateUser({ password: fresh.value })
  saving.value = false
  if (failed) return (error.value = failed.message.includes('different') ? '新密碼不能和舊密碼一樣' : '修改失敗，請稍後再試')
  if (auth.profile?.must_change_password) {
    await supabase.rpc('password_changed')
    await loadProfile()
  }
  current.value = fresh.value = again.value = ''
  message.value = '密碼已修改，下次請用新密碼登入'
}

async function logout() {
  await signOut()
  router.push('/login')
}
</script>

<template>
  <header class="topbar">
    <img src="/logo.svg" alt="" class="logo-sm" />
    <h1>{{ t('我的帳號') }}</h1>
  </header>
  <div class="page stack">
    <p v-if="profile.must_change_password" class="note">{{ t('你正在使用權益部給的臨時密碼，請先改成自己的密碼，才能使用各站的功能。') }}</p>
    <button v-else-if="next" class="btn block" @click="leaveTo(next)">{{ t('回到{site}', { site: t(nextName) }) }}</button>

    <div class="card info">
      <div><span class="muted">{{ t('姓名') }}</span><b>{{ profile.full_name }}</b></div>
      <div><span class="muted">{{ t('學號') }}</span><b>{{ profile.student_id }}</b></div>
      <div><span class="muted">Email</span><b>{{ email }}</b></div>
      <div><span class="muted">{{ t('校園卡審核') }}</span><b>{{ t(VERIFY_LABEL[profile.verify_status] ?? '') }}</b></div>
    </div>

    <section v-if="!profile.must_change_password" class="card stack" aria-labelledby="sites-heading">
      <h2 id="sites-heading">{{ t('可以用這個帳號的網站') }}</h2>
      <ul class="sites">
        <li v-for="s in SITES" :key="s.url">
          <a :href="s.url" class="site">
            <strong>{{ t(s.name) }}</strong>
            <span class="muted small">{{ s.url.replace('https://', '') }}</span>
            <span class="muted small">{{ t(s.desc) }}</span>
          </a>
        </li>
      </ul>
    </section>

    <section class="card stack" aria-labelledby="language-heading">
      <h2 id="language-heading">{{ t('語言') }}</h2>
      <div class="language-options" role="group" aria-labelledby="language-heading">
        <button type="button" class="btn" :class="{ ghost: locale !== 'zh-Hans' }" :aria-pressed="locale === 'zh-Hans'" lang="zh-Hans" @click="setLocale('zh-Hans')">简体中文</button>
        <button type="button" class="btn" :class="{ ghost: locale !== 'zh-Hant' }" :aria-pressed="locale === 'zh-Hant'" lang="zh-Hant" @click="setLocale('zh-Hant')">繁體中文</button>
      </div>
      <p class="muted small">{{ t('各站共用這個設定，會儲存在此裝置。') }}</p>
    </section>

    <form class="card stack" @submit.prevent="changePassword">
      <h2>{{ t('修改密碼') }}</h2>
      <label class="field">
        <span>{{ profile.must_change_password ? t('臨時密碼') : t('目前密碼') }}</span>
        <input v-model="current" type="password" autocomplete="current-password" required />
      </label>
      <label class="field">
        <span>{{ t('新密碼') }}</span>
        <input v-model="fresh" type="password" autocomplete="new-password" required />
        <small>{{ t('至少 8 個字元') }}</small>
      </label>
      <label class="field">
        <span>{{ t('再輸入一次新密碼') }}</span>
        <input v-model="again" type="password" autocomplete="new-password" required />
      </label>
      <p v-if="error" class="error">{{ t(error) }}</p>
      <p v-if="message" class="note">{{ t(message) }}</p>
      <button class="btn block" :disabled="saving">{{ saving ? t('修改中…') : t('確認修改') }}</button>
    </form>

    <button class="btn plain block" @click="logout">{{ t('登出') }}</button>
    <p class="center muted small">{{ t('登出後，所有 fdfz.click 網站都會一起登出。') }}</p>
  </div>
</template>

<style scoped>
.page { padding-bottom: 48px; }
h2 { font-size: 18px; }
.info { display: grid; gap: 12px; }
.info div { display: flex; justify-content: space-between; gap: 12px; }
.info b { font-weight: 600; text-align: right; word-break: break-all; }
.sites { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.site {
  display: grid; gap: 2px; padding: 12px 14px;
  border: 1px solid var(--border); border-radius: 12px; color: var(--ink);
}
a.site:hover { border-color: var(--primary); }
.language-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.language-options .btn { padding: 12px 8px; }
.language-options .btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
</style>
