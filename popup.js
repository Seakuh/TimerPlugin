class TimeTracker {
    constructor() {
        this.isRunning = false;
        this.elapsedTime = 0;
        this.currentTask = '';
        this.tasks = [];
        this.pomodoroMode = 'work';
        this.pomodoroCount = 0;
        this.sheetUrl = '';
        
        // Pomodoro settings (in minutes)
        this.settings = {
            work: 25,
            break: 5,
            longBreak: 15,
            longBreakInterval: 4
        };
        
        this.initializeElements();
        this.loadTasks();
        this.loadSheetUrl();
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
        this.taskSelect = document.getElementById('taskSelect');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.newTaskInput = document.getElementById('newTaskInput');
        this.taskInput = document.getElementById('taskInput');
        this.saveTaskBtn = document.getElementById('saveTaskBtn');
        this.statusElement = document.getElementById('status');
        
        this.bindEvents();
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.stopBtn.addEventListener('click', () => this.stopTimer());
        this.addTaskBtn.addEventListener('click', () => this.showNewTaskInput());
        this.saveTaskBtn.addEventListener('click', () => this.saveNewTask());
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
                
                // Save to Google Sheets
                const minutes = Math.floor(response.duration / 60);
                const seconds = response.duration % 60;
                await this.saveToGoogleSheets(response.task, minutes, seconds);
                
                this.updateStatus('Time saved to Google Sheets');
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
    
    loadSheetUrl() {
        chrome.storage.local.get(['sheetUrl'], (result) => {
            this.sheetUrl = result.sheetUrl || '';
            if (!this.sheetUrl) {
                this.showSheetSetup();
            }
        });
    }
    
    showSheetSetup() {
        const setupHtml = `
            <div class="sheet-setup">
                <h3>Google Sheet Setup</h3>
                <p>Enter your Google Apps Script web app URL:</p>
                <input type="text" id="sheetUrlInput" placeholder="https://script.google.com/macros/s/..." class="task-input">
                <button class="btn btn-save" onclick="saveSheetUrl()">Save URL</button>
                <p class="setup-help">
                    <strong>How to get the URL:</strong><br>
                    1. Go to <a href="https://script.google.com" target="_blank">Google Apps Script</a><br>
                    2. Create new project and paste the code from google-apps-script.gs<br>
                    3. Deploy as web app and copy the URL
                </p>
            </div>
        `;
        
        this.statusElement.innerHTML = setupHtml;
    }
    
    updateStatus(message) {
        this.statusElement.textContent = message;
    }
    
    // Google Sheets Integration
    async saveToGoogleSheets(task, minutes, seconds) {
        if (!this.sheetUrl) {
            this.updateStatus('Please set up Google Sheet URL first');
            return;
        }
        
        const data = {
            task: task,
            duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };
        
        try {
            const response = await fetch(this.sheetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.updateStatus('Data saved successfully!');
            } else {
                throw new Error('Failed to save data');
            }
        } catch (error) {
            console.error('Error saving to Google Sheets:', error);
            this.updateStatus('Error saving data. Check console.');
        }
    }
}

// Global function for sheet URL setup
window.saveSheetUrl = function() {
    const urlInput = document.getElementById('sheetUrlInput');
    const url = urlInput.value.trim();
    
    if (url) {
        chrome.storage.local.set({ sheetUrl: url }, () => {
            location.reload(); // Reload popup to show normal interface
        });
    }
};

// Initialize the app when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new TimeTracker();
}); 