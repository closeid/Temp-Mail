<script setup>
import { watch, onMounted, ref, onBeforeUnmount, computed } from "vue";
import { useMessage } from 'naive-ui'
import { useScopedI18n } from '@/i18n/app'
import { useGlobalState } from '../store'
import {
  ArrowBackIosNewFilled, ArrowForwardIosFilled, CheckBoxRound,
  CloudDownloadRound, InboxRound, RefreshRound, SearchRound,
} from '@vicons/material'
import { useIsMobile } from '../utils/composables'
import { processItem } from '../utils/email-parser'
import { utcToLocalDate } from '../utils';
import { buildReplyModel, buildForwardModel } from '../utils/mail-actions'
import MailContentRenderer from "./MailContentRenderer.vue";
import AiExtractInfo from "./AiExtractInfo.vue";

const message = useMessage()
const isMobile = useIsMobile()

const props = defineProps({
  enableUserDeleteEmail: {
    type: Boolean,
    default: false,
    required: false
  },
  showEMailTo: {
    type: Boolean,
    default: true,
    required: false
  },
  fetchMailData: {
    type: Function,
    default: () => { },
    required: true
  },
  deleteMail: {
    type: Function,
    default: () => { },
    required: false
  },
  showReply: {
    type: Boolean,
    default: false,
    required: false
  },
  showSaveS3: {
    type: Boolean,
    default: false,
    required: false
  },
  saveToS3: {
    type: Function,
    default: (mail_id, filename, blob) => { },
    required: false
  },
  showFilterInput: {
    type: Boolean,
    default: false,
    required: false
  },
})

const localFilterKeyword = ref('')

const {
  isDark, mailboxSplitSize, mailListView, mailListPreviewLineClamp, indexTab, loading, useUTCDate,
  autoRefresh, configAutoRefreshInterval, sendMailModel
} = useGlobalState()
const autoRefreshInterval = ref(configAutoRefreshInterval.value)
const rawData = ref([])
const timer = ref(null)

const count = ref(0)
const page = ref(1)
const pageSize = ref(20)

const mailListPreviewLineClampValue = computed(() => {
  const value = Number(mailListPreviewLineClamp.value)
  if (!Number.isFinite(value)) return 0
  return Math.min(5, Math.max(0, Math.round(value)))
})

// Computed property for filtered data (only filter current page)
const data = computed(() => {
  if (!localFilterKeyword.value || localFilterKeyword.value.trim() === '') {
    return rawData.value;
  }
  const keyword = localFilterKeyword.value.toLowerCase();
  return rawData.value.filter(mail => {
    // Search in subject, text, message fields
    const searchFields = [
      mail.subject || '',
      mail.text || '',
      mail.message || ''
    ].map(field => field.toLowerCase());
    return searchFields.some(field => field.includes(keyword));
  });
})

const canGoPrevMail = computed(() => {
  if (!curMail.value) return false
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)
  return currentIndex > 0 || page.value > 1
})

const canGoNextMail = computed(() => {
  if (!curMail.value) return false
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)
  return currentIndex < data.value.length - 1 || count.value > page.value * pageSize.value
})

const prevMail = async () => {
  if (!canGoPrevMail.value) return
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)

  if (currentIndex > 0) {
    curMail.value = data.value[currentIndex - 1]
  } else if (page.value > 1) {
    page.value--
    await refresh()
    if (data.value.length > 0) {
      curMail.value = data.value[data.value.length - 1]
    }
  }
}

const nextMail = async () => {
  if (!canGoNextMail.value) return
  const currentIndex = data.value.findIndex(mail => mail.id === curMail.value.id)

  if (currentIndex < data.value.length - 1) {
    curMail.value = data.value[currentIndex + 1]
  } else if (count.value > page.value * pageSize.value) {
    page.value++
    await refresh()
    if (data.value.length > 0) {
      curMail.value = data.value[0]
    }
  }
}

const curMail = ref(null);

const multiActionMode = ref(false)
const showMultiActionDownload = ref(false)
const showMultiActionDelete = ref(false)
const multiActionDownloadZip = ref({})
const multiActionDeleteProgress = ref({ percentage: 0, tip: '0/0' })

const { t } = useScopedI18n('components.MailBox')

