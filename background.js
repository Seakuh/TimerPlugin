// Background script to keep timer running
let timerState = {
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    currentTask: '',
    pomodoroMode: 'work',
    pomodoroCount: 0
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_TIMER':
            timerState.isRunning = true;
            timerState.currentTask = message.task;
            timerState.startTime = Date.now();
            timerState.elapsedTime = 0;
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