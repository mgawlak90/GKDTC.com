document.addEventListener('DOMContentLoaded', () => {
    // === Selektory DOM ===
    const body = document.body;
    const timerDisplay = document.getElementById('timer-display');
    const taskNameInput = document.getElementById('task-name');
    const toggleBtn = document.getElementById('toggle-btn');
    const stopBtn = document.getElementById('stop-btn');
    const todayList = document.getElementById('today-list');
    const dailyTotalDisplay = document.getElementById('daily-total');
    const clearBtn = document.getElementById('clear-btn');
    
    // USTAWIENIA I ZEGARY GLOBALNE
    const clockKrakow = document.getElementById('clock-krakow');
    const dateKrakow = document.getElementById('date-krakow');
    const clockNewYork = document.getElementById('clock-newyork');
    const dateNewYork = document.getElementById('date-newyork');

    // === Zmienne stanu ===
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let currentTask = '';
    let dailyTotalTime = 0;
    // Wymuszenie języka Polskiego
    let currentLang = 'pl'; 
    
    // Stany dla Pauzy
    let isTracking = false; 
    let isPaused = false; 
    
    // ZMIENIONA STAŁA NAZWA APLIKACJI (Używana, gdy timer jest zatrzymany)
    const APP_NAME_TITLE = 'TimeCard PRO'; // Zmieniono na APP_NAME_TITLE dla jasności

    // === TŁUMACZENIA ===
    const translations = {
        pl: {
            newYork: "Nowy Jork",
            krakow: "Kraków",
            taskPlaceholder: "Wpisz nazwę zadania",
            startBtn: "Start",
            stopBtn: "Stop",
            pauseBtn: "Pauza",     
            resumeBtn: "Wznów",    
            dailySummaryTitle: "Podsumowanie dnia",
            dailyTotalLabel: "Suma czasu pracy dzisiaj:",
            tasksTodayTitle: "Zadania z dzisiaj",
            clearBtn: "Wyczyść dzisiejsze zadania",
            clearBtnConfirm: "Czy na pewno chcesz wyczyścić dzisiejsze zadania?", 
            defaultTask: "Bez nazwy",
            themeDark: "Ciemny",    
            themeLight: "Jasny"     
        },
        en: {
            newYork: "New York",
            krakow: "Krakow",
            taskPlaceholder: "Enter task name",
            startBtn: "Start",
            stopBtn: "Stop",
            pauseBtn: "Pause",
            resumeBtn: "Resume",
            dailySummaryTitle: "Daily Summary",
            dailyTotalLabel: "Total time worked today:",
            tasksTodayTitle: "Tasks from today",
            clearBtn: "Clear today's tasks",
            clearBtnConfirm: "Are you sure you want to clear today's tasks?",
            defaultTask: "Untitled task",
            themeDark: "Dark",      
            themeLight: "Light"     
        }
    };

    // =====================================================================
    // === FUNKCJE POMOCNICZE I GLOBALNE ===
    // =====================================================================
    
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
    
    // --- ZEGARY ---
    const updateGlobalClocks = () => {
        const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };

        // Kraków (CET/CEST)
        const dateKr = new Date();
        clockKrakow.textContent = dateKr.toLocaleTimeString('pl-PL', optionsTime);
        dateKrakow.textContent = dateKr.toLocaleDateString('pl-PL', optionsDate);

        // Nowy Jork (EST/EDT)
        const dateNy = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
        const nyTime = new Date(dateNy);
        
        clockNewYork.textContent = nyTime.toLocaleTimeString('en-US', optionsTime);
        dateNewYork.textContent = nyTime.toLocaleDateString('pl-PL', optionsDate);
    };

    // --- TEMAT I JĘZYK ---
    const updateToggleBtnText = () => { 
        const key = isTracking ? (isPaused ? 'resumeBtn' : 'pauseBtn') : 'startBtn';
        toggleBtn.textContent = translations[currentLang][key]; 
        toggleBtn.classList.toggle('paused', isTracking); 
        
        if (isTracking && isPaused) {
             toggleBtn.style.backgroundColor = 'var(--color-accent-orange)';
             toggleBtn.style.color = 'black';
        } else if (isTracking) {
             toggleBtn.style.backgroundColor = 'var(--color-accent-green)';
             toggleBtn.style.color = 'white';
        } else {
             toggleBtn.style.backgroundColor = 'var(--color-accent-green)';
             toggleBtn.style.color = 'white';
        }
    };
    
    const updateTextContent = () => {
        const lang = currentLang;
        document.querySelectorAll('[data-lang-key]').forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (translations[lang][key]) {
                if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                    element.setAttribute('placeholder', translations[lang][key]);
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        });
        updateToggleBtnText();
        loadTheme(); 
    };

    // Wymuszenie motywu Ciemnego
    const loadTheme = () => {
        localStorage.setItem('appTheme', 'dark');
        body.classList.remove('light-mode');
    };

    // =====================================================================
    // === LOGIKA TIMERA I PAUZY ===
    // =====================================================================

    const updateTimer = () => {
        const now = Date.now();
        elapsedTime = now - startTime;
        const formattedTime = formatTime(elapsedTime); // Pobranie sformatowanego czasu

        timerDisplay.textContent = formattedTime;
        timerDisplay.style.color = 'white';
        
        // Zawsze aktualizuj currentTask z inputa
        currentTask = taskNameInput.value.trim() || translations[currentLang].defaultTask;
        
        // AKTYWNE ZMIENIANIE TYTUŁU PRZEGLĄDARKI
        // Wyświetla: NAZWA_TASKU | 00:00:00
        document.title = `${currentTask} | ${formattedTime}`; 
    };

    const stopTracking = () => { // Pauza
        if (!timerInterval) return;

        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true; 
        
        timerDisplay.style.color = '#FF9800'; 
        stopBtn.style.display = 'inline-block'; 
        updateToggleBtnText(); 
    };

    const startTracking = () => { // Start/Wznów
        isTracking = true;
        isPaused = false;

        if (elapsedTime === 0) {
             currentTask = taskNameInput.value.trim() || translations[currentLang].defaultTask;
        }

        startTime = Date.now() - elapsedTime; 
        timerInterval = setInterval(updateTimer, 1000);

        timerDisplay.style.color = 'white';
        stopBtn.style.display = 'inline-block';
        updateToggleBtnText(); 
    };

    const toggleTimer = () => {
        if (!isTracking) {
            startTracking();
        } else if (!isPaused) {
            stopTracking();
        } else {
            startTracking();
        }
    };
    
    const stopAndSave = () => { // Zakończ i zapisz (Czerwony przycisk)
        if (elapsedTime === 0 && !isTracking) { 
            return;
        }
        
        if (timerInterval) clearInterval(timerInterval);

        const finalTaskName = taskNameInput.value.trim() || currentTask || translations[currentLang].defaultTask; 

        updateTaskTime(finalTaskName, elapsedTime); 
        
        timerInterval = null;
        elapsedTime = 0; 
        isTracking = false;
        isPaused = false;
        currentTask = ''; 

        timerDisplay.textContent = '00:00:00';
        timerDisplay.style.color = 'white'; 
        taskNameInput.value = ''; 
        
        stopBtn.style.display = 'none'; 
        updateToggleBtnText(); 
        
        // POWRÓT DO NAZWY APLIKACJI
        document.title = APP_NAME_TITLE; // Zmiana na nową stałą
    };

    // =====================================================================
    // === LOGIKA PASKU BOCZNEGO ===
    // =====================================================================
    
    const updateTaskTime = (task, timeToTransferOrAdd) => {
        
        const totalTimeForTask = timeToTransferOrAdd;

        let existingItem = Array.from(todayList.children).find(li => 
            li.querySelector('.task-name-display').textContent === task
        );

        if (existingItem) {
            const currentMs = parseTimeToMs(existingItem.querySelector('.task-time-display').textContent);
            const newTime = currentMs + totalTimeForTask;
            existingItem.querySelector('.task-time-display').textContent = formatTime(newTime);
            
        } else {
            const li = createTaskItem(task, totalTimeForTask);
            todayList.appendChild(li);
        }
        
        if (timeToTransferOrAdd > 0) {
            dailyTotalTime += timeToTransferOrAdd;
            dailyTotalDisplay.textContent = formatTime(dailyTotalTime);
        }
        
        saveState();
    };
    
    const addTaskListeners = (li, task) => {
        // Double Click (Wznów) 
        li.ondblclick = () => {
            
            if (isTracking || isPaused) stopAndSave(); 
            
            const timeSpan = li.querySelector('.task-time-display');
            const taskTime = parseTimeToMs(timeSpan.textContent);
            const taskName = li.querySelector('.task-name-display').textContent;
            
            dailyTotalTime -= taskTime;
            dailyTotalDisplay.textContent = formatTime(dailyTotalTime);
            
            li.remove();
            saveState(); 

            taskNameInput.value = taskName;
            currentTask = taskName;
            elapsedTime = taskTime; 
            
            startTracking();
        };
        
        // Przycisk Usuń 
        li.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            const taskTime = parseTimeToMs(li.querySelector('.task-time-display').textContent);

            dailyTotalTime -= taskTime;
            if (dailyTotalTime < 0) dailyTotalTime = 0;
            dailyTotalDisplay.textContent = formatTime(dailyTotalTime);

            li.remove();
            saveState();
        });
    };

    const createTaskItem = (task, timeMs) => {
        const li = document.createElement('li');
        li.setAttribute('data-task-name', task);
        li.innerHTML = `
            <span class="task-name-display">${task}</span>
            <span class="task-time-display">${formatTime(timeMs)}</span>
            <div class="task-actions">
                <button class="action-btn remove-btn" title="Usuń">✖</button>
            </div>
        `;
        addTaskListeners(li, task);
        return li;
    };

    const loadState = () => {
        // Wymuszenie języka PL
        localStorage.setItem('appLanguage', 'pl'); 

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
            const taskNameSpan = li.querySelector('.task-name-display');
            
            const task = taskNameSpan 
                ? taskNameSpan.textContent
                : li.getAttribute('data-task-name');

            const time = li.querySelector('.task-time-display').textContent;
            dailyData[task] = parseTimeToMs(time);
        });
        localStorage.setItem('dailyTasks', JSON.stringify(dailyData));
    };

    const clearDailyTasks = () => {
        if (!confirm(translations[currentLang].clearBtnConfirm)) return;
        
        localStorage.removeItem('dailyTasks');
        dailyTotalTime = 0;
        dailyTotalDisplay.textContent = '00:00:00';
        todayList.innerHTML = '';
        
        if (isTracking || isPaused) stopAndSave();
        
        // Powrót do tytułu domyślnego
        document.title = APP_NAME_TITLE;
    };


    // =====================================================================
    // === OBSŁUGA ZDARZEŃ I INICJALIZACJA ===
    // =====================================================================
    toggleBtn.addEventListener('click', toggleTimer); 
    stopBtn.addEventListener('click', stopAndSave); 
    clearBtn.addEventListener('click', clearDailyTasks);
    
    // === Inicjalizacja ===
    loadState(); 
    updateTextContent(); 
    updateGlobalClocks(); 
    setInterval(updateGlobalClocks, 1000);
    
    // Ustawienie początkowego tytułu strony
    document.title = APP_NAME_TITLE;
});
