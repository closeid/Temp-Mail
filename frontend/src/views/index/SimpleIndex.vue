<script setup>
import { ref, onMounted, computed, watch, onBeforeUnmount } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useMessage } from 'naive-ui'
import {
    ExitToAppFilled,
    ContentCopyFilled,
    RefreshFilled,
    ArrowBackIosNewFilled,
    ArrowForwardIosFilled,
    SettingsFilled
} from '@vicons/material'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import Login from '../common/Login.vue'
import AccountSettings from './AccountSettings.vue'
import { processItem } from '../../utils/email-parser'
import MailContentRenderer from '../../components/MailContentRenderer.vue'
import AddressSelect from '../../components/AddressSelect.vue'

const { jwt, settings, useSimpleIndex, showAddressCredential, openSettings, loading } = useGlobalState()
const message = useMessage()

// 邮件数据
const currentPage = ref(1)
const totalCount = ref(0)
const currentMail = ref(null)
const showAccountSettingsCard = ref(false)
const currentAutoRefreshInterval = ref(60)
const timer = ref(null)

const { t } = useScopedI18n('views.index.SimpleIndex')

// 复制地址
const copyAddress = async () => {
    try {
        await navigator.clipboard.writeText(settings.value.address)
        message.success(t('addressCopied'))
    } catch (error) {
        message.error('复制失败')
    }
}

// 获取邮件数据
const fetchMails = async () => {
    if (!settings.value.address) return
    try {
        const { results, count } = await api.fetch(`/api/mails?limit=1&offset=${currentPage.value - 1}`)
        totalCount.value = count > 0 ? count : totalCount.value;
        const rawMail = results && results.length > 0 ? results[0] : null
        currentMail.value = rawMail ? await processItem(rawMail) : null
    } catch (error) {
        console.error('Failed to fetch mails:', error)
        message.error('获取邮件失败')
    }
}

// 删除邮件
const deleteMail = async () => {
    if (!currentMail.value) return;
    try {
        await api.fetch(`/api/mails/${currentMail.value.id}`, { method: 'DELETE' });
        message.success(t('deleteSuccess'));
        currentMail.value = null;
        await refreshMails();
    } catch (error) {
        console.error('Failed to delete mail:', error);
        message.error('删除邮件失败');
    }
}

// 刷新邮件
const refreshMails = async () => {
    if (loading.value) return
    currentPage.value = 1
    showAccountSettingsCard.value = false
    currentAutoRefreshInterval.value = 60
    await fetchMails()
    message.success(t('refreshSuccess'))
}

// 分页控制
const currentPageDisplay = computed(() => currentPage.value)
const totalPages = computed(() => Math.max(1, totalCount.value))
const canGoPrev = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const isFirstPage = computed(() => currentPage.value === 1)

const prevPage = async () => {
    if (canGoPrev.value) {
        currentPage.value--
    }
}

const nextPage = async () => {
    if (canGoNext.value) {
        currentPage.value++
    }
}

// 监听页面变化
watch(currentPage, () => {
    fetchMails()
})

onMounted(async () => {
    await api.getSettings()
    await fetchMails()

    // 启动自动刷新
    timer.value = setInterval(async () => {
        if (!isFirstPage.value) {
            currentAutoRefreshInterval.value = 60
            return
        }

        if (--currentAutoRefreshInterval.value <= 0) {
            await refreshMails()
        }
    }, 1000)
})

onBeforeUnmount(() => {
    clearInterval(timer.value)
})
</script>

