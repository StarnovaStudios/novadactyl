<script>
    (() => {
        let saved;
        try { saved = JSON.parse(localStorage.getItem('hydrodactyl:appearance') || 'null'); } catch {}
        const mode = saved?.mode === 'light' || saved?.mode === 'system' ? saved.mode : 'dark';
        const root = document.documentElement;
        root.dataset.theme = mode === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches === false ? 'light' : 'dark') : mode;
        root.dataset.accent = ['panel', 'blue', 'green', 'violet', 'orange', 'rose'].includes(saved?.accent) ? saved.accent : 'panel';
        root.dataset.palette = ['neutral', 'obsidian', 'dracula', 'nord', 'red', 'blue', 'yellow', 'green', 'violet', 'mocha'].includes(saved?.palette) ? saved.palette : 'neutral';
        root.dataset.animations = saved?.animations === 'reduced' || saved?.animations === 'off' ? saved.animations : saved?.animations === false ? 'off' : 'full';
        root.style.colorScheme = root.dataset.theme;
    })();
</script>
<style>
    html[data-theme="light"] {
        --color-bg: #fafafa;
        --color-canvas: #fafafa;
        --color-primary: #27272a;
    }
    html[data-animations="off"] *, html[data-animations="off"] *::before, html[data-animations="off"] *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
    }
    /* Reduced: keep quick color/opacity fades and loading spinners, drop movement and entrance animations. */
    html[data-animations="reduced"] [class*="transition"] {
        transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow !important;
        transition-duration: 100ms !important;
        transition-delay: 0s !important;
    }
    html[data-animations="reduced"] [class*="animate-"]:not(.animate-spin, .animate-pulse, .animate-ping) {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
    }
    html[data-animations="reduced"] { scroll-behavior: auto !important; }
</style>
