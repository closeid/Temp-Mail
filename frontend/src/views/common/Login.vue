<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useRouter } from 'vue-router'
import { NewLabelOutlined, EmailOutlined } from '@vicons/material'

import Turnstile from '../../components/Turnstile.vue'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import { getRouterPathWithLang, hashPassword } from '../../utils'

const props = defineProps({
    loginOnly: {
        type: Boolean,
        default: false,
    },
    preferCredential: {
        type: Boolean,
        default: false,
    },
    bindAfterLogin: {
        type: Boolean,
        default: true,
    },
    bindUserAddress: {
        type: Function,
        default: async () => { await api.bindUserAddress(); },
        required: false
    },
    newAddressPath: {
        type: Function,
        default: async (address_name, domain, cf_token, enableRandomSubdomain) => {
            return await api.fetch("/api/new_address", {
                method: "POST",
                body: JSON.stringify({
                    name: address_name,
                    domain: domain,
                    cf_token: cf_token,
                    enableRandomSubdomain: enableRandomSubdomain,
                }),
            });
        },
        required: false
    },
})
const emit = defineEmits(['authenticated'])

const message = useMessage()
const notification = useNotification()
const router = useRouter()

const {
    jwt, loading, openSettings,
    showAddressCredential, userSettings, addressPassword
} = useGlobalState()

const tabValue = ref('signin')
const credential = ref('')
const emailName = ref("")
const emailDomain = ref("")
const cfToken = ref("")
const enableRandomSubdomain = ref(false)
const loginCfToken = ref("")
const loginTurnstileRef = ref(null)
const loginMethod = ref('credential') // 'credential' or 'password'
const loginAddress = ref('')
const loginPassword = ref('')

// 根据 openSettings 初始化登录方式
const initLoginMethod = () => {
    if (props.preferCredential || !openSettings.value?.enableAddressPassword) {
        loginMethod.value = 'credential';
    } else {
        loginMethod.value = 'password';
    }
}

const login = async () => {
    if (loginMethod.value === 'password') {
        // Password login
        if (!loginAddress.value || !loginPassword.value) {
            message.error(t('emailPasswordRequired'));
            return;
        }
        try {
            const res = await api.fetch('/api/address_login', {
                method: 'POST',
                body: JSON.stringify({
                    email: loginAddress.value,
                    password: await hashPassword(loginPassword.value),
                    cf_token: loginCfToken.value
                })
            });
            jwt.value = res.jwt;
            await api.getSettings();
            if (props.bindAfterLogin) {
                try {
                    await props.bindUserAddress();
                } catch (error) {
                    message.error(`${t('bindUserAddressError')}: ${error.message}`);
                }
            }
            emit('authenticated')
            await router.push(getRouterPathWithLang("/", locale.value));
        } catch (error) {
            message.error(error.message || "error");
            loginTurnstileRef.value?.refresh?.();
        }
        return;
    }
    if (!credential.value) {
        message.error(t('credentialInput'));
        return;
    }
    try {
        await api.fetch('/open_api/credential_login', {
            method: 'POST',
            body: JSON.stringify({
                credential: credential.value,
                cf_token: loginCfToken.value
            })
        });
        jwt.value = credential.value;
        await api.getSettings();
        if (props.bindAfterLogin) {
            try {
                await props.bindUserAddress();
            } catch (error) {
                message.error(`${t('bindUserAddressError')}: ${error.message}`);
            }
        }
        emit('authenticated')
        await router.push(getRouterPathWithLang("/", locale.value));
    } catch (error) {
        message.error(error.message || "error");
        loginTurnstileRef.value?.refresh?.();
    }
}

const { locale, t } = useScopedI18n('views.common.Login')

const loginAndBindTag = computed(() => {
    if (userSettings.value.user_email) {
        return t('loginAndBind')
    }
    return t('login')
})

const addressRegex = computed(() => {
    try {
        if (openSettings.value.addressRegex) {
            return new RegExp(openSettings.value.addressRegex, 'g');
        }
    } catch (error) {
        console.error(error);
        message.error(`Invalid addressRegex: ${openSettings.value.addressRegex}`);
    }
    return /[^a-z0-9]/g;
});

