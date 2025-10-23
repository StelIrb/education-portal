class TaskManager {
    constructor() {
        this.cards = JSON.parse(localStorage.getItem('taskCards')) || [];
        this.currentCardId = null;
        this.currentTaskId = null;
        this.init();
    }

    init() {
        this.renderCards();
        this.setupEventListeners();
    }

    // Генерация ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Рендер карточек
    renderCards() {
        const container = document.getElementById('cardsContainer');
        
        if (this.cards.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <h3>Нет карточек</h3>
                    <p>Создайте свою первую карточку для задач!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.cards.map(card => {
            const stats = this.calculateCardStats(card);
            return `
                <div class="card" data-card-id="${card.id}">
                    <div class="card-header">
                        <h3 class="card-title">${card.title}</h3>
                        <div class="card-actions">
                            <button class="btn-icon delete-card-btn" title="Удалить карточку">🗑️</button>
                        </div>
                    </div>
                    
                    <div class="tasks-list">
                        ${card.tasks && card.tasks.length > 0 ? 
                            card.tasks.map(task => this.renderTask(task)).join('') : 
                            '<div class="empty-state" style="padding: 20px 0; font-size: 0.9rem;">Задач пока нет</div>'
                        }
                    </div>

                    <div class="add-buttons">
                        <button class="add-task-btn" data-card-id="${card.id}">
                            + Добавить задачу
                        </button>
                    </div>

                    ${stats.total > 0 ? `
                        <div class="card-stats">
                            <span>Всего: ${stats.total}</span>
                            <span>Выполнено: ${stats.completed}</span>
                            <span>Осталось: ${stats.pending}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        this.attachCardEventListeners();
    }

    // Рендер задачи
    renderTask(task) {
        const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
        const totalSubtasks = task.subtasks ? task.subtasks.length : 0;

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <div class="task-text">${task.text}</div>
                    <div class="task-actions">
                        <button class="btn-icon add-subtask-btn" title="Добавить подзадачу">📥</button>
                        <button class="btn-icon add-attachment-btn" title="Добавить вложение">📎</button>
                        <button class="btn-icon delete-task-btn" title="Удалить задачу">❌</button>
                    </div>
                </div>

                ${task.subtasks && task.subtasks.length > 0 ? `
                    <div class="subtasks-list">
                        ${task.subtasks.map(subtask => `
                            <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                                <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
                                <div class="subtask-text">${subtask.text}</div>
                                <button class="btn-icon delete-subtask-btn" title="Удалить подзадачу" style="font-size: 0.8rem;">❌</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${task.attachments && task.attachments.length > 0 ? `
                    <div class="attachments-list">
                        ${task.attachments.map(attachment => `
                            <div class="attachment-item" data-attachment-id="${attachment.id}">
                                <span class="attachment-icon">
                                    ${attachment.type === 'link' ? '🔗' : '📄'}
                                </span>
                                <div class="attachment-content">
                                    <div class="attachment-title">${attachment.title}</div>
                                    <div class="attachment-url">${attachment.url}</div>
                                </div>
                                <button class="btn-icon delete-attachment-btn" title="Удалить вложение" style="font-size: 0.8rem;">❌</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Расчет статистики карточки
    calculateCardStats(card) {
        const stats = {
            total: 0,
            completed: 0,
            pending: 0
        };

        if (card.tasks) {
            card.tasks.forEach(task => {
                stats.total++;
                if (task.completed) {
                    stats.completed++;
                } else {
                    stats.pending++;
                }
            });
        }

        return stats;
    }

    // Создание карточки
    createCard(title) {
        const card = {
            id: this.generateId(),
            title: title,
            tasks: [],
            createdAt: new Date().toISOString()
        };
        
        this.cards.push(card);
        this.saveToLocalStorage();
        this.renderCards();
    }

    // Добавление задачи
    addTask(cardId, text) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        const task = {
            id: this.generateId(),
            text: text,
            completed: false,
            subtasks: [],
            attachments: [],
            createdAt: new Date().toISOString()
        };

        if (!card.tasks) card.tasks = [];
        card.tasks.push(task);
        this.saveToLocalStorage();
        this.renderCards();
    }

    // Добавление подзадачи
    addSubtask(taskId, text) {
        const task = this.findTask(taskId);
        if (!task) return;

        const subtask = {
            id: this.generateId(),
            text: text,
            completed: false
        };

        if (!task.subtasks) task.subtasks = [];
        task.subtasks.push(subtask);
        this.saveToLocalStorage();
        this.renderCards();
    }

    // Добавление вложения
    addAttachment(taskId, type, title, url) {
        const task = this.findTask(taskId);
        if (!task) return;

        const attachment = {
            id: this.generateId(),
            type: type,
            title: title,
            url: url
        };

        if (!task.attachments) task.attachments = [];
        task.attachments.push(attachment);
        this.saveToLocalStorage();
        this.renderCards();
    }

    // Поиск задачи
    findTask(taskId) {
        for (const card of this.cards) {
            if (card.tasks) {
                const task = card.tasks.find(t => t.id === taskId);
                if (task) return task;
            }
        }
        return null;
    }

    // Переключение статуса задачи
    toggleTask(taskId) {
        const task = this.findTask(taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveToLocalStorage();
            this.renderCards();
        }
    }

    // Переключение статуса подзадачи
    toggleSubtask(subtaskId) {
        for (const card of this.cards) {
            if (card.tasks) {
                for (const task of card.tasks) {
                    if (task.subtasks) {
                        const subtask = task.subtasks.find(st => st.id === subtaskId);
                        if (subtask) {
                            subtask.completed = !subtask.completed;
                            this.saveToLocalStorage();
                            this.renderCards();
                            return;
                        }
                    }
                }
            }
        }
    }

    // Удаление карточки
    deleteCard(cardId) {
        if (confirm('Удалить эту карточку и все задачи в ней?')) {
            this.cards = this.cards.filter(c => c.id !== cardId);
            this.saveToLocalStorage();
            this.renderCards();
        }
    }

    // Удаление задачи
    deleteTask(taskId) {
        if (confirm('Удалить эту задачу?')) {
            for (const card of this.cards) {
                if (card.tasks) {
                    card.tasks = card.tasks.filter(t => t.id !== taskId);
                }
            }
            this.saveToLocalStorage();
            this.renderCards();
        }
    }

    // Удаление подзадачи
    deleteSubtask(subtaskId) {
        for (const card of this.cards) {
            if (card.tasks) {
                for (const task of card.tasks) {
                    if (task.subtasks) {
                        task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
                    }
                }
            }
        }
        this.saveToLocalStorage();
        this.renderCards();
    }

    // Удаление вложения
    deleteAttachment(attachmentId) {
        for (const card of this.cards) {
            if (card.tasks) {
                for (const task of card.tasks) {
                    if (task.attachments) {
                        task.attachments = task.attachments.filter(a => a.id !== attachmentId);
                    }
                }
            }
        }
        this.saveToLocalStorage();
        this.renderCards();
    }

    // Сохранение в localStorage
    saveToLocalStorage() {
        localStorage.setItem('taskCards', JSON.stringify(this.cards));
    }

    // Обработчики событий
    setupEventListeners() {
        // Добавление карточки
        document.getElementById('addCardBtn').addEventListener('click', () => {
            document.getElementById('cardModal').style.display = 'flex';
            document.getElementById('cardTitleInput').focus();
        });

        document.getElementById('saveCardBtn').addEventListener('click', () => {
            const title = document.getElementById('cardTitleInput').value.trim();
            if (title) {
                this.createCard(title);
                document.getElementById('cardModal').style.display = 'none';
                document.getElementById('cardTitleInput').value = '';
            }
        });

        document.getElementById('cancelCardBtn').addEventListener('click', () => {
            document.getElementById('cardModal').style.display = 'none';
        });

        // Добавление задачи
        document.getElementById('saveTaskBtn').addEventListener('click', () => {
            const text = document.getElementById('taskTextInput').value.trim();
            if (text && this.currentCardId) {
                this.addTask(this.currentCardId, text);
                document.getElementById('taskModal').style.display = 'none';
                document.getElementById('taskTextInput').value = '';
            }
        });

        document.getElementById('cancelTaskBtn').addEventListener('click', () => {
            document.getElementById('taskModal').style.display = 'none';
        });

        // Добавление подзадачи
        document.getElementById('saveSubtaskBtn').addEventListener('click', () => {
            const text = document.getElementById('subtaskTextInput').value.trim();
            if (text && this.currentTaskId) {
                this.addSubtask(this.currentTaskId, text);
                document.getElementById('subtaskModal').style.display = 'none';
                document.getElementById('subtaskTextInput').value = '';
            }
        });

        document.getElementById('cancelSubtaskBtn').addEventListener('click', () => {
            document.getElementById('subtaskModal').style.display = 'none';
        });

        // Добавление вложения
        document.getElementById('saveAttachmentBtn').addEventListener('click', () => {
            const type = document.getElementById('attachmentType').value;
            const title = document.getElementById('attachmentTitle').value.trim();
            const url = document.getElementById('attachmentUrl').value.trim();
            
            if (title && url && this.currentTaskId) {
                this.addAttachment(this.currentTaskId, type, title, url);
                document.getElementById('attachmentModal').style.display = 'none';
                document.getElementById('attachmentTitle').value = '';
                document.getElementById('attachmentUrl').value = '';
            }
        });

        document.getElementById('cancelAttachmentBtn').addEventListener('click', () => {
            document.getElementById('attachmentModal').style.display = 'none';
        });

        // Закрытие модальных окон
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Enter для сохранения
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (document.getElementById('cardModal').style.display === 'flex') {
                    document.getElementById('saveCardBtn').click();
                } else if (document.getElementById('taskModal').style.display === 'flex') {
                    document.getElementById('saveTaskBtn').click();
                } else if (document.getElementById('subtaskModal').style.display === 'flex') {
                    document.getElementById('saveSubtaskBtn').click();
                } else if (document.getElementById('attachmentModal').style.display === 'flex') {
                    document.getElementById('saveAttachmentBtn').click();
                }
            }
        });
    }

    // Обработчики для динамических элементов
    attachCardEventListeners() {
        // Кнопки добавления задач
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentCardId = btn.dataset.cardId;
                document.getElementById('taskModal').style.display = 'flex';
                document.getElementById('taskTextInput').focus();
            });
        });

        // Кнопки добавления подзадач
        document.querySelectorAll('.add-subtask-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentTaskId = btn.closest('.task-item').dataset.taskId;
                document.getElementById('subtaskModal').style.display = 'flex';
                document.getElementById('subtaskTextInput').focus();
            });
        });

        // Кнопки добавления вложений
        document.querySelectorAll('.add-attachment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentTaskId = btn.closest('.task-item').dataset.taskId;
                document.getElementById('attachmentModal').style.display = 'flex';
                document.getElementById('attachmentTitle').focus();
            });
        });

        // Чекбоксы задач
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = e.target.closest('.task-item').dataset.taskId;
                this.toggleTask(taskId);
            });
        });

        // Чекбоксы подзадач
        document.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const subtaskId = e.target.closest('.subtask-item').dataset.subtaskId;
                this.toggleSubtask(subtaskId);
            });
        });

        // Удаление карточек
        document.querySelectorAll('.delete-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = btn.closest('.card').dataset.cardId;
                this.deleteCard(cardId);
            });
        });

        // Удаление задач
        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.closest('.task-item').dataset.taskId;
                this.deleteTask(taskId);
            });
        });

        // Удаление подзадач
        document.querySelectorAll('.delete-subtask-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const subtaskId = btn.closest('.subtask-item').dataset.subtaskId;
                this.deleteSubtask(subtaskId);
            });
        });

        // Удаление вложений
        document.querySelectorAll('.delete-attachment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const attachmentId = btn.closest('.attachment-item').dataset.attachmentId;
                this.deleteAttachment(attachmentId);
            });
        });
    }
}

// Инициализация приложения
const taskManager = new TaskManager();