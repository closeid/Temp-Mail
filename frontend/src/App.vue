<script setup>
import {
  darkTheme,
} from 'naive-ui'
import { computed, onMounted, watchEffect } from 'vue'
import { useScript } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { useGlobalState } from './store'
import { useIsMobile } from './utils/composables'
import Header from './views/Header.vue';
import Footer from './views/Footer.vue';
import { api } from './api'
import { getNaiveLocaleConfig } from './i18n/naive-locale'
import { DEFAULT_LOCALE, isSupportedLocale } from './i18n/utils'

const {
  isDark, loading, useSideMargin, telegramApp, isTelegram
} = useGlobalState()
const adClient = import.meta.env.VITE_GOOGLE_AD_CLIENT;
const adSlot = import.meta.env.VITE_GOOGLE_AD_SLOT;
const { locale } = useI18n({ useScope: 'global' });
const theme = computed(() => isDark.value ? darkTheme : null)
const sharedThemeOverrides = {
  common: {
    borderRadius: '7px',
    borderRadiusSmall: '5px',
    fontFamily: '"Segoe UI Variable", "SF Pro Text", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    fontSize: '14px',
    primaryColor: '#1677a8',
    primaryColorHover: '#11678f',
    primaryColorPressed: '#0d5678',
    primaryColorSuppl: '#1677a8',
    infoColor: '#1677a8',
    successColor: '#24835b',
    warningColor: '#a76818',
    errorColor: '#c43d4b',
  },
  Button: {
    borderRadiusSmall: '5px',
    borderRadiusMedium: '7px',
    borderRadiusLarge: '7px',
    fontWeight: '600',
  },
  Card: {
    borderRadius: '8px',
    paddingMedium: '18px',
  },
  Input: {
    borderRadius: '7px',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '7px',
      },
    },
  },
  Tag: {
    borderRadius: '5px',
  },
  Tabs: {
    tabFontSizeMedium: '13px',
  },
}

const themeOverrides = computed(() => ({
  ...sharedThemeOverrides,
  common: {
    ...sharedThemeOverrides.common,
    bodyColor: isDark.value ? '#181a1d' : '#f3f5f7',
    cardColor: isDark.value ? '#222529' : '#fdfdfd',
    modalColor: isDark.value ? '#222529' : '#fdfdfd',
    popoverColor: isDark.value ? '#26292e' : '#fdfdfd',
    tableColor: isDark.value ? '#222529' : '#fdfdfd',
    borderColor: isDark.value ? '#373b41' : '#dfe3e8',
    dividerColor: isDark.value ? '#30343a' : '#e7eaee',
  },
}))
const localeConfig = computed(() => getNaiveLocaleConfig(isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE))
const isMobile = useIsMobile()
const showSideMargin = computed(() => !isMobile.value && useSideMargin.value);
const showAd = computed(() => !isMobile.value && adClient && adSlot);
const gridMaxCols = computed(() => showAd.value ? 8 : 12);

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
  try {
    await api.getUserSettings();
  } catch (error) {
    console.error(error);
  }

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
          <n-grid class="app-grid" x-gap="12" :cols="gridMaxCols">
            <n-gi v-if="showSideMargin" span="1">
              <div class="side" v-if="showAd">
                <ins class="adsbygoogle" style="display:block" :data-ad-client="adClient" :data-ad-slot="adSlot"
                  data-ad-format="auto" data-full-width-responsive="true"></ins>
              </div>
            </n-gi>
            <n-gi :span="!showSideMargin ? gridMaxCols : (gridMaxCols - 2)">
              <div class="app-main">
                <n-space class="app-stack" vertical>
                  <n-layout class="app-layout">
                    <Header />
                    <router-view></router-view>
                  </n-layout>
                  <Footer />
                </n-space>
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
  margin-left: 4px;
  margin-right: 4px;
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

.app-main {
  min-height: 100dvh;
  text-align: left;
}

.n-grid {
  height: 100%;
}

.n-gi {
  height: 100%;
}

.app-stack {
  height: 100%;
}
</style>
