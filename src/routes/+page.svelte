<script>
    import { onMount } from 'svelte';

    let { data } = $props();

    let loading_time = $state(0);
    let request = $derived(data?.request);

    onMount(async () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        loading_time = navigation?.loadEventEnd ?? 0;

        const payload = {
            id: data?.request?.id,
            screen_width: window.screen?.width ?? null,
            screen_height: window.screen?.height ?? null,
            loading_time
        };

        try {
            await fetch('/api/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Erro ao enviar para /api/collect:', error);
        }
    });
</script>

<h1>Site em construção</h1>
<p>Esse site ainda está em construção. Tente acessar novamente mais tarde.</p>
<span>Loading Time: {loading_time} | Request ID: {request?.id}</span>