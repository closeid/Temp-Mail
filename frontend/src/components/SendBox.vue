<script setup>
import { watch, onMounted, ref, computed } from "vue";
import { useMessage } from 'naive-ui'
import { useScopedI18n } from '@/i18n/app'
import { useGlobalState } from '../store'
import { useIsMobile } from '../utils/composables'
import { utcToLocalDate } from '../utils';
import { CheckBoxRound, RefreshRound, SendRound } from '@vicons/material'

const message = useMessage()
const isMobile = useIsMobile()

const props = defineProps({
  enableUserDeleteEmail: {
    type: Boolean,
    default: false,
    required: false
  },
  showEMailFrom: {
    type: Boolean,
    default: false
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
})

const { isDark, mailboxSplitSize, loading, useUTCDate } = useGlobalState()
const data = ref([])

const count = ref(0)
const page = ref(1)
const pageSize = ref(20)

const curMail = ref(null);
const showCode = ref(false)

const multiActionMode = ref(false)
const showMultiActionDelete = ref(false)
const multiActionDeleteProgress = ref({ percentage: 0, tip: '0/0' })

const { t } = useScopedI18n('components.SendBox')

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
    data.value = results.map((item) => {
      try {
        const data = JSON.parse(item.raw);
        if (data.version == "v2") {
          item.to_mail = data.to_name ? `${data.to_name} <${data.to_mail}>` : data.to_mail;
          item.subject = data.subject;
          item.is_html = data.is_html;
          item.content = data.content;
          item.raw = JSON.stringify(data, null, 2);
        } else {
          item.to_mail = data?.personalizations?.map(
            (p) => p.to?.map((t) => t.email).join(',')
          ).join(';');
          item.subject = data.subject;
          item.is_html = (data.content[0]?.type != 'text/plain');
          item.content = data.content[0]?.value;
          item.raw = JSON.stringify(data, null, 2);
        }
      } catch (error) {
        console.log(error);
      }
      return item;
    });
    if (totalCount > 0) {
      count.value = totalCount;
    }
    if (!isMobile.value && !curMail.value && data.value.length > 0) {
      curMail.value = data.value[0];
    }
  } catch (error) {
    message.error(error.message || "error");
    console.error(error);
  }
};

const clickRow = async (row) => {
  curMail.value = row;
};

const mailItemClass = (row) => {
  return curMail.value && row.id == curMail.value.id ? (isDark.value ? 'overlay overlay-dark-backgroud' : 'overlay overlay-light-backgroud') : '';
};

const onSpiltSizeChange = (size) => {
  mailboxSplitSize.value = size;
}

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

const showMultiActionMode = computed(() => {
  return props.enableUserDeleteEmail;
});

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

onMounted(async () => {
  await refresh();
});
</script>

