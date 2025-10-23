// Конфигурация
const CONFIG = {
    dataUrl: 'data/links.json',
    defaultExpanded: true
};

class TelegramPortal {
    constructor() {
        this.platforms = [];
        this.filteredPlatforms = [];
        this.isAllExpanded = CONFIG.defaultExpanded;
        this.currentTab = 'all';
        this.searchQuery = '';
        this.favorites = new Set(JSON.parse(localStorage.getItem('favorites')) || []);
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderPlatforms();
        this.setupEventListeners();
        this.updateLastModified();
        this.adaptToViewport();
    }

    async loadData() {
        try {
            const response = await fetch(CONFIG.dataUrl);
            this.platforms = await response.json();
            this.applyFilters();
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showError('Ошибка загрузки данных');
        }
    }

    applyFilters() {
        let filtered = [...this.platforms];
        
        // Фильтр по вкладке
        if (this.currentTab === 'favorites') {
            filtered = filtered.map(platform => {
                const filteredTerms = platform.terms.filter(term => 
                    this.favorites.has(this.generateTermId(term))
                );
                return filteredTerms.length > 0 ? { ...platform, terms: filteredTerms } : null;
            }).filter(Boolean);
        }
        
        // Фильтр по поиску
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase().trim();
            filtered = filtered.map(platform => {
                const filteredTerms = platform.terms.filter(term =>
                    term.full_name.toLowerCase().includes(query) ||
                    term.short_name.toLowerCase().includes(query) ||
                    term.group.toLowerCase().includes(query)
                );
                return filteredTerms.length > 0 ? { ...platform, terms: filteredTerms } : null;
            }).filter(Boolean);
        }
        
        this.filteredPlatforms = filtered;
        this.renderPlatforms();
    }

    renderPlatforms() {
        const container = document.getElementById('platformsContainer');
        
        if (this.filteredPlatforms.length === 0) {
            if (this.currentTab === 'favorites' && this.favorites.size === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="icon">⭐</div>
                        <p>В избранном пока ничего нет</p>
                        <p style="margin-top: 10px; font-size: 0.9rem;">Добавляйте платформы в избранное, нажимая на звездочку</p>
                    </div>
                `;
            } else {
                container.innerHTML = '<div class="loading">Ничего не найдено</div>';
            }
            return;
        }

        container.innerHTML = this.filteredPlatforms.map(platform => `
            <div class="platform ${this.isAllExpanded ? 'expanded' : ''}" data-platform="${platform.name}">
                <div class="platform-header" onclick="portal.togglePlatform('${platform.name}')">
                    <div class="platform-name">${platform.name}</div>
                    <span class="platform-icon">▼</span>
                </div>
                <div class="platform-content">
                    ${this.renderTerms(platform.terms)}
                </div>
            </div>
        `).join('');
    }

    renderTerms(terms) {
        return terms.map(term => {
            const termId = this.generateTermId(term);
            const isFavorite = this.favorites.has(termId);
            
            return `
                <div class="term" data-term-id="${termId}">
                    <div class="term-header">
                        <div class="term-names">
                            <div class="term-full-name">${term.full_name}</div>
                            <div class="term-short-name">${term.short_name}</div>
                        </div>
                        <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                                onclick="event.stopPropagation(); portal.toggleFavorite('${termId}')"
                                title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
                            ${isFavorite ? '⭐' : '☆'}
                        </button>
                    </div>
                    <div class="links-grid">
                        ${this.renderLinks(term)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderLinks(term) {
        const links = [];
        
        if (term.base_url) {
            links.push(this.createLink('🌐', 'Основной сайт', term.base_url));
        }
        if (term.tg_url) {
            links.push(this.createLink('📱', 'Телеграм', term.tg_url));
        }
        if (term.attendance_url) {
            links.push(this.createLink('✅', 'Посещаемость', term.attendance_url));
        }
        if (term.journal_url) {
            links.push(this.createLink('📊', 'Журнал', term.journal_url));
        }

        return links.join('');
    }

    createLink(icon, label, url) {
        return `
            <a href="${url}" target="_blank" class="link-btn" onclick="event.stopPropagation()">
                <span class="link-icon">${icon}</span>
                <span class="link-label">${label}</span>
            </a>
        `;
    }

    generateTermId(term) {
        return `${term.group}-${term.term}-${term.full_name}`.replace(/\s+/g, '-');
    }

    togglePlatform(platformName) {
        const platformElement = document.querySelector(`[data-platform="${platformName}"]`);
        platformElement.classList.toggle('expanded');
    }

    toggleAllPlatforms() {
        this.isAllExpanded = !this.isAllExpanded;
        const platforms = document.querySelectorAll('.platform');
        
        platforms.forEach(platform => {
            if (this.isAllExpanded) {
                platform.classList.add('expanded');
            } else {
                platform.classList.remove('expanded');
            }
        });

        const toggleBtn = document.getElementById('toggleAll');
        toggleBtn.innerHTML = this.isAllExpanded ? '▼ Свернуть все' : '▶ Развернуть все';
    }

    toggleFavorite(termId) {
        if (this.favorites.has(termId)) {
            this.favorites.delete(termId);
        } else {
            this.favorites.add(termId);
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('favorites', JSON.stringify([...this.favorites]));
        
        // Если находимся на вкладке избранного, обновляем отображение
        if (this.currentTab === 'favorites') {
            this.applyFilters();
        } else {
            // Иначе просто обновляем звездочку
            const termElement = document.querySelector(`[data-term-id="${termId}"]`);
            if (termElement) {
                const favoriteBtn = termElement.querySelector('.favorite-btn');
                favoriteBtn.classList.toggle('favorited', this.favorites.has(termId));
                favoriteBtn.innerHTML = this.favorites.has(termId) ? '⭐' : '☆';
            }
        }
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Обновляем активные кнопки вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        this.applyFilters();
    }

    searchPlatforms(query) {
        this.searchQuery = query;
        this.applyFilters();
    }

    updateLastModified() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        lastUpdateElement.textContent = new Date().toLocaleDateString('ru-RU');
    }

    adaptToViewport() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        window.addEventListener('resize', () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
    }

    showError(message) {
        const container = document.getElementById('platformsContainer');
        container.innerHTML = `<div class="loading">${message}</div>`;
    }

    setupEventListeners() {
        // Поиск с debounce
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchPlatforms(e.target.value);
            }, 300);
        });

        // Кнопка свернуть/развернуть все
        document.getElementById('toggleAll').addEventListener('click', () => {
            this.toggleAllPlatforms();
        });

        // Переключение вкладок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Закрытие клавиатуры при клике вне поиска
        document.addEventListener('click', (e) => {
            if (!e.target.matches('#searchInput')) {
                document.getElementById('searchInput').blur();
            }
        });
    }
}

// Инициализация при загрузке страницы
const portal = new TelegramPortal();

// Предотвращение масштабирования на iOS
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);