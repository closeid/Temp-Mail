<script setup>
import {
  darkTheme,
} from "naive-ui"
import { computed, onMounted, watchEffect } from "vue"
import { useScript } from "@unhead/vue"
import { useI18n } from "vue-i18n"
import { useGlobalState } from "./store"
import { useIsMobile } from "./utils/composables"
import Header from "./views/Header.vue";
import Footer from "./views/Footer.vue";
import { api } from "./api"
import { getNaiveLocaleConfig } from "./i18n/naive-locale"
import { DEFAULT_LOCALE, isSupportedLocale } from "./i18n/utils"

const {
  isDark, loading, useSideMargin, telegramApp, isTelegram
} = useGlobalState()
const adClient = import.meta.env.VITE_GOOGLE_AD_CLIENT;
const adSlot = import.meta.env.VITE_GOOGLE_AD_SLOT;
const { locale } = useI18n({ useScope: "global" });

const themeOverrides = {
  common: {
    borderRadius: "6px",
    borderRadiusSmall: "4px",
    fontSize: "14px",
    lineHeight: "1.55",
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    fontWeightStrong: "600",
    primaryColor: "#374151",
    primaryColorHover: "#1f2937",
    primaryColorPressed: "#111827",
    primaryColorSuppl: "#6b7280",
  },
  Button: {
    borderRadiusSmall: "4px",
    borderRadiusMedium: "6px",
    borderRadiusLarge: "8px",
    fontWeight: "500",
  },
  Card: {
    borderRadius: "8px",
    paddingMedium: "28px",
    paddingLarge: "34px",
  },
  Input: {
    borderRadius: "6px",
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: "6px",
      },
    },
  },
  Tag: {
    borderRadius: "4px",
  },
  Tabs: {
    tabFontSizeMedium: "14px",
    tabGapMediumCard: "2px",
  },
  Menu: {
    itemBorderRadius: "6px",
  },
  DataTable: {
    thFontWeight: "600",
  },
}

const darkThemeOverrides = {
  common: {
    bodyColor: "#0f1117",
    cardColor: "#171a23",
    modalColor: "#171a23",
    popoverColor: "#171a23",
    tableColor: "#171a23",
    actionColor: "#202431",
    hoverColor: "rgba(148, 163, 184, 0.12)",
    borderColor: "#2a3040",
    dividerColor: "#2a3040",
    textColorBase: "#f3f4f6",
    textColor1: "#f3f4f6",
    textColor2: "#d1d5db",
    textColor3: "#9ca3af",
  },
  Card: {
    colorEmbedded: "#151922",
  },
  DataTable: {
    thColor: "#151922",
    tdColorHover: "rgba(148, 163, 184, 0.10)",
    borderColor: "#2a3040",
  },
  Divider: {
    color: "#2a3040",
  },
  Tabs: {
    paneBorderColor: "#2a3040",
    tabBorderColor: "#2a3040",
  },
}

const lightThemeOverrides = {
  common: {
    bodyColor: "#ffffff",
    cardColor: "#ffffff",
    modalColor: "#ffffff",
    popoverColor: "#ffffff",
    tableColor: "#ffffff",
    actionColor: "#fafafa",
    hoverColor: "rgba(17, 24, 39, 0.035)",
    borderColor: "#e5e7eb",
    dividerColor: "#e5e7eb",
    textColorBase: "#111827",
    textColor1: "#111827",
    textColor2: "#4b5563",
    textColor3: "#6b7280",
  },
  Card: {
    colorEmbedded: "#ffffff",
  },
  DataTable: {
    thColor: "#ffffff",
    tdColorHover: "#fafafa",
    borderColor: "#e5e7eb",
  },
  Divider: {
    color: "#e5e7eb",
  },
  Tabs: {
    paneBorderColor: "#e5e7eb",
    tabBorderColor: "#e5e7eb",
  },
}

const theme = computed(() => {
  if (!isDark.value) return null
  return darkTheme
})
const themeConfig = computed(() => {
  const modeOverrides = isDark.value ? darkThemeOverrides : lightThemeOverrides
  return {
    ...themeOverrides,
    ...modeOverrides,
    common: {
      ...themeOverrides.common,
      ...modeOverrides.common,
    },
    Card: {
      ...themeOverrides.Card,
      ...modeOverrides.Card,
    },
    DataTable: {
      ...themeOverrides.DataTable,
      ...modeOverrides.DataTable,
    },
    Divider: {
      ...modeOverrides.Divider,
    },
    Tabs: {
      ...themeOverrides.Tabs,
      ...modeOverrides.Tabs,
    },
  }
})

