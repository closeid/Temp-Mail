<script setup>
import {
  darkTheme,
} from "naive-ui"
import type { GlobalThemeOverrides } from "naive-ui"
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

const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    primaryColor: "#3b82f6",
    primaryColorHover: "#2563eb",
    primaryColorPressed: "#1d4ed8",
    primaryColorSuppl: "#3b82f6",
  },
  Button: {
    borderRadiusSmall: "4px",
    borderRadiusMedium: "6px",
    borderRadiusLarge: "8px",
  },
  Card: {
    borderRadius: "8px",
    paddingMedium: "20px",
  },
  Input: {
    borderRadius: "6px",
  },
  Tag: {
    borderRadius: "4px",
  },
  Tabs: {
    tabFontSizeMedium: "14px",
  },
}

const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    bodyColor: "#0a0a0f",
    cardColor: "#14141a",
    modalColor: "#14141a",
    popoverColor: "#14141a",
    borderColor: "#2a2a35",
    dividerColor: "#2a2a35",
  },
}

const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    bodyColor: "#fafafa",
    cardColor: "#ffffff",
    modalColor: "#ffffff",
    popoverColor: "#ffffff",
    borderColor: "#e5e7eb",
    dividerColor: "#e5e7eb",
  },
}

const theme = computed(() => {
  if (!isDark.value) return null
  return darkTheme
})
const themeConfig = computed(() => ({
  ...themeOverrides,
  ...(isDark.value ? darkThemeOverrides : lightThemeOverrides),
}))

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
                <n-space vertical>
                  <n-layout style="min-height: 80vh;">
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
  background: var(--n-color-body, #fafafa);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

<style scoped>
.side {
  height: 100vh;
}

.main {
  min-height: 100vh;
  text-align: center;
}

.n-grid {
  height: 100%;
}

.n-gi {
  height: 100%;
}

.n-space {
  height: 100%;
}
</style>