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
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    primaryColor: "#1a73e8",
    primaryColorHover: "#1558b0",
    primaryColorPressed: "#174ea6",
    primaryColorSuppl: "#1a73e8",
    infoColor: "#1a73e8",
    infoColorHover: "#1558b0",
    successColor: "#188038",
    warningColor: "#f9ab00",
    errorColor: "#d93025",
  },
  Button: {
    borderRadiusSmall: "4px",
    borderRadiusMedium: "6px",
    borderRadiusLarge: "8px",
  },
  Card: {
    borderRadius: "8px",
    paddingMedium: "18px",
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

const darkThemeOverrides = {
  common: {
    bodyColor: "#202124",
    cardColor: "#2b2c2f",
    modalColor: "#2b2c2f",
    popoverColor: "#2b2c2f",
    borderColor: "#3c4043",
    dividerColor: "#3c4043",
  },
}

const lightThemeOverrides = {
  common: {
    bodyColor: "#f6f8fc",
    cardColor: "#ffffff",
    modalColor: "#ffffff",
    popoverColor: "#ffffff",
    borderColor: "#dadce0",
    dividerColor: "#e8eaed",
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
    <n-spin :show="loading">
      <template #icon>
        <div class="gmail-loader" aria-label="loading">
          <span class="gmail-loader__bar gmail-loader__bar--blue"></span>
          <span class="gmail-loader__bar gmail-loader__bar--red"></span>
          <span class="gmail-loader__bar gmail-loader__bar--yellow"></span>
          <span class="gmail-loader__bar gmail-loader__bar--green"></span>
        </div>
      </template>
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
  color: #202124;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}
</style>

<style scoped>
.side {
  height: 100vh;
}

.main {
  min-height: 100vh;
  text-align: left;
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

.gmail-loader {
  display: grid;
  grid-template-columns: repeat(4, 9px);
  gap: 3px;
  align-items: end;
  height: 30px;
}

.gmail-loader__bar {
  width: 9px;
  height: 10px;
  border-radius: 999px;
  animation: gmail-loader-bounce 0.92s ease-in-out infinite;
}

.gmail-loader__bar--blue {
  background: #4285f4;
}

.gmail-loader__bar--red {
  background: #ea4335;
  animation-delay: 0.1s;
}

.gmail-loader__bar--yellow {
  background: #fbbc04;
  animation-delay: 0.2s;
}

.gmail-loader__bar--green {
  background: #34a853;
  animation-delay: 0.3s;
}

@keyframes gmail-loader-bounce {
  0%, 100% {
    height: 10px;
    opacity: 0.55;
  }

  50% {
    height: 28px;
    opacity: 1;
  }
}
</style>
