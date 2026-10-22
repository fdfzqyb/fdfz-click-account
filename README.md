# FDFZ click 帳號登錄（帳號中心）

account.fdfz.click：權益牆、樹洞、前帆報共用的註冊、登入和帳號設定。在任何一站登入一次，所有 fdfz.click 網站都是登入狀態；在任何一站登出，全部一起登出。

- 前端：Vite + Vue，部署在 Cloudflare Workers
- 後端：和權益牆同一個 Supabase 專案，沿用 `profiles`（學號、校園卡審核 `verify_status`）和 `id-cards` 儲存空間，不需要另外執行 SQL
- 權益部審核帳號、設定身份的後台還是在權益牆

## 頁面

| 網址 | 內容 |
|---|---|
| `/login` | 學號或 Email 登入 |
| `/register` | 註冊並上傳校園卡照片 |
| `/pending` | 等待審核、被拒後重新上傳、刪除未審核的註冊 |
| `/` | 我的帳號：個人資料、各站入口、簡繁切換、改密碼、登出 |

每一頁都可以帶 `?next=https://某站.fdfz.click/某頁`。帳號可以用了（已審核、不用改密碼）就會自動跳回去。`next` 只接受 fdfz.click 底下的 https 網址。

## 共用登入怎麼做到的

- [`src/supabase.js`](src/supabase.js) 用 `@supabase/ssr` 的 `createBrowserClient`，把登入資訊存在 `.fdfz.click` 的 cookie，而不是各網域自己的 localStorage。
- [`src/fdfz.js`](src/fdfz.js) 放 cookie 設定、`next` 白名單和 `accountUrl()`。**各站放一份一模一樣的 `fdfz.js` 和 `supabase.js`**，改了要一起改。
- 簡繁設定存在 `fdfz-lang` cookie，各站共用。
- 切回分頁時會重新讀一次登入狀態，在別站登出或換帳號後畫面會跟著更新。
- 剛跳回別站 10 秒內又被送回登入頁，就不再自動跳（避免某站讀不到登入狀態時來回打轉），改顯示「回到…」按鈕。

### 其他站要怎麼接

1. 複製本倉庫的 `src/fdfz.js` 和 `src/supabase.js`，`npm install @supabase/ssr`。
2. 沒登入時 `location.href = accountUrl('/login')`；沒通過審核或要改密碼時 `accountUrl('/pending')`、`accountUrl('/')`。
3. 「帳號設定」連結用 `accountUrl('/')`，帳號頁會出現「回到原站」按鈕。
4. `auth.js` 加上切回分頁時重新讀 session（照本倉庫 `src/auth.js` 的 `recheck`）。

## 在自己電腦上執行

```bash
npm install
cp .env.example .env   # 填上 Supabase 的網址和 publishable key
npm run dev
```

本機（localhost）登入資訊只存在本機，不會和正式站共用；跨站共用要在真的 fdfz.click 子網域上測。

## 部署

Supabase 的網址和 publishable key 已經寫在 [`.env.production`](.env.production)（和權益牆一樣）。

1. Cloudflare 控制台 → Workers & Pages → 建立 → 連接 GitHub，選這個倉庫。Build command `npm run build`，Deploy command `npx wrangler deploy`，Worker 名稱 `fdfz-account`（要和 [`wrangler.jsonc`](wrangler.jsonc) 一致）。
2. Worker → Settings → Domains & Routes → 加 Custom domain `account.fdfz.click`。
3. Supabase → Authentication → URL Configuration：Site URL 改成 `https://account.fdfz.click`，Redirect URLs 加 `https://account.fdfz.click/**`。

之後每次推到 `main` 都會自動重新部署。
