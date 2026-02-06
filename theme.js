// theme.js - Lógica compartida de tema (Light/Dark)

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 1. Determinar si debemos usar modo oscuro
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && systemQuery.matches);

    // 2. Aplicar la clase
    if (shouldUseDark) {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcon(false);
    }

    // 3. Escuchar cambios en la configuración del sistema en tiempo real
    systemQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
                updateThemeIcon(true);
            } else {
                document.documentElement.classList.remove('dark');
                updateThemeIcon(false);
            }
        }
    });
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        updateThemeIcon(false);
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon(true);
    }
}

function updateThemeIcon(isDark) {
    // Manejar ambos inonos (Desktop y Mobile) si existen
    const icons = [
        document.getElementById('theme-toggle-icon'),
        document.getElementById('theme-icon-mobile')
    ];

    icons.forEach(icon => {
        if (!icon) return;
        if (isDark) {
            icon.className = 'fas fa-moon text-white dark:text-yellow-400';
        } else {
            icon.className = 'fas fa-sun text-yellow-500 text-gray-800'; // Sol oscuro en light mode para contraste
        }
    });
}

// Inicializar inmediatamente
initTheme();
