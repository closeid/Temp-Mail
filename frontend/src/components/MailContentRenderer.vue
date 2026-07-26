<script setup>
import { ref } from "vue";
import { useScopedI18n } from '@/i18n/app'
import { CloudDownloadRound, ReplyFilled, ForwardFilled, FullscreenRound } from '@vicons/material'
import ShadowHtmlComponent from "./ShadowHtmlComponent.vue";
import AiExtractInfo from "./AiExtractInfo.vue";
import { getDownloadEmlUrl } from '../utils/email-parser';
import { utcToLocalDate } from '../utils';
import { useGlobalState } from '../store';

const { preferShowTextMail, useIframeShowMail, useUTCDate, isDark } = useGlobalState();

const { t } = useScopedI18n('components.MailContentRenderer')

const props = defineProps({
  mail: {
    type: Object,
    required: true
  },
  showEMailTo: {
    type: Boolean,
    default: true
  },
  enableUserDeleteEmail: {
    type: Boolean,
    default: false
  },
  showReply: {
    type: Boolean,
    default: false
  },
  showSaveS3: {
    type: Boolean,
    default: false
  },
  // 回调函数 props
  onDelete: {
    type: Function,
    default: () => { }
  },
  onReply: {
    type: Function,
    default: () => { }
  },
  onForward: {
    type: Function,
    default: () => { }
  },
  onSaveToS3: {
    type: Function,
    default: () => { }
  }
});

const showTextMail = ref(preferShowTextMail.value);
const showAttachments = ref(false);
const curAttachments = ref([]);
const attachmentLoding = ref(false);
const showFullscreen = ref(false);

const handleDelete = () => {
  props.onDelete();
};

const handleViewAttachments = () => {
  curAttachments.value = props.mail.attachments;
  showAttachments.value = true;
};

const handleReply = () => {
  props.onReply();
};

const handleForward = () => {
  props.onForward();
};


const handleSaveToS3 = async (filename, blob) => {
  attachmentLoding.value = true;
  try {
    await props.onSaveToS3(filename, blob);
  } finally {
    attachmentLoding.value = false;
  }
};

</script>

<template>
  <div class="mail-content-renderer">
    <div class="message-toolbar">
      <div class="message-meta">
        <span class="message-meta__sender">{{ mail.source }}</span>
        <span v-if="showEMailTo" class="message-meta__recipient">TO: {{ mail.address }}</span>
        <span class="message-meta__date">{{ utcToLocalDate(mail.created_at, useUTCDate.value) }}</span>
        <span class="message-meta__id">#{{ mail.id }}</span>
      </div>

      <n-space class="message-actions" align="center" size="small">
        <n-button v-if="showReply" size="small" tertiary type="info" @click="handleReply">
          <template #icon>
            <n-icon :component="ReplyFilled" />
          </template>
          {{ t('reply') }}
        </n-button>

        <n-button v-if="showReply" size="small" tertiary type="info" @click="handleForward">
          <template #icon>
            <n-icon :component="ForwardFilled" />
          </template>
          {{ t('forward') }}
        </n-button>

        <n-button v-if="mail.attachments && mail.attachments.length > 0" size="small" tertiary type="info"
          @click="handleViewAttachments">
          {{ t('attachments') }}
        </n-button>

        <n-button tag="a" target="_blank" tertiary type="info" size="small" :download="mail.id + '.eml'"
          :href="getDownloadEmlUrl(mail.raw)">
          <template #icon>
            <n-icon :component="CloudDownloadRound" />
          </template>
          {{ t('downloadMail') }}
        </n-button>

        <n-button size="small" tertiary type="info" @click="showTextMail = !showTextMail">
          {{ showTextMail ? t('showHtmlMail') : t('showTextMail') }}
        </n-button>

        <n-button size="small" tertiary type="info" @click="showFullscreen = true">
          <template #icon>
            <n-icon :component="FullscreenRound" />
          </template>
          {{ t('fullscreen') }}
        </n-button>

        <n-popconfirm v-if="enableUserDeleteEmail" @positive-click="handleDelete">
          <template #trigger>
            <n-button tertiary type="error" size="small">{{ t('delete') }}</n-button>
          </template>
          {{ t('deleteMailTip') }}
        </n-popconfirm>
      </n-space>
    </div>

    <!-- AI 提取信息 -->
    <AiExtractInfo :metadata="mail.metadata" />

    <!-- 邮件内容 -->
    <div class="mail-content" :class="{ 'dark-mode': isDark }">
      <pre v-if="showTextMail" class="mail-text">{{ mail.text }}</pre>
      <iframe v-else-if="useIframeShowMail" :srcdoc="mail.message" class="mail-iframe">
      </iframe>
      <ShadowHtmlComponent v-else :key="mail.id" :htmlContent="mail.message" :isDark="isDark" class="mail-html" />
    </div>
  </div>

  <n-drawer v-model:show="showFullscreen" width="100%" placement="bottom" :trap-focus="false" :block-scroll="false"
    style="height: 100vh;">
    <n-drawer-content :title="mail.subject" closable>
      <div class="fullscreen-mail-content" :class="{ 'dark-mode': isDark }">
        <pre v-if="showTextMail" class="mail-text">{{ mail.text }}</pre>
        <iframe v-else-if="useIframeShowMail" :srcdoc="mail.message" class="mail-iframe">
        </iframe>
        <ShadowHtmlComponent v-else :key="mail.id" :htmlContent="mail.message" :isDark="isDark" class="mail-html" />
      </div>
    </n-drawer-content>
  </n-drawer>

  <!-- 附件模态框 -->
  <n-modal v-model:show="showAttachments" preset="dialog" title="Dialog">
    <template #header>
      <div>{{ t('attachments') }}</div>
    </template>
    <n-spin v-model:show="attachmentLoding">
      <n-list hoverable clickable>
        <n-list-item v-for="row in curAttachments" v-bind:key="row.id">
          <n-thing class="center" :title="row.filename">
            <template #description>
              <n-space>
                <n-tag type="info">
                  Size: {{ row.size }}
                </n-tag>
                <n-button v-if="showSaveS3" @click="handleSaveToS3(row.filename, row.blob)" ghost type="info"
                  size="small">
                  {{ t('saveToS3') }}
                </n-button>
              </n-space>
            </template>
          </n-thing>
          <template #suffix>
            <n-button tag="a" target="_blank" tertiary type="info" size="small" :download="row.filename"
              :href="row.url">
              <n-icon :component="CloudDownloadRound" />
            </n-button>
          </template>
        </n-list-item>
      </n-list>
    </n-spin>
  </n-modal>
</template>

<style scoped>
.mail-content-renderer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.mail-content {
  flex: 1;
  min-width: 0;
}

.mail-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  padding: 18px;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.65;
}

.dark-mode .mail-text {
  color: #e0e0e0;
}

.mail-iframe {
  width: 100%;
  height: 100%;
  border: none;
  min-height: 480px;
  background: #fdfdfd;
}

.dark-mode .mail-iframe {
  background-color: #fff;
}

.mail-html {
  width: 100%;
  height: 100%;
  min-height: 420px;
  padding: 18px;
}

.center {
  text-align: center;
}

.fullscreen-mail-content {
  height: calc(100vh - 120px);
  overflow: auto;
}

.fullscreen-mail-content .mail-iframe {
  min-height: calc(100vh - 120px);
}
</style>
