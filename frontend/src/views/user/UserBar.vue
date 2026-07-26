<script setup>
import { useScopedI18n } from '@/i18n/app'
import { PersonOutlineRound } from '@vicons/material'

import { useGlobalState } from '../../store'

const { userSettings } = useGlobalState()

const { t } = useScopedI18n('views.user.UserBar')
</script>

<template>
    <div>
        <n-card :bordered="false" embedded v-if="!userSettings.fetched">
            <n-skeleton style="height: 50vh" />
        </n-card>
        <div v-else-if="userSettings.user_email">
            <n-alert class="user-session-bar" type="success" :show-icon="false" :bordered="false">
                <div class="user-session-bar__content">
                    <n-icon :component="PersonOutlineRound" />
                    <strong>{{ t('currentUser') }}</strong>
                    <span class="user-session-bar__email">{{ userSettings.user_email }}</span>
                </div>
            </n-alert>
        </div>
    </div>
</template>

<style scoped>
.n-alert {
    text-align: left;
}

.user-session-bar__content {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
}

.user-session-bar__content .n-icon {
    flex: 0 0 auto;
    color: var(--app-accent-text);
    font-size: 18px;
}

.user-session-bar__email {
    min-width: 0;
    overflow: hidden;
    color: var(--app-text-muted);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
}

</style>
