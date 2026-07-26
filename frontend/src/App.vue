<script setup>
import {
  darkTheme,
} from 'naive-ui'
import { computed, onMounted, watchEffect } from 'vue'
import { useScript } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useGlobalState } from './store'
import { useIsMobile } from './utils/composables'
import Header from './views/Header.vue';
import SiteAccessGuard from './components/SiteAccessGuard.vue'
import { getNaiveLocaleConfig } from './i18n/naive-locale'
import { DEFAULT_LOCALE, isSupportedLocale } from './i18n/utils'

const {
  isDark, loading, useSideMargin, telegramApp, isTelegram, settings, userSettings
} = useGlobalState()
const adClient = import.meta.env.VITE_GOOGLE_AD_CLIENT;
const adSlot = import.meta.env.VITE_GOOGLE_AD_SLOT;
const { locale } = useI18n({ useScope: 'global' });
const route = useRoute()
const theme = computed(() => isDark.value ? darkTheme : null)
const themeOverrides = computed(() => ({
  common: {
    primaryColor: isDark.value ? '#c4c7c5' : '#5f6368',
    primaryColorHover: isDark.value ? '#e8eaed' : '#3c4043',
    primaryColorPressed: isDark.value ? '#9aa0a6' : '#202124',
    primaryColorSuppl: isDark.value ? '#c4c7c5' : '#5f6368',
    infoColor: isDark.value ? '#c4c7c5' : '#5f6368',
    infoColorHover: isDark.value ? '#e8eaed' : '#3c4043',
    infoColorPressed: isDark.value ? '#9aa0a6' : '#202124',
    infoColorSuppl: isDark.value ? '#c4c7c5' : '#5f6368',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: '"Segoe UI Variable", "SF Pro Text", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '7px',
  },
  Card: {
    borderRadius: '8px',
  },
}))
const localeConfig = computed(() => getNaiveLocaleConfig(isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE))
const isUserAuthView = computed(() => {
  const isUserRoute = route.path === '/user' || route.path.endsWith('/user')
  return isUserRoute && !isTelegram.value && !userSettings.value.user_email
})
const isHomeAuthView = computed(() => {
  return route.name === 'home'
    && !isTelegram.value
    && !settings.value.address
    && !userSettings.value.user_email
})
const isAuthView = computed(() => isUserAuthView.value || isHomeAuthView.value)
const isMobile = useIsMobile()
const showSideMargin = computed(() => !isAuthView.value && !isMobile.value && useSideMargin.value);
const showAd = computed(() => !isAuthView.value && !isMobile.value && adClient && adSlot);
const gridMaxCols = computed(() => showAd.value ? 8 : 12);
const isWorkspaceView = computed(() => {
  if (isAuthView.value) return false
  return !!settings.value.address
    || !!userSettings.value.user_email
    || route.path === '/admin'
    || route.path.endsWith('/admin')
})

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE
})

// Load Google Ad script at top level (not inside onMounted)
if (showAd.value) {
  useScript({
    src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`,
    async: true,
    crossorigin: "anonymous",
  })
}

onMounted(async () => {
  const token = import.meta.env.VITE_CF_WEB_ANALY_TOKEN;

  const exist = document.querySelector('script[src="https://static.cloudflareinsights.com/beacon.min.js"]') !== null
  if (token && !exist) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.dataset.cfBeacon = `{ token: ${token} }`;
    document.body.appendChild(script);
  }

  // check if google ad is enabled
  if (showAd.value) {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }


  // check if telegram is enabled
  const enableTelegram = import.meta.env.VITE_IS_TELEGRAM;
  if (
    (typeof enableTelegram === 'boolean' && enableTelegram === true)
    ||
    (typeof enableTelegram === 'string' && enableTelegram === 'true')
  ) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    telegramApp.value = window.Telegram?.WebApp || {};
    isTelegram.value = !!window.Telegram?.WebApp?.initData;
  }
});
</script>

<template>
  <n-config-provider :locale="localeConfig.locale" :date-locale="localeConfig.dateLocale" :theme="theme"
    :theme-overrides="themeOverrides">
    <n-global-style />
    <n-spin description="loading..." :show="loading">
      <n-notification-provider container-style="margin-top: 60px;">
        <n-message-provider container-style="margin-top: 20px;">
          <SiteAccessGuard />
          <n-grid class="app-grid" x-gap="12" :cols="gridMaxCols">
            <n-gi v-if="showSideMargin" span="1">
              <div class="side" v-if="showAd">
                <ins class="adsbygoogle" style="display:block" :data-ad-client="adClient" :data-ad-slot="adSlot"
                  data-ad-format="auto" data-full-width-responsive="true"></ins>
              </div>
            </n-gi>
            <n-gi :span="!showSideMargin ? gridMaxCols : (gridMaxCols - 2)">
              <div class="app-main" :class="{ 'app-main--auth': isAuthView }">
                <div class="app-layout">
                  <Header v-if="!isAuthView" />
                  <main class="app-shell" :class="{
                    'app-shell--auth': isAuthView,
                    'app-shell--workspace': isWorkspaceView,
                    'app-shell--welcome': !isAuthView && !isWorkspaceView,
                  }">
                    <router-view></router-view>
                  </main>
                </div>
              </div>
            </n-gi>
            <n-gi v-if="showSideMargin" span="1">
              <div class="side" v-if="showAd">
                <ins class="adsbygoogle" style="display:block" :data-ad-client="adClient" :data-ad-slot="adSlot"
                  data-ad-format="auto" data-full-width-responsive="true"></ins>
              </div>
            </n-gi>
          </n-grid>
          <n-back-top />
        </n-message-provider>
      </n-notification-provider>
    </n-spin>
  </n-config-provider>
</template>


<style>
.n-switch {
  margin-left: 10px;
  margin-right: 10px;
}

@media (hover: none) and (pointer: coarse) and (max-width: 1024px) {
  :where(input, textarea, select, [contenteditable="true"]) {
    font-size: 16px !important;
  }

  :where(.n-input, .n-input-number, .n-base-selection, .n-input-group-label) {
    --n-font-size: 16px !important;
  }
}
</style>

<style scoped>
.side {
  min-height: 100dvh;
}
</style>