const generateNameLoading = ref(false);
const generateName = async () => {
    try {
        generateNameLoading.value = true;
        const { faker } = await import('https://esm.sh/@faker-js/faker');
        emailName.value = faker.internet.email()
            .split('@')[0]
            .replace(/\s+/g, '.')
            .replace(/\.{2,}/g, '.')
            .replace(addressRegex.value, '')
            .toLowerCase();
        // support maxAddressLen
        if (emailName.value.length > openSettings.value.maxAddressLen) {
            emailName.value = emailName.value.slice(0, openSettings.value.maxAddressLen);
        }
    } catch (error) {
        message.error(error.message || "error");
    } finally {
        generateNameLoading.value = false;
    }
};

const newEmail = async () => {
    try {
        // If custom names are disabled, send empty name to trigger backend auto-generation
        const nameToSend = openSettings.value.disableCustomAddressName ? "" : emailName.value;
        const res = await props.newAddressPath(
            nameToSend,
            emailDomain.value,
            cfToken.value,
            enableRandomSubdomain.value
        );
        jwt.value = res["jwt"];
        addressPassword.value = res["password"] || '';
        await api.getSettings();
        await router.push(getRouterPathWithLang("/", locale.value));
        showAddressCredential.value = true;
        try {
            await props.bindUserAddress();
        } catch (error) {
            message.error(`${t('bindUserAddressError')}: ${error.message}`);
        }
    } catch (error) {
        message.error(error.message || "error");
    }
};

const addressPrefix = computed(() => {
    // if user has role, return role prefix
    if (userSettings.value?.user_role) {
        return userSettings.value.user_role.prefix || "";
    }
    // if user has no role, return default prefix
    return openSettings.value.prefix;
});

const canUseRandomSubdomain = computed(() => {
    if (!emailDomain.value) {
        return false;
    }
    return (openSettings.value.randomSubdomainDomains || []).includes(emailDomain.value);
});

watch(canUseRandomSubdomain, (enabled) => {
    if (!enabled) {
        enableRandomSubdomain.value = false;
    }
});

const domainsOptions = computed(() => {
    // if user has role, return role domains
    if (userSettings.value.user_role) {
        const allDomains = userSettings.value.user_role.domains;
        if (!allDomains) return openSettings.value.domains;
        return openSettings.value.domains.filter((domain) => {
            return allDomains.includes(domain.value);
        });
    }
    // if user has no role, return default domains
    if (!openSettings.value.defaultDomains) {
        return openSettings.value.domains;
    }
    // if user has no role and no default domains, return all domains
    return openSettings.value.domains.filter((domain) => {
        return openSettings.value.defaultDomains.includes(domain.value);
    });
});

const canCreateNewAddress = computed(() => {
    return openSettings.value.enableUserCreateEmail
        && (!openSettings.value.disableAnonymousUserCreateEmail || userSettings.value.user_email);
});

onMounted(async () => {
    if (!openSettings.value.domains || openSettings.value.domains.length === 0) {
        await api.getOpenSettings(message, notification);
    }
    emailDomain.value = domainsOptions.value ? domainsOptions.value[0]?.value : "";
    initLoginMethod();
});
</script>