const setupAutoRefresh = async (autoRefresh) => {
  // auto refresh every configAutoRefreshInterval seconds
  autoRefreshInterval.value = configAutoRefreshInterval.value;
  if (autoRefresh) {
    clearInterval(timer.value);
    timer.value = setInterval(async () => {
      if (loading.value) return;
      autoRefreshInterval.value--;
      if (autoRefreshInterval.value <= 0) {
        autoRefreshInterval.value = configAutoRefreshInterval.value;
        await backFirstPageAndRefresh();
      }
    }, 1000)
  } else {
    clearInterval(timer.value)
    timer.value = null
  }
}

watch(autoRefresh, async (autoRefresh, old) => {
  setupAutoRefresh(autoRefresh)
}, { immediate: true })

watch([page, pageSize], async ([page, pageSize], [oldPage, oldPageSize]) => {
  if (page !== oldPage || pageSize !== oldPageSize) {
    await refresh();
  }
})

const refresh = async () => {
  try {
    const { results, count: totalCount } = await props.fetchMailData(
      pageSize.value, (page.value - 1) * pageSize.value
    );
    loading.value = true;
    rawData.value = await Promise.all(results.map(async (item) => {
      item.checked = false;
      return await processItem(item);
    }));
    if (totalCount > 0) {
      count.value = totalCount;
    }
    curMail.value = null;
    if (!isMobile.value && !mailListView.value && data.value.length > 0) {
      curMail.value = data.value[0];
    }
  } catch (error) {
    message.error(error.message || "error");
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const backFirstPageAndRefresh = async () => {
  page.value = 1;
  await refresh();
}

const clickRow = async (row) => {
  if (multiActionMode.value) {
    row.checked = !row.checked;
    curMail.value = row;
    return;
  }
  if (mailListView.value && curMail.value?.id === row.id) {
    curMail.value = null;
    return;
  }
  curMail.value = row;
};


const mailItemClass = (row) => {
  return curMail.value && row.id == curMail.value.id ? (isDark.value ? 'overlay overlay-dark-backgroud' : 'overlay overlay-light-backgroud') : '';
};

const deleteMail = async () => {
  try {
    await props.deleteMail(curMail.value.id);
    message.success(t("success"));
    curMail.value = null;
    await refresh();
  } catch (error) {
    message.error(error.message || "error");
  }
};

const replyMail = async () => {
  Object.assign(sendMailModel.value, buildReplyModel(curMail.value, t('reply')));
  indexTab.value = 'sendmail';
};

const forwardMail = async () => {
  Object.assign(sendMailModel.value, buildForwardModel(curMail.value, t('forwardMail')));
  indexTab.value = 'sendmail';
};

const onSpiltSizeChange = (size) => {
  mailboxSplitSize.value = size;
}

const saveToS3Proxy = async (filename, blob) => {
  await props.saveToS3(curMail.value.id, filename, blob);
}

const multiActionModeClick = (enableMulti) => {
  if (enableMulti) {
    data.value.forEach((item) => {
      item.checked = false;
    });
    multiActionMode.value = true;
  } else {
    multiActionMode.value = false;
    data.value.forEach((item) => {
      item.checked = false;
    });
  }
}

const multiActionSelectAll = (checked) => {
  data.value.forEach((item) => {
    item.checked = checked;
  });
}

const multiActionDeleteMail = async () => {
  try {
    loading.value = true;
    const selectedMails = data.value.filter((item) => item.checked);
    if (selectedMails.length === 0) {
      message.error(t('pleaseSelectMail'));
      return;
    }
    multiActionDeleteProgress.value = {
      percentage: 0,
      tip: `0/${selectedMails.length}`
    };
    for (const [index, mail] of selectedMails.entries()) {
      await props.deleteMail(mail.id);
      showMultiActionDelete.value = true;
      multiActionDeleteProgress.value = {
        percentage: Math.floor((index + 1) / selectedMails.length * 100),
        tip: `${index + 1}/${selectedMails.length}`
      };
    }
    message.success(t("success"));
    await refresh();
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    loading.value = false;
    showMultiActionDelete.value = true;
  }
}

const multiActionDownload = async () => {
  try {
    loading.value = true;
    const selectedMails = data.value.filter((item) => item.checked);
    if (selectedMails.length === 0) {
      message.error(t('pleaseSelectMail'));
      return;
    }
    const JSZipModlue = await import('jszip');
    const JSZip = JSZipModlue.default;
    const zip = new JSZip();
    for (const mail of selectedMails) {
      zip.file(`${mail.id}.eml`, mail.raw);
    }
    multiActionDownloadZip.value = {
      url: URL.createObjectURL(await zip.generateAsync({ type: "blob" })),
      filename: `mails-${new Date().toISOString().replace(/:/g, '-')}.zip`
    }
    showMultiActionDownload.value = true;
  } catch (error) {
    message.error(error.message || "error");
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refresh();
});

onBeforeUnmount(() => {
  clearInterval(timer.value)
})
</script>

<template>
  <div class="mailbox">
    <div v-if="!isMobile" class="left mailbox-desktop">
      <div class="mailbox-toolbar">
        <n-space v-if="multiActionMode" class="mailbox-toolbar__group" align="center">
          <n-button @click="multiActionModeClick(false)" tertiary>
            {{ t('cancelMultiAction') }}
          </n-button>
          <n-button @click="multiActionSelectAll(true)" tertiary>
            {{ t('selectAll') }}
          </n-button>
          <n-button @click="multiActionSelectAll(false)" tertiary>
            {{ t('unselectAll') }}
          </n-button>
          <n-popconfirm v-if="enableUserDeleteEmail" @positive-click="multiActionDeleteMail">
            <template #trigger>
              <n-button tertiary type="error">{{ t('delete') }}</n-button>
            </template>
            {{ t('deleteMailTip') }}
          </n-popconfirm>
          <n-button @click="multiActionDownload" tertiary type="info">
            <template #icon>
              <n-icon :component="CloudDownloadRound" />
            </template>
            {{ t('downloadMail') }}
          </n-button>
        </n-space>
        <n-space v-else class="mailbox-toolbar__group" align="center">
          <n-button @click="multiActionModeClick(true)" type="primary" tertiary>
            <template #icon>
              <n-icon :component="CheckBoxRound" />
            </template>
            {{ t('multiAction') }}
          </n-button>
          <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" :page-sizes="[20, 50, 100]"
            show-size-picker />
          <n-switch v-model:value="autoRefresh" :round="false">
            <template #checked>
              {{ t('refreshAfter', { msg: autoRefreshInterval }) }}
            </template>
            <template #unchecked>
              {{ t('autoRefresh') }}
            </template>
          </n-switch>
          <n-button @click="backFirstPageAndRefresh" type="primary" tertiary>
            <template #icon>
              <n-icon :component="RefreshRound" />
            </template>
            {{ t('refresh') }}
          </n-button>
          <n-input v-if="showFilterInput" v-model:value="localFilterKeyword"
            class="mailbox-search" :placeholder="t('keywordQueryTip')" clearable>
            <template #prefix>
              <n-icon :component="SearchRound" />
            </template>
          </n-input>
        </n-space>
      </div>
      <n-split class="left mailbox-split" direction="horizontal" :max="0.75" :min="0" :resize-trigger-size="8"
        :default-size="mailboxSplitSize" :on-update:size="onSpiltSizeChange" v-if="!mailListView || curMail">
        <template #resize-trigger>
          <div class="split-handle">
            <div class="split-handle__grip" />
          </div>
        </template>
        <template #1>
          <div class="mailbox-list-pane">
            <n-list class="mailbox-list" hoverable clickable>
              <n-list-item v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)"
                :class="[mailItemClass(row), 'mailbox-row']">
                <template #prefix v-if="multiActionMode">
                  <n-checkbox v-model:checked="row.checked" />
                </template>
                <n-thing class="mailbox-row__content">
                  <template #header>
                    <n-ellipsis class="mailbox-row__subject">{{ row.subject }}</n-ellipsis>
                    <time class="mailbox-row__date">{{ utcToLocalDate(row.created_at, useUTCDate) }}</time>
                  </template>
                  <template #description>
                    <div class="mailbox-row__meta">
                      <n-ellipsis class="mailbox-row__sender">
                        {{ showEMailTo ? "FROM: " + row.source : row.source }}
                      </n-ellipsis>
                      <n-ellipsis v-if="showEMailTo" class="mailbox-row__recipient">TO: {{ row.address }}</n-ellipsis>
                      <span class="mailbox-row__id">#{{ row.id }}</span>
                      <AiExtractInfo :metadata="row.metadata" compact />
                    </div>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </div>
        </template>
        <template #2>
          <div v-if="curMail" class="mailbox-detail-nav">
            <n-flex justify="space-between" align="center">
              <n-space :wrap="false" align="center">
                <n-button v-if="mailListView" @click="curMail = null" text size="small">
                  <template #icon>
                    <n-icon>
                      <ArrowBackIosNewFilled />
                    </n-icon>
                  </template>
                  {{ t('backToList') }}
                </n-button>
                <n-button @click="prevMail" :disabled="!canGoPrevMail" text size="small">
                  <template #icon>
                    <n-icon>
                      <ArrowBackIosNewFilled />
                    </n-icon>
                  </template>
                  {{ t('prevMail') }}
                </n-button>
              </n-space>
              <n-button @click="nextMail" :disabled="!canGoNextMail" text size="small" icon-placement="right">
                <template #icon>
                  <n-icon>
                    <ArrowForwardIosFilled />
                  </n-icon>
                </template>
                {{ t('nextMail') }}
              </n-button>
            </n-flex>
          </div>
          <n-card :bordered="false" embedded v-if="curMail" class="mail-item mailbox-detail-card"
            :title="curMail.subject">
            <MailContentRenderer :mail="curMail" :showEMailTo="showEMailTo"
              :enableUserDeleteEmail="enableUserDeleteEmail" :showReply="showReply" :showSaveS3="showSaveS3"
              :onDelete="deleteMail" :onReply="replyMail" :onForward="forwardMail" :onSaveToS3="saveToS3Proxy" />
          </n-card>
          <n-card :bordered="false" embedded class="mail-item mailbox-empty" v-else>
            <n-result status="info" :title="count === 0 ? t('emptyInbox') : t('pleaseSelectMail')">
              <template #icon>
                <n-icon :component="InboxRound" :size="100" />
              </template>
            </n-result>
          </n-card>
        </template>
      </n-split>
      <div v-else class="mail-list-scroll mailbox-full-list">
        <n-list class="mailbox-list" hoverable clickable>
          <n-list-item v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)"
            :class="[mailItemClass(row), 'mailbox-row', 'mailbox-row--wide']">
            <template #prefix v-if="multiActionMode">
              <n-checkbox v-model:checked="row.checked" />
            </template>
            <div class="mail-wide-row">
              <n-ellipsis class="mail-wide-row__sender">
                {{ showEMailTo ? "FROM: " + row.source : row.source }}
              </n-ellipsis>
              <div class="mail-wide-row__message">
                <n-ellipsis class="mail-wide-row__subject">{{ row.subject }}</n-ellipsis>
                <span v-if="row.text && mailListPreviewLineClampValue > 0" class="mail-wide-row__separator">-</span>
                <n-ellipsis v-if="row.text && mailListPreviewLineClampValue > 0"
                  class="mail-wide-row__preview" :tooltip="false">
                  {{ row.text }}
                </n-ellipsis>
              </div>
              <span class="mailbox-row__id">#{{ row.id }}</span>
              <time class="mailbox-row__date">{{ utcToLocalDate(row.created_at, useUTCDate) }}</time>
              <div v-if="showEMailTo || row.metadata" class="mail-wide-row__extra">
                <n-ellipsis v-if="showEMailTo" class="mailbox-row__recipient">TO: {{ row.address }}</n-ellipsis>
                <AiExtractInfo :metadata="row.metadata" compact />
              </div>
            </div>
          </n-list-item>
        </n-list>
      </div>
    </div>
    <div class="left mailbox-mobile" v-else>
      <n-space class="mobile-toolbar" justify="space-around" align="center" :wrap="false">
        <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" simple size="small" />
        <n-switch v-model:value="autoRefresh" size="small" :round="false">
          <template #checked>
            {{ t('refreshAfter', { msg: autoRefreshInterval }) }}
          </template>
          <template #unchecked>
            {{ t('autoRefresh') }}
          </template>
        </n-switch>
        <n-button class="mobile-refresh-button" @click="backFirstPageAndRefresh" tertiary size="small" type="primary"
          :aria-label="t('refresh')" :title="t('refresh')">
          <template #icon>
            <n-icon :component="RefreshRound" />
          </template>
          <span class="mobile-refresh-label">{{ t('refresh') }}</span>
        </n-button>
      </n-space>
      <div v-if="showFilterInput" class="mobile-search">
        <n-input v-model:value="localFilterKeyword"
          :placeholder="t('keywordQueryTip')" size="small" clearable>
          <template #prefix>
            <n-icon :component="SearchRound" />
          </template>
        </n-input>
      </div>
      <div class="mobile-list-pane">
        <n-list class="mailbox-list" hoverable clickable>
          <n-list-item class="mailbox-row" v-for="row in data" v-bind:key="row.id" @click="() => clickRow(row)">
            <n-thing class="mailbox-row__content">
              <template #header>
                <n-ellipsis class="mailbox-row__subject">{{ row.subject }}</n-ellipsis>
                <time class="mailbox-row__date">{{ utcToLocalDate(row.created_at, useUTCDate) }}</time>
              </template>
              <template #description>
                <div class="mailbox-row__meta">
                  <n-ellipsis class="mailbox-row__sender">
                    {{ showEMailTo ? "FROM: " + row.source : row.source }}
                  </n-ellipsis>
                  <n-ellipsis v-if="showEMailTo" class="mailbox-row__recipient">
                    TO: {{ row.address }}
                  </n-ellipsis>
                  <span class="mailbox-row__id">#{{ row.id }}</span>
                  <AiExtractInfo :metadata="row.metadata" compact />
                </div>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </div>
      <n-drawer v-model:show="curMail" width="100%" placement="bottom" :trap-focus="false" :block-scroll="false"
        style="height: 80vh;">
        <n-drawer-content :title="curMail ? curMail.subject : ''" closable>
          <n-card class="mobile-message-card" :bordered="false" embedded>
            <MailContentRenderer :mail="curMail" :showEMailTo="showEMailTo"
              :enableUserDeleteEmail="enableUserDeleteEmail" :showReply="showReply" :showSaveS3="showSaveS3"
              :useUTCDate="useUTCDate" :onDelete="deleteMail" :onReply="replyMail" :onForward="forwardMail"
              :onSaveToS3="saveToS3Proxy" />
          </n-card>
        </n-drawer-content>
      </n-drawer>
    </div>
    <n-modal v-model:show="showMultiActionDownload" preset="dialog" :title="t('downloadMail')">
      <n-tag type="info">
        {{ multiActionDownloadZip.filename }}
      </n-tag>
      <n-button tag="a" target="_blank" tertiary type="info" size="small" :download="multiActionDownloadZip.filename"
        :href="multiActionDownloadZip.url">
        <n-icon :component="CloudDownloadRound" />
        {{ t('downloadMail') + " zip" }}
      </n-button>
    </n-modal>
    <n-modal v-model:show="showMultiActionDelete" preset="dialog" :title="t('delete') + t('success')"
      negative-text="OK">
      <n-space justify="center">
        <n-progress type="circle" status="error" :percentage="multiActionDeleteProgress.percentage">
          <span style="text-align: center">
            {{ multiActionDeleteProgress.tip }}
          </span>
        </n-progress>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.left {
  text-align: left;
}

