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
    primaryColor: "#2563eb",
    primaryColorHover: "#1d4ed8",
    primaryColorPressed: "#1e40af",
    primaryColorSuppl: "#3b82f6",
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
    bodyColor: "#0c0f14",
    cardColor: "#151922",
    modalColor: "#151922",
    popoverColor: "#151922",
    tableColor: "#151922",
    actionColor: "#1d2430",
    hoverColor: "rgba(148, 163, 184, 0.12)",
    borderColor: "#2a3340",
    dividerColor: "#2a3340",
    textColorBase: "#eef2f7",
    textColor1: "#eef2f7",
    textColor2: "#cbd5e1",
    textColor3: "#94a3b8",
  },
  Card: {
    colorEmbedded: "#11151d",
  },
  DataTable: {
    thColor: "#11151d",
    tdColorHover: "rgba(148, 163, 184, 0.10)",
  },
}

const lightThemeOverrides = {
  common: {
    bodyColor: "#f6f7fb",
    cardColor: "#ffffff",
    modalColor: "#ffffff",
    popoverColor: "#ffffff",
    tableColor: "#ffffff",
    actionColor: "#f1f5f9",
    hoverColor: "rgba(37, 99, 235, 0.07)",
    borderColor: "#e4e8f0",
    dividerColor: "#e4e8f0",
    textColorBase: "#111827",
    textColor1: "#111827",
    textColor2: "#475569",
    textColor3: "#64748b",
  },
  Card: {
    colorEmbedded: "#ffffff",
  },
  DataTable: {
    thColor: "#f8fafc",
    tdColorHover: "#f8fafc",
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
  background: var(--n-color-body, #f6f7fb);
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
  background: var(--n-color-body, #f6f7fb);
  color: var(--n-text-color-base, #111827);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}

.n-card {
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
}

.n-card.n-card--embedded {
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
}

.n-data-table,
.n-list {
  border-radius: 8px;
}

.n-button {
  letter-spacing: 0;
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
