<script setup>
import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useRoute } from 'vue-router'

import { useGlobalState } from '../store'
import { api } from '../api'
import { useIsMobile, useResponsiveTabPlacement } from '../utils/composables'
import {
  AttachmentRound, EditRound, FullscreenExitOutlined, InboxRound, InfoRound,
  ManageAccountsRound, PaletteRound, ReplyRound, SendRound, WebhookRound,
} from '@vicons/material'

import AddressBar from './index/AddressBar.vue';
import MailBox from '../components/MailBox.vue';
import SendBox from '../components/SendBox.vue';
import AutoReply from './index/AutoReply.vue';
import AccountSettings from './index/AccountSettings.vue';
import Appearance from './common/Appearance.vue';
import Webhook from './index/Webhook.vue';
import Attachment from './index/Attachment.vue';
import About from './common/About.vue';
import SimpleIndex from './index/SimpleIndex.vue';
import WorkspaceTabLabel from '../components/WorkspaceTabLabel.vue';
import HomeAuth from './HomeAuth.vue';

const {
  loading, settings, openSettings, indexTab, globalTabplacement, useSimpleIndex,
  userSettings, isTelegram,
} = useGlobalState()
const message = useMessage()
const route = useRoute()
const isMobile = useIsMobile()
const tabPlacement = useResponsiveTabPlacement(globalTabplacement)
const sessionReady = computed(() => settings.value.fetched && userSettings.value.fetched)
const showHomeAuth = computed(() => sessionReady.value
  && !isTelegram.value
  && !settings.value.address
  && !userSettings.value.user_email)

const SendMail = defineAsyncComponent(() => {
  loading.value = true;
  return import('./index/SendMail.vue')
    .finally(() => loading.value = false);
});

const { t } = useScopedI18n('views.Index')

const fetchMailData = async (limit, offset) => {
  if (mailIdQuery.value > 0) {
    const singleMail = await api.fetch(`/api/mail/${mailIdQuery.value}`);
    if (singleMail) return { results: [singleMail], count: 1 };
    return { results: [], count: 0 };
  }
  return await api.fetch(`/api/mails?limit=${limit}&offset=${offset}`);
};

const deleteMail = async (curMailId) => {
  await api.fetch(`/api/mails/${curMailId}`, { method: 'DELETE' });
};

const deleteSenboxMail = async (curMailId) => {
  await api.fetch(`/api/sendbox/${curMailId}`, { method: 'DELETE' });
};

const fetchSenboxData = async (limit, offset) => {
  return await api.fetch(`/api/sendbox?limit=${limit}&offset=${offset}`);
};

const saveToS3 = async (mail_id, filename, blob) => {
  try {
    const { url } = await api.fetch(`/api/attachment/put_url`, {
      method: 'POST',
      body: JSON.stringify({ key: `${mail_id}/${filename}` })
    });
    // upload to s3 by formdata
    const formData = new FormData();
    formData.append(filename, blob);
    await fetch(url, {
      method: 'PUT',
      body: formData
    });
    message.success(t('saveToS3Success'));
  } catch (error) {
    console.error(error);
    message.error(error.message || "save to s3 error");
  }
}

const mailBoxKey = ref("")
const mailIdQuery = ref("")
const showMailIdQuery = ref(false)

const queryMail = () => {
  mailBoxKey.value = Date.now();
}

watch(route, () => {
  if (!route.query.mail_id) {
    showMailIdQuery.value = false;
    mailIdQuery.value = "";
    queryMail();
  }
})

onMounted(async () => {
  await api.getSettings()
  if (route.query.mail_id) {
    showMailIdQuery.value = true;
    mailIdQuery.value = route.query.mail_id;
    queryMail();
  }
})
</script>

<template>
  <div class="mail-workspace">
    <HomeAuth v-if="showHomeAuth" />
    <section v-else-if="!sessionReady" class="home-auth-shell">
      <n-card class="home-auth-card" :bordered="false" embedded>
        <n-skeleton text :repeat="6" />
      </n-card>
    </section>
    <div v-else-if="useSimpleIndex">
      <SimpleIndex />
    </div>
    <div v-else>
      <AddressBar />
      <n-tabs v-if="settings.address" class="workspace-tabs" type="card" v-model:value="indexTab"
        :placement="tabPlacement">
        <template #prefix v-if="!isMobile">
          <n-button @click="useSimpleIndex = true" tertiary size="small">
            <template #icon>
              <n-icon>
                <FullscreenExitOutlined />
              </n-icon>
            </template>
            {{ t('enterSimpleMode') }}
          </n-button>
        </template>
        <n-tab-pane name="mailbox" class="workspace-pane workspace-pane--mail">
          <template #tab>
            <WorkspaceTabLabel :icon="InboxRound" :label="t('mailbox')" />
          </template>
          <div v-if="showMailIdQuery" style="margin-bottom: 10px;">
            <n-input-group>
              <n-input v-model:value="mailIdQuery" />
              <n-button @click="queryMail" type="primary" tertiary>
                {{ t('query') }}
              </n-button>
            </n-input-group>
          </div>
          <MailBox :key="mailBoxKey" :showEMailTo="false" :showReply="openSettings.enableSendMail" :showSaveS3="openSettings.isS3Enabled"
            :saveToS3="saveToS3" :enableUserDeleteEmail="openSettings.enableUserDeleteEmail"
            :fetchMailData="fetchMailData" :deleteMail="deleteMail" :showFilterInput="true" />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableSendMail" name="sendbox" class="workspace-pane workspace-pane--mail">
          <template #tab>
            <WorkspaceTabLabel :icon="SendRound" :label="t('sendbox')" />
          </template>
          <SendBox :fetchMailData="fetchSenboxData" :enableUserDeleteEmail="openSettings.enableUserDeleteEmail"
            :deleteMail="deleteSenboxMail" />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableSendMail" name="sendmail" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="EditRound" :label="t('sendmail')" />
          </template>
          <SendMail />
        </n-tab-pane>
        <n-tab-pane name="accountSettings" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="ManageAccountsRound" :label="t('accountSettings')" />
          </template>
          <AccountSettings />
        </n-tab-pane>
        <n-tab-pane name="appearance" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="PaletteRound" :label="t('appearance')" />
          </template>
          <Appearance :showUseSimpleIndex="true" />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableAutoReply" name="auto_reply" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="ReplyRound" :label="t('auto_reply')" />
          </template>
          <AutoReply />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableWebhook" name="webhook" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="WebhookRound" :label="t('webhookSettings')" />
          </template>
          <Webhook />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.isS3Enabled" name="s3_attachment" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="AttachmentRound" :label="t('s3Attachment')" />
          </template>
          <Attachment />
        </n-tab-pane>
        <n-tab-pane v-if="openSettings.enableIndexAbout" name="about" class="workspace-pane">
          <template #tab>
            <WorkspaceTabLabel :icon="InfoRound" :label="t('about')" />
          </template>
          <About />
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>
