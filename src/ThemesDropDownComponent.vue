<template>
  <div class="themes-dropdown">
    <label for="theme-select">Theme:</label>
    <select id="theme-select" v-model="selectedTheme" @change="onThemeChange">
      <option v-for="theme in themes" :key="theme.id" :value="theme.id">
        {{ theme.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';

  const props = defineProps<{
    themes: Array<{ id: string; name: string }>;
    initialTheme?: string;
  }>();

  const emit = defineEmits<{
    (e: 'theme-selected', themeId: string): void;
  }>();

  const { t, locale } = useI18n();
  const selectedTheme = ref(props.initialTheme || (props.themes[0]?.id ?? ''));

  watch(
    () => props.initialTheme,
    (val) => {
      if (val) selectedTheme.value = val;
    },
  );

  function onThemeChange(): void {
    emit('theme-selected', selectedTheme.value);
  }

  onMounted(() => {
    emit('theme-selected', selectedTheme.value);
  });
</script>

<style scoped>
  .themes-dropdown {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
</style>
