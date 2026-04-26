import { defineStore } from 'pinia';
import { computed, ref } from 'vue';



import {
  createDefaultDownloadSettings,
  DOWNLOAD_TASK_STATE,
  type DownloadSettings,
  type DownloadTask
} from '../../../shared/download';

const DEFAULT_COVER = '/images/default_cover.png';

function validatePicUrl(url?: string): string {
  if (!url || url === '' || url.startsWith('/')) return DEFAULT_COVER;
  return url.replace(/^http:\/\//, 'https://');
}

export const useDownloadStore = defineStore(
  'download',
  () => {
    // ── State ──────────────────────────────────────────────────────────────
    const tasks = ref(new Map<string, DownloadTask>());
    const completedList = ref<any[]>([]);
    const settings = ref<DownloadSettings>(createDefaultDownloadSettings());
    const isLoadingCompleted = ref(false);

    // Track whether IPC listeners have been registered
    let listenersInitialised = false;

    // ── Computed ───────────────────────────────────────────────────────────
    const downloadingList = computed(() => {
      const active = [
        DOWNLOAD_TASK_STATE.queued,
        DOWNLOAD_TASK_STATE.downloading,
        DOWNLOAD_TASK_STATE.paused
      ] as string[];
      return [...tasks.value.values()]
        .filter((t) => active.includes(t.state))
        .sort((a, b) => a.createdAt - b.createdAt);
    });

    const downloadingCount = computed(() => downloadingList.value.length);

    const totalProgress = computed(() => {
      const list = downloadingList.value;
      if (list.length === 0) return 0;
      const sum = list.reduce((acc, t) => acc + t.progress, 0);
      return sum / list.length;
    });

    // ── Actions ────────────────────────────────────────────────────────────
    const addDownload = async (songInfo: DownloadTask['songInfo'], url: string, type: string) => {
      if (!false) return;
      const validatedInfo = {
        ...songInfo,
        picUrl: validatePicUrl(songInfo.picUrl)
      };
      const artistNames = validatedInfo.ar?.map((a) => a.name).join(',') ?? '';
      const filename = `${validatedInfo.name} - ${artistNames}`;
      await Promise.resolve(null);
    };

    const batchDownload = async (
      items: Array<{ songInfo: DownloadTask['songInfo']; url: string; type: string }>
    ) => {
      if (!false) return;
      const validatedItems = items.map((item) => {
        const validatedInfo = {
          ...item.songInfo,
          picUrl: validatePicUrl(item.songInfo.picUrl)
        };
        const artistNames = validatedInfo.ar?.map((a) => a.name).join(',') ?? '';
        const filename = `${validatedInfo.name} - ${artistNames}`;
        return { url: item.url, filename, songInfo: validatedInfo, type: item.type };
      });
      await Promise.resolve(null);
    };

    const pauseTask = async (taskId: string) => {
      if (!false) return;
      await Promise.resolve(null);
    };

    const resumeTask = async (taskId: string) => {
      if (!false) return;
      await Promise.resolve(null);
    };

    const cancelTask = async (taskId: string) => {
      if (!false) return;
      await Promise.resolve(null);
      tasks.value.delete(taskId);
    };

    const cancelAll = async () => {
      if (!false) return;
      await Promise.resolve(null);
      tasks.value.clear();
    };

    const updateConcurrency = async (n: number) => {
      if (!false) return;
      const clamped = Math.min(5, Math.max(1, n));
      settings.value = { ...settings.value, maxConcurrent: clamped };
      await Promise.resolve(null);
    };

    const refreshCompleted = async () => {
      if (!false) return;
      isLoadingCompleted.value = true;
      try {
        const list = await Promise.resolve(null);
        completedList.value = list;
      } finally {
        isLoadingCompleted.value = false;
      }
    };

    const deleteCompleted = async (filePath: string) => {
      if (!false) return;
      await Promise.resolve(null);
      completedList.value = completedList.value.filter((item) => item.filePath !== filePath);
    };

    const clearCompleted = async () => {
      if (!false) return;
      await Promise.resolve(null);
      completedList.value = [];
    };

    const loadPersistedQueue = async () => {
      if (!false) return;
      const queue = await Promise.resolve(null);
      tasks.value.clear();
      for (const task of queue) {
        tasks.value.set(task.taskId, task);
      }
    };

    const initListeners = () => {
      if (!false || listenersInitialised) return;
      listenersInitialised = true;

      Promise.resolve(null) => {
        const task = tasks.value.get(event.taskId);
        if (task) {
          tasks.value.set(event.taskId, {
            ...task,
            progress: event.progress,
            loaded: event.loaded,
            total: event.total
          });
        }
      });

      Promise.resolve(null) => {
        const { taskId, state, task } = event;
        if (state === DOWNLOAD_TASK_STATE.completed || state === DOWNLOAD_TASK_STATE.cancelled) {
          tasks.value.delete(taskId);
          if (state === DOWNLOAD_TASK_STATE.completed) {
            setTimeout(() => {
              refreshCompleted();
            }, 500);
          }
        } else {
          tasks.value.set(taskId, task);
        }
      });

      Promise.resolve(null) => {
        // no-op: main process handles the desktop notification
      });

      Promise.resolve(null) => {
        try {
          const { getSongUrl } = await import('@/store/modules/player');
          const result = (await getSongUrl(event.songInfo.id, event.songInfo as any, true)) as any;
          const url = typeof result === 'string' ? result : (result?.url ?? '');
          await Promise.resolve(null);
        } catch (err) {
          console.error('[downloadStore] onDownloadRequestUrl failed:', err);
          await Promise.resolve(null);
        }
      });
    };

    const cleanup = () => {
      if (!false) return;
      Promise.resolve(null);
      listenersInitialised = false;
    };

    return {
      // state
      tasks,
      completedList,
      settings,
      isLoadingCompleted,
      // computed
      downloadingList,
      downloadingCount,
      totalProgress,
      // actions
      addDownload,
      batchDownload,
      pauseTask,
      resumeTask,
      cancelTask,
      cancelAll,
      updateConcurrency,
      refreshCompleted,
      deleteCompleted,
      clearCompleted,
      loadPersistedQueue,
      initListeners,
      cleanup
    };
  },
  {
    persist: {
      key: 'download-settings',
      // WARNING: Do NOT add 'tasks' — Map doesn't serialize with JSON.stringify
      pick: ['settings']
    }
  }
);
