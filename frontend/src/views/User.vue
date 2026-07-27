<script setup>
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../store'
import { useResponsiveTabPlacement } from '../utils/composables'
import { AlternateEmailRound, LinkRound, MarkEmailReadRound, SettingsRound } from '@vicons/material'

import AddressMangement from './user/AddressManagement.vue';
import UserSettingsPage from './user/UserSettings.vue';
import UserBar from './user/UserBar.vue';
import BindAddress from './user/BindAddress.vue';
import UserMailBox from './user/UserMailBox.vue';
import WorkspaceTabLabel from '../components/WorkspaceTabLabel.vue';

const {
    userTab, userSettings
} = useGlobalState()

const { t } = useScopedI18n('views.User')
const tabPlacement = useResponsiveTabPlacement()

</script>

<template>
    <div class="user-workspace">
        <UserBar />
        <n-tabs v-if="userSettings.user_email" class="workspace-tabs" type="bar" v-model:value="userTab"
            :placement="tabPlacement">
            <n-tab-pane name="address_management" class="workspace-pane">
                <template #tab>
                    <WorkspaceTabLabel :icon="AlternateEmailRound" :label="t('address_management')" />
                </template>
                <AddressMangement />
            </n-tab-pane>
            <n-tab-pane name="user_mail_box_tab" class="workspace-pane workspace-pane--mail">
                <template #tab>
                    <WorkspaceTabLabel :icon="MarkEmailReadRound" :label="t('user_mail_box_tab')" />
                </template>
                <UserMailBox />
            </n-tab-pane>
            <n-tab-pane name="user_settings" class="workspace-pane">
                <template #tab>
                    <WorkspaceTabLabel :icon="SettingsRound" :label="t('user_settings')" />
                </template>
                <UserSettingsPage />
            </n-tab-pane>
            <n-tab-pane name="bind_address" class="workspace-pane">
                <template #tab>
                    <WorkspaceTabLabel :icon="LinkRound" :label="t('bind_address')" />
                </template>
                <BindAddress />
            </n-tab-pane>
        </n-tabs>
    </div>
</template>
