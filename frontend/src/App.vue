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
    primaryColor: "#0f6cbd",
    primaryColorHover: "#115ea3",
    primaryColorPressed: "#0f548c",
    primaryColorSuppl: "#2b88d8",
  },
  Button: {
    borderRadiusSmall: "4px",
    borderRadiusMedium: "6px",
    borderRadiusLarge: "8px",
    fontWeight: "500",
  },
  Card: {
    borderRadius: "8px",
    paddingMedium: "18px",
    paddingLarge: "22px",
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
    bodyColor: "#101820",
    cardColor: "#192638",
    modalColor: "#192638",
    popoverColor: "#192638",
    tableColor: "#192638",
    actionColor: "#132033",
    hoverColor: "rgba(71, 159, 245, 0.14)",
    borderColor: "rgba(145, 179, 210, 0.12)",
    dividerColor: "rgba(145, 179, 210, 0.08)",
    textColorBase: "#f3f7fb",
    textColor1: "#f3f7fb",
    textColor2: "#d6e0ea",
    textColor3: "#9fb0c1",
  },
  Card: {
    colorEmbedded: "#132033",
  },
  DataTable: {
    thColor: "#132033",
    tdColorHover: "rgba(71, 159, 245, 0.10)",
    borderColor: "transparent",
  },
  Divider: {
    color: "rgba(148, 163, 184, 0.10)",
  },
  Tabs: {
    paneBorderColor: "transparent",
    tabBorderColor: "transparent",
  },
}

const lightThemeOverrides = {
  common: {
    bodyColor: "#eef3f8",
    cardColor: "#ffffff",
    modalColor: "#ffffff",
    popoverColor: "#ffffff",
    tableColor: "#ffffff",
    actionColor: "#e7f0f8",
    hoverColor: "rgba(15, 108, 189, 0.08)",
    borderColor: "rgba(96, 126, 155, 0.12)",
    dividerColor: "rgba(96, 126, 155, 0.08)",
    textColorBase: "#1f2937",
    textColor1: "#1f2937",
    textColor2: "#4b5563",
    textColor3: "#64748b",
  },
  Card: {
    colorEmbedded: "#ffffff",
  },
  DataTable: {
    thColor: "#f3f7fb",
    tdColorHover: "#f6faff",
    borderColor: "transparent",
  },
  Divider: {
    color: "rgba(148, 163, 184, 0.12)",
  },
  Tabs: {
    paneBorderColor: "transparent",
    tabBorderColor: "transparent",
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
          <n-grid x-gap="12" :cols="gridMaxCols">
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
html {
  min-height: 100%;
  background: var(--n-color-body, #eef3f8);
}

html[data-theme="dark"] .n-card {
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.22);
}

html[data-theme="dark"] .n-card.n-card--embedded {
  background: #132033;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
}

html[data-theme="dark"] .n-data-table {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}

html[data-theme="dark"] body {
  background:
    linear-gradient(180deg, rgba(11, 79, 138, 0.24) 0, rgba(16, 24, 32, 0) 240px),
    var(--n-color-body, #101820);
}

html[data-theme="dark"] .n-tabs .n-tabs-tab.n-tabs-tab--active {
  background: rgba(71, 159, 245, 0.12);
}

html[data-theme="dark"] .n-data-table .n-data-table-tr:nth-child(even) .n-data-table-td {
  background: rgba(71, 159, 245, 0.035);
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
  background:
    linear-gradient(180deg, rgba(209, 224, 239, 0.64) 0, rgba(238, 243, 248, 0) 220px),
    var(--n-color-body, #eef3f8);
  color: var(--n-text-color-base, #111827);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

.n-card {
  border-color: transparent !important;
  box-shadow: 0 16px 38px rgba(31, 57, 82, 0.08);
}

.n-card.n-card--embedded {
  background: #f8fbfe;
  box-shadow: 0 10px 24px rgba(31, 57, 82, 0.045);
}

.n-data-table,
.n-list {
  border-radius: 8px;
  overflow: hidden;
}

.n-data-table {
  box-shadow: 0 10px 28px rgba(31, 57, 82, 0.045);
}

.n-data-table .n-data-table-th,
.n-data-table .n-data-table-td {
  border-color: transparent !important;
}

.n-data-table .n-data-table-tr:nth-child(even) .n-data-table-td {
  background: rgba(15, 108, 189, 0.025);
}

.n-tabs .n-tabs-pane-wrapper,
.n-tabs .n-tabs-tab,
.n-tabs .n-tabs-nav::before,
.n-tabs .n-tabs-nav-scroll-content::after {
  border-color: transparent !important;
}

.n-tabs .n-tabs-tab {
  border-radius: 6px;
}

.n-tabs .n-tabs-tab.n-tabs-tab--active {
  background: rgba(15, 108, 189, 0.08);
}

.n-button {
  letter-spacing: 0;
}

.n-alert,
.n-drawer-content,
.n-modal {
  border-color: transparent !important;
}
</style>

<style scoped>
.side {
  height: 100vh;
  padding-top: 14px;
}

.main {
  min-height: 100vh;
  padding: 0 14px 24px;
  text-align: center;
}

.app-layout {
  min-height: 80vh;
  background: transparent;
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
  .main {
    padding: 0 8px 20px;
  }
}
</style>