const localeConfig = computed(() => getNaiveLocaleConfig(isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE))
const isMobile = useIsMobile()
const showSideMargin = computed(() => !isMobile.value && useSideMargin.value);
const showAd = computed(() => !isMobile.value && adClient && adSlot);
const gridMaxCols = computed(() => showAd.value ? 8 : 12);

watchEffect(() => {
  if (typeof document === "undefined") return
  document.documentElement.lang = isSupportedLocale(locale.value) ? locale.value : DEFAULT_LOCALE
  document.documentElement.dataset.theme = isDark.value ? "dark" : "light"
})

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

  const exist = document.querySelector("script[src=\"https://static.cloudflareinsights.com/beacon.min.js\"]") !== null
  if (token && !exist) {
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.dataset.cfBeacon = `{ token: ${token} }`;
    document.body.appendChild(script);
  }

  if (showAd.value) {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }

  const enableTelegram = import.meta.env.VITE_IS_TELEGRAM;
  if (
    (typeof enableTelegram === "boolean" && enableTelegram === true)
    ||
    (typeof enableTelegram === "string" && enableTelegram === "true")
  ) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-web-app.js";
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
  <n-config-provider :locale="localeConfig.locale" :date-locale="localeConfig.dateLocale" :theme="theme" :theme-overrides="themeConfig">
    <n-global-style />
    <n-spin description="loading..." :show="loading">
      <n-notification-provider container-style="margin-top: 60px;">
        <n-message-provider container-style="margin-top: 20px;">
          <n-grid :x-gap="0" :cols="gridMaxCols">
            <n-gi v-if="showSideMargin" span="1">
              <div class="side" v-if="showAd">
                <ins class="adsbygoogle" style="display:block" :data-ad-client="adClient" :data-ad-slot="adSlot"
                  data-ad-format="auto" data-full-width-responsive="true"></ins>
              </div>
            </n-gi>
            <n-gi :span="!showSideMargin ? gridMaxCols : (gridMaxCols - 2)">
              <div class="main">
                <n-space vertical class="app-shell">
                  <n-layout class="app-layout">
                    <Header />
                    <main class="app-content">
                      <router-view></router-view>
                    </main>
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
html {
  min-height: 100%;
  background: var(--n-color-body, #ffffff);
}

html[data-theme="dark"] .n-card {
  box-shadow: none;
}

html[data-theme="dark"] .n-card.n-card--embedded {
  background: #151922;
  box-shadow: none;
}

html[data-theme="dark"] .n-data-table {
  box-shadow: none;
}

html[data-theme="dark"] .n-data-table .n-data-table-tr:nth-child(even) .n-data-table-td {
  background: transparent;
}

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

body {
  margin: 0;
  min-height: 100%;
  background: var(--n-color-body, #ffffff);
  color: var(--n-text-color-base, #111827);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

.n-card {
  border-color: var(--n-border-color, #e5e7eb) !important;
  box-shadow: none;
}

.n-card > .n-card-header {
  padding-bottom: 14px;
}

.n-card.n-card--embedded {
  background: var(--n-color-embedded, #ffffff);
  box-shadow: none;
}

.n-data-table,
.n-list {
  border: 1px solid var(--n-border-color, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
}

.n-data-table {
  box-shadow: none;
}

.n-data-table .n-data-table-th,
.n-data-table .n-data-table-td {
  border-color: var(--n-merged-border-color, #e5e7eb) !important;
}

.n-data-table .n-data-table-tr:nth-child(even) .n-data-table-td {
  background: transparent;
}

.n-tabs .n-tabs-pane-wrapper {
  border-color: var(--n-pane-border-color, #e5e7eb) !important;
}

.n-tabs .n-tabs-tab,
.n-tabs .n-tabs-nav::before,
.n-tabs .n-tabs-nav-scroll-content::after {
  border-color: var(--n-tab-border-color, #e5e7eb) !important;
}

.n-tabs .n-tabs-tab {
  border-radius: 6px;
}

.n-tabs .n-tabs-tab.n-tabs-tab--active {
  background: var(--n-color, #ffffff);
}

.n-button {
  letter-spacing: 0;
}

.n-alert,
.n-drawer-content,
.n-modal {
  border-color: var(--n-border-color, #e5e7eb) !important;
}
</style>

<style scoped>
.side {
  height: 100vh;
  padding-top: 0;
}

.main {
  width: 100%;
  min-height: 100vh;
  padding: 0;
  text-align: center;
}

.app-layout {
  min-height: 80vh;
  background: transparent;
}

.app-content {
  width: min(100%, 1120px);
  margin: 0 auto;
  padding: 88px 48px 96px;
  box-sizing: border-box;
}

.n-grid {
  height: 100%;
}

.n-gi {
  height: 100%;
}

.app-shell {
  height: 100%;
}

@media (max-width: 640px) {
  .app-content {
    padding: 48px 18px 64px;
  }
}
</style>
