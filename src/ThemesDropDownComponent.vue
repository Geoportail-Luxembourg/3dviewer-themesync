<template>
  <div class="themes-dropdown">
    <select id="theme-select" v-model="selectedTheme" @change="onThemeChange">
      <option v-for="theme in themes" :key="theme.id" :value="theme.name">
        {{ $t(`theme.${theme.name}`) || theme.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue';

  const props = defineProps<{
    themes: Array<{ id: number; name: string }>;
  }>();

  const emit = defineEmits<{
    (e: 'theme-selected', themeName: string): void;
  }>();

  const selectedTheme = ref(props.themes[0]?.name ?? '');

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
    padding: 8px;
  }
  #theme-select {
    cursor: pointer;
  }
</style>
