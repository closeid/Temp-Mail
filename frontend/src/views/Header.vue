<script setup>
import { ref, h, computed } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import { useIsMobile } from '../utils/composables'
import {
    DarkModeFilled, LightModeFilled, MenuFilled,
    AdminPanelSettingsFilled, MonitorHeartFilled,
    KeyboardArrowDownOutlined
} from '@vicons/material'
import { Language, User, Home } from '@vicons/fa'

import { useGlobalState } from '../store'
import { getRouterPathWithLang } from '../utils'
import { DEFAULT_LOCALE, isSupportedLocale, replaceLocaleInFullPath } from '../i18n/utils'
import { getLocaleLabel, SUPPORTED_LOCALES } from '../i18n/locale-registry'
import { NButton, NIcon } from 'naive-ui'

const APP_NAME = 'Get an Email'

const message = useMessage()

const {
    toggleDark, isDark, isTelegram, showAdminPage,
    loading, openSettings, preferredLocale
} = useGlobalState()
const route = useRoute()
const router = useRouter()
const isMobile = useIsMobile()

const showMobileMenu = ref(false)
const menuValue = computed(() => {
    if (route.path.includes("user")) return "user";
    if (route.path.includes("admin")) return "admin";
    return "home";
});

const languageOptions = SUPPORTED_LOCALES.map((locale) => ({
    label: getLocaleLabel(locale),
    value: locale,
    key: locale,
}))

const currentLocaleLabel = computed(() => {
    return languageOptions.find(opt => opt.value === locale.value)?.label || locale.value;
});

const { t, locale } = useScopedI18n('views.Header')

const changeLocale = async (lang) => {
    if (!isSupportedLocale(lang)) {
        return;
    }

    const currentFullPath = route.fullPath;
    const targetFullPath = replaceLocaleInFullPath(currentFullPath, lang);

    if (lang === locale.value && targetFullPath === currentFullPath) {
        showMobileMenu.value = false;
        return;
    }

    if (lang === DEFAULT_LOCALE) {
        preferredLocale.value = DEFAULT_LOCALE;
    }

    let localeSwitched = false;
    try {
        await router.push({ path: targetFullPath, force: true });
        localeSwitched = router.currentRoute.value.fullPath === targetFullPath;
        if (!localeSwitched) {
            await router.replace({ path: targetFullPath, force: true });
            localeSwitched = router.currentRoute.value.fullPath === targetFullPath;
        }
    } catch (error) {
        console.error('Failed to switch locale', error);
    } finally {
        showMobileMenu.value = false;
    }

    if (localeSwitched) preferredLocale.value = lang;
}

const menuOptions = computed(() => [
    {
        label: () => h(NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "home" ? "primary" : "default",
                style: "width: 100%",
                onClick: async () => {
                    await router.push(getRouterPathWithLang('/', locale.value));
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => t('home'),
                icon: () => h(NIcon, { component: Home })
            }),
        key: "home"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "user" ? "primary" : "default",
                style: "width: 100%",
                onClick: async () => {
                    await router.push(getRouterPathWithLang("/user", locale.value));
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => t('user'),
                icon: () => h(NIcon, { component: User }),
            }
        ),
        key: "user",
        show: !isTelegram.value
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                type: menuValue.value == "admin" ? "primary" : "default",
                style: "width: 100%",
                onClick: async () => {
                    loading.value = true;
                    await router.push(getRouterPathWithLang('/admin', locale.value));
                    loading.value = false;
                    showMobileMenu.value = false;
                }
            },
            {
                default: () => "Admin",
                icon: () => h(NIcon, { component: AdminPanelSettingsFilled }),
            }
        ),
        show: showAdminPage.value,
        key: "admin"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                style: "width: 100%",
                onClick: () => { toggleDark(); showMobileMenu.value = false; }
            },
            {
                default: () => isDark.value ? t('light') : t('dark'),
                icon: () => h(
                    NIcon, { component: isDark.value ? LightModeFilled : DarkModeFilled }
                )
            }
        ),
        key: "theme"
    },
    {
        label: () => h(
            NButton,
            {
                text: true,
                size: "small",
                style: "width: 100%",
                tag: "a",
                target: "_blank",
                href: openSettings.value?.statusUrl,
            },
            {
                default: () => t('status'),
                icon: () => h(NIcon, { component: MonitorHeartFilled })
            }
        ),
        show: !!openSettings.value?.statusUrl,
        key: "status"
    }
]);