.center {
  text-align: center;
}

.overlay {
  width: 100%;
  height: 100%;
  z-index: 1000;
}

.overlay-dark-backgroud {
  background-color: rgba(255, 255, 255, 0.1);
}

.overlay-light-backgroud {
  background-color: rgba(0, 0, 0, 0.1);
}

.mail-item {
  height: 100%;
}

.mail-list-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 60vh;
  max-height: 100vh;
}

.mail-list-thing,
.mail-list-title,
.mail-list-preview {
  min-width: 0;
  max-width: 100%;
}

.mail-list-thing,
.mail-list-preview {
  width: 100%;
}

.mail-list-thing :deep(.n-thing-main),
.mail-list-thing :deep(.n-thing-header),
.mail-list-thing :deep(.n-thing-header__title),
.mail-list-thing :deep(.n-thing-main__description),
.mail-list-thing :deep(.n-thing-main__content) {
  min-width: 0;
}

.mail-list-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.mail-list-meta :deep(.n-tag) {
  max-width: 100%;
}

.mail-list-meta-text {
  max-width: min(240px, 100%);
}

.mail-list-preview {
  display: -webkit-box;
  overflow-wrap: anywhere;
  opacity: 0.7;
}

.mail-list-scroll :deep(.n-list-item__main) {
  min-width: 0;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.split-handle {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-handle__grip {
  width: 1px;
  height: 100%;
  min-height: 100%;
  border-radius: 0;
  background-color: var(--n-resize-trigger-color);
  transition: background-color 0.2s;
}

.split-handle:hover .split-handle__grip {
  background-color: var(--n-resize-trigger-color-hover);
}
</style>
