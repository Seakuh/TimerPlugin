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
        this.pomodoroBtn = document.getElementById('pomodoroBtn');
        this.breakBtn = document.getElementById('breakBtn');
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
        this.pomodoroBtn.addEventListener('click', () => this.startPomodoro());
        this.breakBtn.addEventListener('click', () => this.startBreak());
        this.addTaskBtn.addEventListener('click', () => this.showNewTaskInput());
        this.saveTaskBtn.addEventListener('click', () => this.saveNewTask());
        this.exportBtn.addEventListener('click', () => this.exportCSV());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveNewTask();
        });
        
        // Add event delegation for delete buttons
        this.historyList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                const historyItem = e.target.closest('.history-item');
                console.log('History item:', historyItem);
                console.log('Data entry index:', historyItem.dataset.entryIndex);
                const entryIndex = parseFloat(historyItem.dataset.entryIndex); // Use parseFloat for decimal IDs
                console.log('Parsed entry index:', entryIndex);
                this.deleteTimeEntry(entryIndex);
            }
        });
    }
    
    async loadTimerState() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' });
            if (response) {
                this.isRunning = response.isRunning;
                this.elapsedTime = response.elapsedTime;
                this.currentTask = response.currentTask;
                this.pomodoroMode = response.pomodoroMode || 'work';
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
                this.pomodoroMode = 'manual'; // Set to manual mode for normal timer
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
                this.pomodoroMode = 'manual'; // Reset to manual mode
                
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
    
    async startPomodoro() {
        if (!this.taskSelect.value) {
            this.updateStatus('Please select a task first');
            return;
        }
        
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'START_POMODORO',
                task: this.taskSelect.value,
                duration: 25 * 60 // 25 minutes in seconds
            });
            
            if (response.success) {
                this.isRunning = true;
                this.currentTask = this.taskSelect.value;
                this.pomodoroMode = 'work';
                this.updateButtonStates();
                this.timerElement.classList.add('timer-running');
                this.updateStatus(`🍅 Pomodoro: ${this.currentTask}`);
            }
        } catch (error) {
            console.error('Error starting pomodoro:', error);
        }
    }
    
    async startBreak() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'START_BREAK',
                duration: 5 * 60 // 5 minutes in seconds
            });
            
            if (response.success) {
                this.isRunning = true;
                this.currentTask = 'Break';
                this.pomodoroMode = 'break';
                this.updateButtonStates();
                this.timerElement.classList.add('timer-running');
                this.updateStatus('☕ Break time!');
            }
        } catch (error) {
            console.error('Error starting break:', error);
        }
    }
    
    updateDisplay() {
        if (this.pomodoroMode === 'work' || this.pomodoroMode === 'break') {
            // Countdown display for Pomodoro/Break
            const totalSeconds = Math.floor(this.elapsedTime / 1000);
            const targetSeconds = this.pomodoroMode === 'work' ? 25 * 60 : 5 * 60; // 25 min or 5 min
            const remainingSeconds = Math.max(0, targetSeconds - totalSeconds);
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            
            this.timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            // Normal count-up display for manual timer (starting from 00:00)
            const totalSeconds = Math.floor(this.elapsedTime / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            this.timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        this.modeElement.textContent = this.pomodoroMode.charAt(0).toUpperCase() + this.pomodoroMode.slice(1);
        this.modeElement.className = `timer-mode mode-${this.pomodoroMode}`;
    }
    
    updateButtonStates() {
        this.startBtn.disabled = this.isRunning;
        this.stopBtn.disabled = !this.isRunning;
        this.pomodoroBtn.disabled = this.isRunning;
        this.breakBtn.disabled = this.isRunning;
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
            this.updateHistory(); // Update history immediately after loading
        });
    }
    
    async saveTimeEntry(task, minutes, seconds) {
        const entry = {
            id: Date.now() + Math.random(), // Ensure unique ID even for rapid entries
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
        
        console.log('Time entries in updateHistory:', this.timeEntries);
        
        this.historyList.innerHTML = this.timeEntries.map((entry, index) => {
            console.log('Entry ID being set:', entry.id, 'Type:', typeof entry.id);
            return `
            <div class="history-item" data-entry-index="${index}">
                <div class="history-content">
                    <div class="history-task">${entry.task}</div>
                    <div class="history-details">
                        <span class="history-duration">${entry.duration}</span>
                        <span class="history-time">${entry.time}</span>
                    </div>
                </div>
                <button class="delete-btn">
                    <span class="delete-icon">🗑️</span>
                </button>
            </div>
        `;
        }).join('');
    }
    
    async deleteTimeEntry(entryIndex) {
        // Remove entry from array
        this.timeEntries = this.timeEntries.filter((_, index) => index !== entryIndex);
        
        // Save updated entries to storage
        await chrome.storage.local.set({ timeEntries: this.timeEntries });
        
        // Update the display
        this.updateHistory();
        this.updateStatus('Entry deleted');
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
    window.timeTracker = new TimeTracker();
});