<template>
    <div class="center">
        <div v-if="!settings.address">
            <n-card :bordered="false" embedded>
                <Login />
            </n-card>
        </div>

        <div v-else>
            <n-card :bordered="false" embedded>
                <div class="address-heading">
                    <AddressSelect :showCopy="false" size="small" />
                </div>
                <n-flex justify="center">
                    <n-button @click="refreshMails" :loading="loading" type="primary" tertiary size="small">
                        <template #icon>
                            <n-icon>
                                <RefreshFilled />
                            </n-icon>
                        </template>
                        {{ t('refreshMails') }}
                    </n-button>
                    <n-button @click="copyAddress" tertiary size="small">
                        <template #icon>
                            <n-icon>
                                <ContentCopyFilled />
                            </n-icon>
                        </template>
                        {{ t('copyAddress') }}
                    </n-button>
                    <n-button @click="useSimpleIndex = false" tertiary size="small">
                        <template #icon>
                            <n-icon>
                                <ExitToAppFilled />
                            </n-icon>
                        </template>
                        {{ t('exitSimpleIndex') }}
                    </n-button>
                    <n-button @click="showAccountSettingsCard = true" tertiary size="small">
                        <template #icon>
                            <n-icon>
                                <SettingsFilled />
                            </n-icon>
                        </template>
                        {{ t('accountSettings') }}
                    </n-button>
                </n-flex>
                <div v-if="isFirstPage" class="auto-refresh-tip">
                    <n-text depth="3" size="12">
                        {{ t('refreshAfter', { msg: Math.max(0, currentAutoRefreshInterval) }) }}
                    </n-text>
                </div>
            </n-card>

            <!-- 账户设置卡片 -->
            <n-card v-if="showAccountSettingsCard" :bordered="false" embedded closable
                @close="showAccountSettingsCard = false" :title="t('accountSettings')">
                <AccountSettings />
            </n-card>

            <n-card v-else :bordered="false" embedded class="mail-panel">

                <div v-if="totalCount > 1">
                    <n-flex justify="space-between">
                        <n-button @click="prevPage" :disabled="!canGoPrev" text size="small">
                            <template #icon>
                                <n-icon>
                                    <ArrowBackIosNewFilled />
                                </n-icon>
                            </template>
                            {{ t('prevPage') }}
                        </n-button>
                        <n-text size="small">
                            {{ t('mailCount', { current: currentPageDisplay, total: totalCount }) }}
                        </n-text>
                        <n-button @click="nextPage" :disabled="!canGoNext" text size="small" icon-placement="right">
                            <template #icon>
                                <n-icon>
                                    <ArrowForwardIosFilled />
                                </n-icon>
                            </template>
                            {{ t('nextPage') }}
                        </n-button>
                    </n-flex>
                </div>

                <div v-if="!currentMail" class="no-mail">
                    <n-empty :description="t('noMails')" />
                </div>
                <div v-else>
                    <h3 v-if="currentMail.subject" class="mail-subject">{{ currentMail.subject }}</h3>
                    <div class="mail-content">
                        <MailContentRenderer :mail="currentMail" :showEMailTo="false" :showReply="false"
                            :enableUserDeleteEmail="openSettings.enableUserDeleteEmail" :showSaveS3="false"
                            :onDelete="deleteMail" />
                    </div>
                </div>
            </n-card>
        </div>
        <n-modal v-model:show="showAddressCredential" preset="dialog" :title="t('addressCredential')">
            <span>
                <p>{{ t("addressCredentialTip") }}</p>
            </span>
            <n-card embedded>
                <b>{{ jwt }}</b>
            </n-card>
        </n-modal>
    </div>
</template>

<style scoped>
.center {
    max-width: 800px;
    margin: 0 auto;
    padding-bottom: 8px;
}

.n-card {
    margin-top: 16px;
    width: 100%;
}

.address-heading {
    margin-bottom: 16px;
    text-align: center;
    font-size: 18px;
}

.auto-refresh-tip {
    margin-top: 12px;
    text-align: center;
}

.mail-panel {
    text-align: left;
}

.mail-subject {
    margin: 0 0 14px;
    overflow-wrap: anywhere;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.35;
}

.mail-content {
    margin-top: 16px;
}

.no-mail {
    padding: 28px 0;
}
</style>
