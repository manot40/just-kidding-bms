<script lang="ts">
  import { onDestroy } from 'svelte';

  import { cn } from '$lib/utils';
  import Button from './ui/button/button.svelte';

  const { class: cn_, ...p } = $props();

  let mediaRecorder = $state.raw<MediaRecorder | null>(null);
  let recordedChunks = [] as BlobPart[];

  const recording = $derived(mediaRecorder !== null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: { displaySurface: 'browser' },
        // @ts-ignore
        preferCurrentTab: true,
      });

      stream.getVideoTracks()[0].addEventListener('ended', () => stopRecording());
      const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs="avc1"')
        ? 'video/mp4; codecs="avc1"'
        : 'video/webm; codecs="vp9"';

      mediaRecorder = new MediaRecorder(stream, { mimeType });
      recordedChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        document.body.appendChild(a);
        a.click();

        // Clean up URL object and stop all hardware tracks
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Emit data every 1000ms
      console.log('Recording started');
    } catch (err) {
      console.error('Error starting screen recording:', err);
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setTimeout(() => (mediaRecorder = null), 1000);
    }
  }

  onDestroy(stopRecording);
</script>

<Button
  size="lg"
  variant="ghost"
  {...p}
  class={cn('py-6', recording && 'text-destructive! bg-destructive/20!', cn_)}
  onclick={recording ? stopRecording : startRecording}>
  {recording ? 'Stop' : 'Start'} Recording
</Button>