<template>
    <section class="auth-panel">
        <n-alert v-if="userSettings.user_email" :show-icon="false" :bordered="false" closable>
            <span>{{ t('bindUserInfo') }}</span>
        </n-alert>
        <n-tabs v-if="openSettings.fetched" class="auth-tabs" :class="{ 'auth-tabs--single': loginOnly }"
            v-model:value="tabValue" size="large"
            justify-content="space-evenly">
            <n-tab-pane name="signin" :tab="loginAndBindTag">
                <n-form>
                    <div v-if="loginMethod === 'password'">
                        <n-form-item-row :label="t('email')" required>
                            <n-input v-model:value="loginAddress" />
                        </n-form-item-row>
                        <n-form-item-row :label="t('password')" required>
                            <n-input v-model:value="loginPassword" type="password" show-password-on="click"
                                @keyup.enter="login" />
                        </n-form-item-row>
                    </div>

                    <div v-else>
                        <n-form-item-row :label="t('credential')" required>
                            <n-input v-model:value="credential" type="textarea" :autosize="{ minRows: 3 }" />
                        </n-form-item-row>
                    </div>

                    <Turnstile ref="loginTurnstileRef" v-if="openSettings.enableGlobalTurnstileCheck"
                        v-model:value="loginCfToken" />

                    <div class="switch-login-button">
                        <n-button v-if="openSettings?.enableAddressPassword"
                            @click="loginMethod === 'password' ? loginMethod = 'credential' : loginMethod = 'password'"
                            type="info" quaternary size="tiny">
                            {{ loginMethod === 'password' ? t('credentialLogin') : t('passwordLogin') }}
                        </n-button>
                    </div>

                    <n-button class="auth-submit" @click="login" :loading="loading" type="primary" block strong>
                        <template #icon>
                            <n-icon :component="EmailOutlined" />
                        </template>
                        {{ loginAndBindTag }}
                    </n-button>
                    <n-button v-if="!loginOnly" class="auth-register-button" @click="tabValue = 'register'" block
                        secondary strong>
                        <template #icon>
                            <n-icon :component="NewLabelOutlined" />
                        </template>
                        {{ t('getNewEmail') }}
                    </n-button>
                </n-form>
            </n-tab-pane>
            <n-tab-pane v-if="!loginOnly" name="register" :tab="t('getNewEmail')">
                <n-alert v-if="!canCreateNewAddress" type="warning" :show-icon="false" :bordered="false">
                    {{ t('createEmailUnavailable') }}
                </n-alert>
                <n-spin v-else :show="generateNameLoading">
                    <n-form>
                        <span>
                            <p v-if="!openSettings.disableCustomAddressName">{{ t("getNewEmailTip1") +
                                addressRegex.source }}</p>
                            <p v-if="!openSettings.disableCustomAddressName">{{ t("getNewEmailTip2") }}</p>
                            <p>{{ t("getNewEmailTip3") }}</p>
                        </span>
                        <n-button v-if="!openSettings.disableCustomAddressName" @click="generateName"
                            style="margin-bottom: 10px;">
                            {{ t('generateName') }}
                        </n-button>
                        <n-input-group>
                            <n-input-group-label v-if="addressPrefix">
                                {{ addressPrefix }}
                            </n-input-group-label>
                            <n-input v-if="!openSettings.disableCustomAddressName" v-model:value="emailName" show-count
                                :minlength="openSettings.minAddressLen" :maxlength="openSettings.maxAddressLen" />
                            <n-input v-else :value="t('autoGeneratedName')" disabled />
                            <n-input-group-label>@</n-input-group-label>
                            <n-select v-model:value="emailDomain" :consistent-menu-width="false"
                                :options="domainsOptions" />
                        </n-input-group>
                        <n-form-item-row v-if="canUseRandomSubdomain">
                            <n-checkbox v-model:checked="enableRandomSubdomain">
                                {{ t('enableRandomSubdomain') }}
                            </n-checkbox>
                            <p style="margin: 8px 0 0; opacity: 0.75;">
                                {{ t('randomSubdomainTip') }}
                            </p>
                        </n-form-item-row>
                        <Turnstile v-model:value="cfToken" />
                        <n-button class="auth-submit" type="primary" block strong @click="newEmail" :loading="loading">
                            <template #icon>
                                <n-icon :component="NewLabelOutlined" />
                            </template>
                            {{ t('getNewEmail') }}
                        </n-button>
                    </n-form>
                </n-spin>
            </n-tab-pane>
        </n-tabs>
    </section>
</template>


<style scoped>
.n-alert {
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
}

.n-form .n-button {
    margin-top: 10px;
}

.switch-login-button {
    display: flex;
    justify-content: center;
    margin: 10px 0;
}

.n-form {
    text-align: left;
}
</style>
