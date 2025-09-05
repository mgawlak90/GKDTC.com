document.addEventListener('DOMContentLoaded', () => {
    // === DOM Selectors ===
    const timerDisplay = document.getElementById('timer-display');
    const taskNameInput = document.getElementById('task-name');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const breakBtn = document.getElementById('break-btn');
    const clearBtn = document.getElementById('clear-btn');
    const todayList = document.getElementById('today-list');
    const previousTasksList = document.getElementById('previous-tasks-list');
    const dailyTotalDisplay = document.getElementById('daily-total');
    const breakTotalDisplay = document.getElementById('break-total');
    const overallTotalDisplay = document.getElementById('overall-total');
    const taskOptions = document.getElementById('task-options');
    const todayView = document.getElementById('today-view');
    const historyView = document.getElementById('history-view');
    const todayViewBtn = document.getElementById('today-view-btn');
    const historyViewBtn = document.getElementById('history-view-btn');
    const historyDatesList = document.getElementById('history-dates-list');

    // === State Variables ===
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let currentTask = '';
    let isBreak = false;
    let taskBeforeBreak = '';

    // === Helper Functions ===
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    };

    const parseTimeToMs = (timeString) => {
        const [h, m, s] = timeString.split(':').map(Number);
        return (h * 3600 + m * 60 + s) * 1000;
    };

    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadState = () => {
        const todayKey = `daily-tasks-${getTodayDate()}`;
        const todayData = JSON.parse(localStorage.getItem(todayKey)) || {};
        const overallData = JSON.parse(localStorage.getItem('overallTasks')) || {};
        const breakData = JSON.parse(localStorage.getItem(`break-time-${getTodayDate()}`)) || 0;
        
        // Update overall totals
        const dailyTotalTime = Object.values(todayData).reduce((sum, taskTime) => sum + taskTime, 0);
        const overallTotalTime = Object.values(overallData).reduce((sum, taskTime) => sum + taskTime, 0);
        
        dailyTotalDisplay.textContent = formatTime(dailyTotalTime);
        breakTotalDisplay.textContent = formatTime(breakData);
        overallTotalDisplay.textContent = formatTime(overallTotalTime);

        // Display today's tasks
        todayList.innerHTML = '';
        for (const [task, time] of Object.entries(todayData)) {
            const li = document.createElement('li');
            li.innerHTML = `<span>${task}</span><span>${formatTime(time)}</span>`;
            todayList.appendChild(li);
        }

        // Display all-time previous tasks and populate datalist
        previousTasksList.innerHTML = '';
        taskOptions.innerHTML = '';
        const allTasks = new Set(Object.keys(overallData));
        allTasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task;
            taskOptions.appendChild(option);

            const li = document.createElement('li');
            li.textContent = task;
            li.addEventListener('click', () => {
                taskNameInput.value = task;
            });
            previousTasksList.appendChild(li);
        });
    };

    const saveState = () => {
        const todayKey = `daily-tasks-${getTodayDate()}`;
        const dailyData = {};
        todayList.querySelectorAll('li').forEach(li => {
            const task = li.querySelector('span:first-child').textContent;
            const time = li.querySelector('span:last-child').textContent;
            dailyData[task] = parseTimeToMs(time);
        });
        localStorage.setItem(todayKey, JSON.stringify(dailyData));
        localStorage.setItem(`break-time-${getTodayDate()}`, JSON.stringify(parseTimeToMs(breakTotalDisplay.textContent)));
    
        // Update overall tasks list for history and datalist
        const overallData = JSON.parse(localStorage.getItem('overallTasks')) || {};
        const allTodayTasks = Object.keys(dailyData);
        allTodayTasks.forEach(task => {
            if (task !== 'BREAK') {
                const existingTime = overallData[task] || 0;
                overallData[task] = existingTime + dailyData[task];
            }
        });
        localStorage.setItem('overallTasks', JSON.stringify(overallData));
    };

    const updateTimer = () => {
        const now = Date.now();
        elapsedTime = now - startTime;
        timerDisplay.textContent = formatTime(elapsedTime);
        saveRunningState(); // autozapis co sekundę
    };

    // === Running State persistence ===
    const saveRunningState = () => {
        if (!timerInterval) return;
        const runningState = {
            task: currentTask,
            startTime,
            elapsedTime,
            isBreak,
            taskBeforeBreak
        };
        localStorage.setItem('runningState', JSON.stringify(runningState));
    };

    const clearRunningState = () => {
        localStorage.removeItem('runningState');
    };

    const restoreRunningState = () => {
        const saved = JSON.parse(localStorage.getItem('runningState'));
        if (!saved) return;

        currentTask = saved.task;
        startTime = saved.startTime;
        elapsedTime = saved.elapsedTime || 0;
        isBreak = saved.isBreak;
        taskBeforeBreak = saved.taskBeforeBreak || '';

        // przywracamy nazwę zadania
        taskNameInput.value = currentTask;
        timerInterval = setInterval(updateTimer, 1000);

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        breakBtn.style.display = 'inline-block';
        if (isBreak) {
            breakBtn.textContent = 'Resume Task';
        }
    };

    // === Core App Functions ===
    const startTimer = () => {
        if (timerInterval) return;
        currentTask = taskNameInput.value.trim() || 'Untitled Task';
        
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 1000);

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        breakBtn.style.display = 'inline-block';

        saveRunningState();
    };

    const stopTimer = () => {
        if (!timerInterval) return;
        clearInterval(timerInterval);
        
        if (!isBreak) {
            updateTaskTime(currentTask, elapsedTime);
        } else {
            const breakTime = parseTimeToMs(breakTotalDisplay.textContent) + elapsedTime;
            localStorage.setItem(`break-time-${getTodayDate()}`, JSON.stringify(breakTime));
        }

        timerInterval = null;
        elapsedTime = 0;
        timerDisplay.textContent = '00:00:00';
        taskNameInput.value = '';
        
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        breakBtn.style.display = 'none';
        clearRunningState();
        loadState();
    };

    const toggleBreak = () => {
        if (isBreak) {
            // przywracamy nazwę zadania i włączamy stoper
            taskNameInput.value = taskBeforeBreak;
            isBreak = false;
            breakBtn.textContent = 'Break';
            startTimer();
        } else {
            if (!timerInterval) return;
            clearInterval(timerInterval);
            
            updateTaskTime(currentTask, elapsedTime);

            isBreak = true;
            taskBeforeBreak = currentTask;
            elapsedTime = 0;
            breakBtn.textContent = 'Resume Task';
            timerDisplay.textContent = '00:00:00';
            taskNameInput.value = 'BREAK';
            
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
            saveRunningState();
        }
    };

    const updateTaskTime = (task, timeToAdd) => {
        const todayKey = `daily-tasks-${getTodayDate()}`;
        const dailyData = JSON.parse(localStorage.getItem(todayKey)) || {};
        dailyData[task] = (dailyData[task] || 0) + timeToAdd;
        localStorage.setItem(todayKey, JSON.stringify(dailyData));
        
        loadState();
    };

    const clearDailyData = () => {
        if (confirm('Are you sure you want to clear all tasks and break time for today?')) {
            localStorage.removeItem(`daily-tasks-${getTodayDate()}`);
            localStorage.removeItem(`break-time-${getTodayDate()}`);
            loadState();
        }
    };
    
    const showHistory = () => {
        todayView.style.display = 'none';
        historyView.style.display = 'block';
        historyDatesList.innerHTML = '';

        const allDates = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('daily-tasks-')) {
                const date = key.substring('daily-tasks-'.length);
                allDates.push(date);
            }
        }
        
        // Sort dates descending
        allDates.sort((a, b) => b.localeCompare(a));
        
        allDates.forEach(date => {
            const li = document.createElement('li');
            li.className = 'history-date';
            li.textContent = date;
            li.addEventListener('click', () => {
                const data = JSON.parse(localStorage.getItem(`daily-tasks-${date}`));
                const breakTime = JSON.parse(localStorage.getItem(`break-time-${date}`));
                displayHistoryDetails(date, data, breakTime);
            });
            historyDatesList.appendChild(li);
        });
    };
    
    const displayHistoryDetails = (date, tasks, breakTime) => {
        historyDatesList.innerHTML = `<h3>${date}</h3><button class="btn history-btn" onclick="location.reload()">Back</button>`;
        
        const summary = document.createElement('div');
        summary.innerHTML = `<p>Total work time: ${formatTime(Object.values(tasks).reduce((sum, time) => sum + time, 0))}</p>
                             <p>Total break time: ${formatTime(breakTime || 0)}</p>`;
        historyDatesList.appendChild(summary);
        
        const taskList = document.createElement('ul');
        taskList.className = 'history-list';
        for (const [task, time] of Object.entries(tasks)) {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `<span>${task}</span><span>${formatTime(time)}</span>`;
            taskList.appendChild(li);
        }
        historyDatesList.appendChild(taskList);
    };

    const showTodayView = () => {
        todayView.style.display = 'block';
        historyView.style.display = 'none';
        loadState();
    };

    // === Event Listeners ===
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);
    breakBtn.addEventListener('click', toggleBreak);
    clearBtn.addEventListener('click', clearDailyData);
    historyViewBtn.addEventListener('click', showHistory);
    todayViewBtn.addEventListener('click', showTodayView);

    // === Initialization ===
    loadState();
    restoreRunningState();
});
