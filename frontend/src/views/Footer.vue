<script setup>
import { useScopedI18n } from '@/i18n/app'

const { t } = useScopedI18n('views.Footer')

</script>

<template>
    <div class="app-footer">
        <n-divider class="footer-divider" />
        <div class="footer-content">
            <n-space justify="center">
                <n-text depth="3">
                    {{ t('copyright') }} © 2023-2026 GetAnEmail
                </n-text>
            </n-space>
        </div>
    </div>
</template>


<style scoped>
.app-footer {
    width: 100%;
    border-top: 1px solid var(--n-border-color, #e2e8f0);
    background: var(--n-color, #ffffff);
}

:global(html[data-theme="dark"]) .app-footer {
    border-top-color: #2a3040;
    background: #171a23;
}

.footer-divider {
    display: none;
}

.footer-content {
    width: min(100%, 1180px);
    margin: 0 auto;
    padding: 32px 40px 36px;
    box-sizing: border-box;
    text-align: center;
}

@media (max-width: 640px) {
    .footer-content {
        padding: 24px 16px 28px;
    }
}
</style>