<template>
  <div class="mailbox sent-mailbox">
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
        </n-space>
        <n-space v-else class="mailbox-toolbar__group" align="center">
          <n-button v-if="showMultiActionMode" @click="multiActionModeClick(true)" type="primary" tertiary>
            <template #icon>
              <n-icon :component="CheckBoxRound" />
            </template>
            {{ t('multiAction') }}
          </n-button>
          <div style="display: inline-block; margin-right: 10px;">
            <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count"
              :page-sizes="[20, 50, 100]" show-size-picker />
          </div>
          <n-button @click="refresh" type="primary" tertiary>
            <template #icon>
              <n-icon :component="RefreshRound" />
            </template>
            {{ t('refresh') }}
          </n-button>
        </n-space>
      </div>
      <n-split class="mailbox-split" direction="horizontal" :max="0.75" :min="0" :resize-trigger-size="8"
        :default-size="mailboxSplitSize" :on-update:size="onSpiltSizeChange">
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
                      <n-ellipsis v-if="showEMailFrom" class="mailbox-row__sender">FROM: {{ row.address }}</n-ellipsis>
                      <n-ellipsis class="mailbox-row__recipient">TO: {{ row.to_mail }}</n-ellipsis>
                      <span class="mailbox-row__id">#{{ row.id }}</span>
                    </div>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </div>
        </template>
        <template #2>
          <n-card :bordered="false" embedded v-if="curMail"
            class="mail-item mailbox-detail-card sent-mail-detail-card" :title="curMail.subject">
            <div class="message-toolbar">
              <div class="message-meta">
                <span class="message-meta__sender">{{ curMail.address }}</span>
                <span>TO: {{ curMail.to_mail }}</span>
                <time class="message-meta__date">{{ utcToLocalDate(curMail.created_at, useUTCDate) }}</time>
                <span class="message-meta__id">#{{ curMail.id }}</span>
              </div>
              <n-space class="message-actions">
              <n-button size="small" tertiary type="info" @click="showCode = !showCode">
                {{ t('showCode') }}
              </n-button>
              <n-popconfirm v-if="enableUserDeleteEmail" @positive-click="deleteMail">
                <template #trigger>
                  <n-button tertiary type="error" size="small">{{ t('delete') }}</n-button>
                </template>
                {{ t('deleteMailTip') }}
              </n-popconfirm>
              </n-space>
            </div>
            <pre v-if="showCode" style="margin-top: 10px;">{{ curMail.raw }}</pre>
            <pre v-else-if="!curMail.is_html" style="margin-top: 10px;">{{ curMail.content }}</pre>
            <div v-else v-html="curMail.content" style="margin-top: 10px;"></div>
          </n-card>
          <n-card :bordered="false" embedded class="mail-item mailbox-empty" v-else>
            <n-result status="info" :title="count === 0 ? t('emptySent') : t('pleaseSelectMail')">
              <template #icon>
                <n-icon :component="SendRound" :size="100" />
              </template>
            </n-result>
          </n-card>
        </template>
      </n-split>
    </div>
    <div class="left mailbox-mobile" v-else>
      <div class="center mobile-toolbar">
        <div style="display: inline-block; margin-right: 10px;">
          <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count" simple size="small" />
        </div>
        <n-button @click="refresh" size="small" type="primary">
          <template #icon>
            <n-icon :component="RefreshRound" />
          </template>
          {{ t('refresh') }}
        </n-button>
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
                  <n-ellipsis v-if="showEMailFrom" class="mailbox-row__sender">FROM: {{ row.address }}</n-ellipsis>
                  <n-ellipsis class="mailbox-row__recipient">TO: {{ row.to_mail }}</n-ellipsis>
                  <span class="mailbox-row__id">#{{ row.id }}</span>
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
            <n-space>
              <n-tag type="info">
                ID: {{ curMail.id }}
              </n-tag>
              <n-tag type="info">
                {{ utcToLocalDate(curMail.created_at, useUTCDate) }}
              </n-tag>
              <n-tag type="info">
                FROM: {{ curMail.address }}
              </n-tag>
              <n-tag type="info">
                TO: {{ curMail.to_mail }}
              </n-tag>
              <n-button size="small" tertiary type="info" @click="showCode = !showCode">
                {{ t('showCode') }}
              </n-button>
              <n-popconfirm v-if="enableUserDeleteEmail" @positive-click="deleteMail">
                <template #trigger>
                  <n-button tertiary type="error" size="small">{{ t('delete') }}</n-button>
                </template>
                {{ t('deleteMailTip') }}
              </n-popconfirm>
            </n-space>
            <pre v-if="showCode" style="margin-top: 10px;">{{ curMail.raw }}</pre>
            <pre v-else-if="!curMail.is_html" style="margin-top: 10px;">{{ curMail.content }}</pre>
            <div v-else v-html="curMail.content" style="margin-top: 10px;"></div>
          </n-card>
        </n-drawer-content>
      </n-drawer>
    </div>
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

:deep(.n-result-header__title) {
  font-size: 18px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.split-handle {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-handle__grip {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  background-color: var(--n-resize-trigger-color);
  transition: background-color 0.2s;
}

.split-handle:hover .split-handle__grip {
  background-color: var(--n-resize-trigger-color-hover);
}
</style>
