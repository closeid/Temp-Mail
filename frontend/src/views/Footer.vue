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
    border-top: 1px solid var(--n-border-color, #e5e7eb);
}

:global(html[data-theme="dark"]) .app-footer {
    border-top-color: #2a3040;
}

.footer-divider {
    display: none;
}

.footer-content {
    width: 100%;
    margin: 0 auto;
    padding: 52px 64px 56px;
    box-sizing: border-box;
    text-align: center;
}

@media (max-width: 640px) {
    .footer-content {
        padding: 40px 20px 44px;
    }
}
</style>