useHead({
    title: APP_NAME,
    meta: [
        { name: "description", content: () => openSettings.value.description || APP_NAME },
    ]
});

const logoClickCount = ref(0);
const logoClick = async () => {
    if (route.path.includes("admin")) {
        logoClickCount.value = 0;
        return;
    }
    if (logoClickCount.value >= 5) {
        logoClickCount.value = 0;
        message.info("Change to admin Page");
        loading.value = true;
        await router.push(getRouterPathWithLang('/admin', locale.value));
        loading.value = false;
    } else {
        logoClickCount.value++;
    }
    if (logoClickCount.value > 0) {
        message.info(`Click ${5 - logoClickCount.value + 1} times to enter the admin page`);
    }
}

</script>

<template>
    <header class="app-header">
        <n-page-header class="app-header__inner">
            <template #avatar>
                <div class="app-brand__mark" @click="logoClick">
                    <n-avatar class="app-brand__avatar" src="/logo.png" />
                </div>
            </template>
            <template #extra>
                <n-space align="center" class="header-extra">
                    <n-menu v-if="!isMobile" class="app-primary-nav" mode="horizontal" :options="menuOptions" responsive />
                    <n-button v-else class="app-menu-button" :text="true" @click="showMobileMenu = !showMobileMenu">
                        <template #icon>
                            <n-icon :component="MenuFilled" />
                        </template>
                        {{ t('menu') }}
                    </n-button>
                    <n-dropdown v-if="!isMobile" :options="languageOptions" @select="changeLocale" trigger="click" class="header-locale-dropdown">
                        <n-button text size="small" class="header-locale-button" style="padding: 0 10px;">
                            <template #icon>
                                <n-icon :component="Language" />
                            </template>
                            {{ currentLocaleLabel }}
                            <n-icon :component="KeyboardArrowDownOutlined" style="margin-left: 4px;" />
                        </n-button>
                    </n-dropdown>
                </n-space>
            </template>
        </n-page-header>
        <n-drawer v-model:show="showMobileMenu" placement="top" style="height: 100vh;">
            <n-drawer-content :title="t('menu')" closable>
                <n-menu :options="menuOptions" />
                <div class="mobile-menu-actions">
                    <n-dropdown :options="languageOptions" @select="changeLocale" trigger="click" class="header-locale-dropdown">
                        <button type="button" class="mobile-menu-utility-button">
                            <n-icon :component="Language" />
                            <span class="mobile-menu-action-label">{{ currentLocaleLabel }}</span>
                            <n-icon :component="KeyboardArrowDownOutlined" class="mobile-menu-action-arrow" />
                        </button>
                    </n-dropdown>
                </div>
            </n-drawer-content>
        </n-drawer>
    </header>
</template>

<style scoped>
.n-layout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.header-extra {
    align-items: center;
    flex-wrap: nowrap;
}

.header-extra :deep(.n-space-item) {
    display: flex;
    align-items: center;
}

.header-locale-button {
    display: inline-flex;
    align-items: center;
}

.header-locale-button :deep(.n-button__content) {
    display: inline-flex;
    align-items: center;
}

.header-locale-button :deep(.n-icon) {
    display: inline-flex;
    align-items: center;
}

.mobile-menu-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(128, 128, 128, 0.16);
}

.mobile-menu-utility-button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    width: 100%;
    min-width: 0;
    padding: 0 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: none;
    opacity: 0.82;
    cursor: pointer;
}

.mobile-menu-action-label {
    margin: 0 6px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mobile-menu-action-arrow {
    flex: 0 0 auto;
    margin-left: 2px;
}

.n-alert {
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
}

.n-card {
    margin-top: 10px;
}

.center {
    display: flex;
    text-align: left;
    place-items: center;
    justify-content: center;
    margin: 20px;
}

.n-form .n-button {
    margin-top: 10px;
}

@media (max-width: 640px) {
    :deep(.n-page-header) {
        padding: 10px;
    }
}
</style>
