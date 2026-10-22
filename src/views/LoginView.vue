<script setup>
import { t } from '../i18n'
import { ref } from 'vue'
import { signIn, loadProfile, pendingNext } from '../auth'
import { go } from '../router'
import { siteName } from '../constants'

const account = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)
// 從別的站過來時，告訴同學登入後會回到哪裡
const from = pendingNext() ? siteName(pendingNext()) : ''

async function submit() {
  error.value = ''
  busy.value = true
  const msg = await signIn(account.value, password.value)
  if (msg) {
    error.value = msg
    busy.value = false
    return
  }
  await loadProfile()
  busy.value = false
  go()
}
</script>

<template>
  <div class="page login">
    <img src="/logo.svg" alt="" class="logo" />
    <h1 class="center">{{ t('FDFZ click 帳號登錄') }}</h1>
    <p class="center muted">{{ t('權益牆、樹洞、前帆報共用一個帳號，登入一次就全部可以用。') }}</p>
    <p v-if="from" class="note center">{{ t('登入後會回到{site}', { site: t(from) }) }}</p>

    <form class="stack" @submit.prevent="submit">
      <label class="field">
        <span>{{ t('學號或 Email') }}</span>
        <input v-model="account" autocomplete="username" required />
      </label>
      <label class="field">
        <span>{{ t('密碼') }}</span>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="error">{{ t(error) }}</p>
      <button class="btn block" :disabled="busy">{{ busy ? t('登入中…') : t('登入') }}</button>
    </form>
    <p class="center muted small">{{ t('忘記密碼？請帶校園卡找權益部重設。') }}</p>

    <p class="center muted" style="margin-top: 40px">{{ t('還沒有帳號？') }}</p>
    <router-link to="/register" class="btn ghost block">{{ t('註冊新帳號') }}</router-link>
    <p class="center muted small">{{ t('註冊需經權益部核對校園卡，通過後各站都能使用。') }}</p>
  </div>
</template>

<style scoped>
/* 背景向兩側鋪滿整個視窗寬度 */
.login {
  padding-top: 48px; min-height: 100vh;
  background: var(--bg-hero);
  box-shadow: 0 0 0 100vmax var(--bg-hero);
  clip-path: inset(0 -100vmax);
}
.logo { display: block; width: 96px; height: 96px; margin: 0 auto 16px; }
h1 { font-size: 30px; }
.note { margin: 16px 0 24px; background: var(--white); }
</style>
