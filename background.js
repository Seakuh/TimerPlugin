// Background script to keep timer running
let timerState = {
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    currentTask: '',
    pomodoroMode: 'work',
    pomodoroCount: 0,
    targetDuration: 0 // Target duration for Pomodoro/Break
};

// Load saved state when background script starts
chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
        timerState = result.timerState;
        if (timerState.isRunning) {
            startBackgroundTimer();
        }
    }
});

function startBackgroundTimer() {
    if (timerState.isRunning) {
        timerState.startTime = Date.now() - timerState.elapsedTime;
        
        // Update timer every second
        setInterval(() => {
            if (timerState.isRunning) {
                timerState.elapsedTime = Date.now() - timerState.startTime;
                
                // Check if Pomodoro/Break time is complete
                if (timerState.targetDuration > 0 && timerState.elapsedTime >= timerState.targetDuration * 1000) {
                    // Timer completed - show notification
                    showTimerCompleteNotification();
                    timerState.isRunning = false;
                    timerState.elapsedTime = timerState.targetDuration * 1000;
                }
                
                saveTimerState();
                
                // Send update to popup if open
                chrome.runtime.sendMessage({
                    type: 'TIMER_UPDATE',
                    data: timerState
                }).catch(() => {
                    // Popup might be closed, that's okay
                });
            }
        }, 1000);
    }
}

function saveTimerState() {
    chrome.storage.local.set({ timerState: timerState });
}

function showTimerCompleteNotification() {
    const title = timerState.pomodoroMode === 'work' ? '🍅 Pomodoro Complete!' : '☕ Break Complete!';
    const message = timerState.pomodoroMode === 'work' 
        ? `Great work! Time for a break.` 
        : `Break time is over. Ready to work?`;
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_TIMER':
            timerState.isRunning = true;
            timerState.currentTask = message.task;
            timerState.startTime = Date.now();
            timerState.elapsedTime = 0;
            timerState.targetDuration = 0; // No target duration for manual timer
            timerState.pomodoroMode = 'work';
            saveTimerState();
            startBackgroundTimer();
            sendResponse({ success: true });
            break;
            
        case 'START_POMODORO':
            timerState.isRunning = true;
            timerState.currentTask = message.task;
            timerState.startTime = Date.now();
            timerState.elapsedTime = 0;
            timerState.targetDuration = message.duration;
            timerState.pomodoroMode = 'work';
            saveTimerState();
            startBackgroundTimer();
            sendResponse({ success: true });
            break;
            
        case 'START_BREAK':
            timerState.isRunning = true;
            timerState.currentTask = 'Break';
            timerState.startTime = Date.now();
            timerState.elapsedTime = 0;
            timerState.targetDuration = message.duration;
            timerState.pomodoroMode = 'break';
            saveTimerState();
            startBackgroundTimer();
            sendResponse({ success: true });
            break;
            
        case 'STOP_TIMER':
            timerState.isRunning = false;
            const duration = Math.floor(timerState.elapsedTime / 1000);
            saveTimerState();
            sendResponse({ 
                success: true, 
                duration: duration,
                task: timerState.currentTask
            });
            break;
            
        case 'GET_TIMER_STATE':
            sendResponse(timerState);
            break;
            
        case 'RESET_TIMER':
            timerState.isRunning = false;
            timerState.elapsedTime = 0;
            timerState.startTime = null;
            timerState.currentTask = '';
            saveTimerState();
            sendResponse({ success: true });
            break;
    }
    return true; // Keep message channel open for async response
}); 