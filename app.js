document.addEventListener('DOMContentLoaded', () => {
    // === Selektory DOM ===
    const timerDisplay = document.getElementById('timer-display');
    const taskNameInput = document.getElementById('task-name');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const todayList = document.getElementById('today-list');
    const dailyTotalDisplay = document.getElementById('daily-total');
    const clearBtn = document.getElementById('clear-btn');

    // === Zmienne stanu ===
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let currentTask = '';
    let dailyTotalTime = 0;

    // === Funkcje pomocnicze ===
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

    const createTaskItem = (task, timeMs) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${task}</span>
            <span>${formatTime(timeMs)}</span>
            <button class="remove-btn">✖</button>
        `;
        addTaskListeners(li, task);

        // Obsługa przycisku X
        li.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // żeby nie odpalił dblclick na li
            const taskTime = parseTimeToMs(li.querySelector('span:nth-child(2)').textContent);

            // Odejmij czas zadania od sumy
            dailyTotalTime -= taskTime;
            if (dailyTotalTime < 0) dailyTotalTime = 0;
            dailyTotalDisplay.textContent = formatTime(dailyTotalTime);

            // Usuń zadanie z listy
            li.remove();

            // Zapisz nowy stan
            saveState();
        });

        return li;
    };

    const loadState = () => {
        const dailyData = JSON.parse(localStorage.getItem('dailyTasks')) || {};

        dailyTotalTime = Object.values(dailyData).reduce((sum, taskTime) => sum + taskTime, 0);
        dailyTotalDisplay.textContent = formatTime(dailyTotalTime);

        todayList.innerHTML = '';
        for (const [task, time] of Object.entries(dailyData)) {
            const li = createTaskItem(task, time);
            todayList.appendChild(li);
        }
    };

    const saveState = () => {
        const dailyData = {};
        todayList.querySelectorAll('li').forEach(li => {
            const task = li.querySelector('span:first-child').textContent;
            const time = li.querySelector('span:nth-child(2)').textContent;
            dailyData[task] = parseTimeToMs(time);
        });
        localStorage.setItem('dailyTasks', JSON.stringify(dailyData));
    };

    const updateTimer = () => {
        const now = Date.now();
        elapsedTime = now - startTime;
        timerDisplay.textContent = formatTime(elapsedTime);
    };

    // === Główne funkcje ===
    const startTimer = () => {
        if (timerInterval) return;
        currentTask = taskNameInput.value.trim() || 'Bez nazwy';
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 1000);
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
    };

    const stopTimer = () => {
        if (!timerInterval) return;
        clearInterval(timerInterval);
        updateTaskTime(currentTask, elapsedTime);
        timerInterval = null;
        elapsedTime = 0;
        timerDisplay.textContent = '00:00:00';
        taskNameInput.value = '';
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
    };

    const updateTaskTime = (task, timeToAdd) => {
        const existingItem = Array.from(todayList.children).find(li => 
            li.querySelector('span:first-child').textContent === task
        );

        if (existingItem) {
            const currentMs = parseTimeToMs(existingItem.querySelector('span:nth-child(2)').textContent);
            const newTime = currentMs + timeToAdd;
            existingItem.querySelector('span:nth-child(2)').textContent = formatTime(newTime);
        } else {
            const li = createTaskItem(task, timeToAdd);
            todayList.appendChild(li);
        }

        dailyTotalTime += timeToAdd;
        dailyTotalDisplay.textContent = formatTime(dailyTotalTime);
        saveState();
    };

    // === Funkcje dodatkowe ===
    const clearDailyTasks = () => {
        localStorage.removeItem('dailyTasks');
        dailyTotalTime = 0;
        dailyTotalDisplay.textContent = '00:00:00';
        todayList.innerHTML = '';
    };

    const addTaskListeners = (li, task) => {
        li.addEventListener('dblclick', () => {
            if (timerInterval) stopTimer(); // zatrzymaj jeśli coś działa
            taskNameInput.value = task;
            startTimer();
        });
    };

    // === Obsługa zdarzeń ===
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);
    clearBtn.addEventListener('click', clearDailyTasks);

    // === Inicjalizacja ===
    loadState();
});
