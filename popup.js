class TimeTracker {
    constructor() {
        this.isRunning = false;
        this.elapsedTime = 0;
        this.currentTask = '';
        this.tasks = [];
        this.pomodoroMode = 'work';
        this.pomodoroCount = 0;
        this.timeEntries = [];
        
        // Pomodoro settings (in minutes)
        this.settings = {
            work: 25,
            break: 5,
            longBreak: 15,
            longBreakInterval: 4
        };
        
        this.initializeElements();
        this.loadTasks();
        this.loadTimeEntries();
        this.loadTimerState();
        this.updateDisplay();
        this.updateHistory();
        
        // Listen for timer updates from background
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'TIMER_UPDATE') {
                this.elapsedTime = message.data.elapsedTime;
                this.isRunning = message.data.isRunning;
                this.currentTask = message.data.currentTask;
                this.updateDisplay();
                this.updateButtonStates();
            }
        });
    }
    
    initializeElements() {
        this.timerElement = document.getElementById('timer');
        this.modeElement = document.getElementById('mode');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.taskSelect = document.getElementById('taskSelect');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.newTaskInput = document.getElementById('newTaskInput');
        this.taskInput = document.getElementById('taskInput');
        this.saveTaskBtn = document.getElementById('saveTaskBtn');
        this.statusElement = document.getElementById('status');
        this.historyList = document.getElementById('historyList');
        this.exportBtn = document.getElementById('exportBtn');
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.stopBtn.addEventListener('click', () => this.stopTimer());
        this.addTaskBtn.addEventListener('click', () => this.showNewTaskInput());
        this.saveTaskBtn.addEventListener('click', () => this.saveNewTask());
        this.exportBtn.addEventListener('click', () => this.exportCSV());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveNewTask();
        });
    }
    
    async loadTimerState() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' });
            if (response) {
                this.isRunning = response.isRunning;
                this.elapsedTime = response.elapsedTime;
                this.currentTask = response.currentTask;
                this.updateDisplay();
                this.updateButtonStates();
            }
        } catch (error) {
            console.log('No background script response');
        }
    }
    
    async startTimer() {
        if (!this.taskSelect.value) {
            this.updateStatus('Please select a task first');
            return;
        }
        
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'START_TIMER',
                task: this.taskSelect.value
            });
            
            if (response.success) {
                this.isRunning = true;
                this.currentTask = this.taskSelect.value;
                this.updateButtonStates();
                this.timerElement.classList.add('timer-running');
                this.updateStatus(`Tracking: ${this.currentTask}`);
            }
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }
    
    async stopTimer() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
            
            if (response.success) {
                this.isRunning = false;
                this.elapsedTime = 0;
                this.currentTask = '';
                
                this.updateButtonStates();
                this.timerElement.classList.remove('timer-running');
                
                // Save time entry
                const minutes = Math.floor(response.duration / 60);
                const seconds = response.duration % 60;
                await this.saveTimeEntry(response.task, minutes, seconds);
                
                this.updateStatus('Session saved');
                this.updateDisplay();
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
        }
    }
    
    updateDisplay() {
        const totalSeconds = Math.floor(this.elapsedTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        this.timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.modeElement.textContent = this.pomodoroMode.charAt(0).toUpperCase() + this.pomodoroMode.slice(1);
        this.modeElement.className = `timer-mode mode-${this.pomodoroMode}`;
    }
    
    updateButtonStates() {
        this.startBtn.disabled = this.isRunning;
        this.stopBtn.disabled = !this.isRunning;
    }
    
    showNewTaskInput() {
        this.newTaskInput.style.display = 'flex';
        this.taskInput.focus();
    }
    
    saveNewTask() {
        const taskName = this.taskInput.value.trim();
        if (!taskName) return;
        
        if (!this.tasks.includes(taskName)) {
            this.tasks.push(taskName);
            this.saveTasks();
            this.updateTaskDropdown();
        }
        
        this.taskSelect.value = taskName;
        this.taskInput.value = '';
        this.newTaskInput.style.display = 'none';
        this.updateStatus('New task added');
    }
    
    updateTaskDropdown() {
        this.taskSelect.innerHTML = '<option value="">Select a task...</option>';
        this.tasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task;
            option.textContent = task;
            this.taskSelect.appendChild(option);
        });
    }
    
    loadTasks() {
        chrome.storage.local.get(['tasks'], (result) => {
            this.tasks = result.tasks || [];
            this.updateTaskDropdown();
        });
    }
    
    saveTasks() {
        chrome.storage.local.set({ tasks: this.tasks });
    }
    
    loadTimeEntries() {
        chrome.storage.local.get(['timeEntries'], (result) => {
            this.timeEntries = result.timeEntries || [];
        });
    }
    
    async saveTimeEntry(task, minutes, seconds) {
        const entry = {
            id: Date.now(),
            task: task,
            duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };
        
        this.timeEntries.unshift(entry); // Add to beginning
        this.timeEntries = this.timeEntries.slice(0, 10); // Keep only last 10 entries
        
        await chrome.storage.local.set({ timeEntries: this.timeEntries });
        this.updateHistory();
    }
    
    updateHistory() {
        if (this.timeEntries.length === 0) {
            this.historyList.innerHTML = '<div class="history-empty">No sessions yet</div>';
            return;
        }
        
        this.historyList.innerHTML = this.timeEntries.map(entry => `
            <div class="history-item">
                <div class="history-task">${entry.task}</div>
                <div class="history-details">
                    <span class="history-duration">${entry.duration}</span>
                    <span class="history-time">${entry.time}</span>
                </div>
            </div>
        `).join('');
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
    }
    
    exportCSV() {
        if (this.timeEntries.length === 0) {
            this.updateStatus('No data to export');
            return;
        }
        
        const csvContent = [
            'Date,Time,Task,Duration,Timestamp',
            ...this.timeEntries.map(entry => 
                `${entry.date},${entry.time},${entry.task},${entry.duration},${entry.timestamp}`
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-tracker-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatus('CSV exported successfully');
    }
}

// Initialize the app when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new TimeTracker();
}); 