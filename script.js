/**
 * TaskFlow — Professional To-Do Application
 * Concepts: Objects, Arrays, DOM, Loops, Date, localStorage, Events
 */

/* ------------------------------------------------------------------ */
/*  Data Model                                                         */
/* ------------------------------------------------------------------ */

class Task {
    constructor(title, description, priority, deadline) {
        this.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        this.title = title.trim();
        this.description = description ? description.trim() : '';
        this.priority = priority;          // 'low' | 'medium' | 'high' | 'emergency'
        this.completed = false;
        this.createdAt = new Date();
        this.deadline = new Date(deadline);
        this.tags = [];
        if (priority === 'emergency') this.tags.push('urgent');
    }

    isOverdue() {
        if (this.completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(this.deadline);
        d.setHours(0, 0, 0, 0);
        return d < today;
    }

    isToday() {
        const today = new Date();
        const d = new Date(this.deadline);
        return d.toDateString() === today.toDateString();
    }

    formatDeadline() {
        return this.deadline.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });
    }
}

/* ------------------------------------------------------------------ */
/*  State & Persistence                                                */
/* ------------------------------------------------------------------ */

let tasks = [];
let currentFilter = 'all';

function loadTasks() {
    try {
        const raw = localStorage.getItem('taskflow_tasks');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        tasks = parsed.map(obj => {
            const t = Object.assign(new Task('', '', 'low', new Date()), obj);
            t.createdAt = new Date(obj.createdAt);
            t.deadline = new Date(obj.deadline);
            return t;
        });
    } catch (e) {
        console.warn('Failed to load tasks:', e);
        tasks = [];
    }
}

function saveTasks() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

/* ------------------------------------------------------------------ */
/*  DOM Utilities                                                      */
/* ------------------------------------------------------------------ */

function $(selector) { return document.querySelector(selector); }
function $all(selector) { return document.querySelectorAll(selector); }

/* ------------------------------------------------------------------ */
/*  Rendering                                                          */
/* ------------------------------------------------------------------ */

function render() {
    const list = $('#task-list');
    const empty = $('#empty-state');

    let displayTasks = filterArray(tasks, currentFilter, $('#search-input').value);

    if (displayTasks.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        list.innerHTML = displayTasks.map(task => buildTaskHTML(task)).join('');
    }

    updateStats();
    updateDate();
}

function buildTaskHTML(task) {
    const overdueClass = task.isOverdue() ? 'overdue' : (task.isToday() ? 'today' : '');
    const overdueText = task.isOverdue() ? 'Overdue' : (task.isToday() ? 'Due Today' : '');

    return `
        <article class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}" aria-label="Task: ${escapeHTML(task.title)}">
            <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')" aria-label="${task.completed ? 'Mark incomplete' : 'Mark complete'}" title="Toggle complete">
                <span class="check">✓</span>
            </button>
            <div class="task-body">
                <div class="task-header">
                    <h3 class="task-title">${escapeHTML(task.title)}</h3>
                    <span class="priority-badge ${task.priority}">${escapeHTML(task.priority)}</span>
                </div>
                ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="task-date ${overdueClass}" aria-label="Deadline: ${task.formatDeadline()}">
                        ${overdueText ? overdueText + ' — ' : ''}${task.formatDeadline()}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="editTask('${task.id}')" aria-label="Edit task" title="Edit">Edit</button>
                <button class="del-btn" onclick="deleteTask('${task.id}')" aria-label="Delete task" title="Delete">Delete</button>
            </div>
        </article>
    `;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Filtering                                                          */
/* ------------------------------------------------------------------ */

function filterArray(arr, filter, searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    return arr.filter(task => {
        // Filter by status
        let statusMatch = true;
        if (filter === 'active') statusMatch = !task.completed;
        if (filter === 'completed') statusMatch = task.completed;
        if (filter === 'emergency') statusMatch = task.priority === 'emergency';

        // Filter by search
        const text = (task.title + ' ' + task.description + ' ' + task.tags.join(' ')).toLowerCase();
        const searchMatch = q === '' || text.includes(q);

        return statusMatch && searchMatch;
    }).sort((a, b) => {
        // Sort order: emergency first, then by deadline, then by creation
        if (a.priority === 'emergency' && b.priority !== 'emergency') return -1;
        if (b.priority === 'emergency' && a.priority !== 'emergency') return 1;
        return new Date(a.deadline) - new Date(b.deadline);
    });
}

function filterTasks(type) {
    currentFilter = type;
    $all('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = $(`.nav-btn[data-filter="${type}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    render();
}

function searchTasks(query) {
    render();
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

function addTask(e) {
    if (e) e.preventDefault();

    const title = $('#task-title').value.trim();
    const desc = $('#task-desc').value.trim();
    const priority = $('#task-priority').value;
    const deadline = $('#task-deadline').value;

    if (!title || !deadline) {
        alert('Please provide a title and deadline.');
        return;
    }

    const task = new Task(title, desc, priority, deadline);
    tasks.unshift(task); // newest first
    saveTasks();
    render();

    // Reset form
    $('#task-form').reset();
    $('#task-priority').value = 'medium';
    $('#task-title').focus();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newTitle = prompt('Update task title:', task.title);
    if (newTitle === null) return; // cancelled

    const newDesc = prompt('Update description:', task.description);
    const newPriority = prompt('Update priority (low / medium / high / emergency):', task.priority);

    task.title = newTitle.trim() || task.title;
    if (newDesc !== null) task.description = newDesc.trim();
    if (newPriority && ['low', 'medium', 'high', 'emergency'].includes(newPriority.toLowerCase())) {
        task.priority = newPriority.toLowerCase();
        task.tags = [];
        if (task.priority === 'emergency') task.tags.push('urgent');
    }

    saveTasks();
    render();
}

function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
}

/* ------------------------------------------------------------------ */
/*  Stats & Header Updates                                            */
/* ------------------------------------------------------------------ */

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const emergency = tasks.filter(t => t.priority === 'emergency').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    $('#stat-total').textContent = total;
    $('#stat-completed').textContent = completed;
    $('#stat-emergency').textContent = emergency;
    $('#progress-fill').style.width = progress + '%';
}

function updateDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    $('#date-display').textContent = today.toLocaleDateString('en-US', options);
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */

function init() {
    loadTasks();
    updateDate();

    // Set default deadline to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    $('#task-deadline').valueAsDate = tomorrow;

    // Keyboard shortcuts for input
    $('#task-title').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // If user presses enter without shift, submit if title exists
            if ($('#task-title').value.trim()) {
                addTask(e);
            }
        }
    });

    render();
}

init();
