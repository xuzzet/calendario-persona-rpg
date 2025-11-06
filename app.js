// Calendar app for "Arquipélago da Nascente" - year 2016
(() => {
  const EVENTS_KEY = 'nascente-calendar-2016';
  const YEAR = 2016;

  // DOM
  const calendarGrid = document.getElementById('calendarGrid');
  const monthLabel = document.getElementById('monthLabel');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const newEventBtn = document.getElementById('newEventBtn');
  const modal = document.getElementById('modal');
  const closeModal = document.getElementById('closeModal');
  const eventForm = document.getElementById('eventForm');
  const evtTitle = document.getElementById('evtTitle');
  const evtDate = document.getElementById('evtDate');
  const evtTime = document.getElementById('evtTime');
  const evtDesc = document.getElementById('evtDesc');
  const evtType = document.getElementById('evtType');
  const eventsList = document.getElementById('eventsList');
  const deleteEventBtn = document.getElementById('deleteEventBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFile = document.getElementById('importFile');

  // state
  let currentMonth = 1; // February (0-based will be converted)
  let currentYear = YEAR;
  let events = {}; // keyed by id
  let selectedDateISO = null;
  let editingId = null;

  // helpers
  function loadEvents(){
    try{
      const raw = localStorage.getItem(EVENTS_KEY);
      events = raw ? JSON.parse(raw) : {};
    }catch(e){ events = {}; }
  }
  function saveEvents(){
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }
  function uid(){ return 'evt_' + Date.now() + '_' + Math.floor(Math.random()*1000); }
  function formatDateISO(d){ // yyyy-mm-dd
    const y=d.getFullYear(), m=d.getMonth()+1, day=d.getDate();
    return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function displayMonthLabel(m, y){
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    monthLabel.textContent = `${months[m]} ${y}`;
  }

  // init: start with February 2016 display
  (function initState(){
    currentMonth = 1; // February (0-indexed)
    currentYear = YEAR;
  })();

  // Render calendar for currentMonth/currentYear
  function renderCalendar(){
    calendarGrid.innerHTML = '';
    displayMonthLabel(currentMonth, currentYear);

    // first day of month weekday
    const first = new Date(currentYear, currentMonth, 1);
    const startWeekday = first.getDay(); // 0..6 (Sun..Sat)

    // days in month
    const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
    // days in prev month to fill
    const prevDays = startWeekday;

    // show previous month's tail
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for(let i = prevMonthDays - prevDays + 1; i <= prevMonthDays; i++){
      const cell = makeDayCell(new Date(currentYear, currentMonth-1, i), true);
      calendarGrid.appendChild(cell);
    }
    // current month days
    for(let d=1; d<=daysInMonth; d++){
      const cell = makeDayCell(new Date(currentYear, currentMonth, d), false);
      calendarGrid.appendChild(cell);
    }
    // fill next month tail to complete weeks (total cells %7==0)
    const totalCells = prevDays + daysInMonth;
    const remain = (7 - (totalCells % 7)) % 7;
    for(let i=1;i<=remain;i++){
      const cell = makeDayCell(new Date(currentYear, currentMonth+1, i), true);
      calendarGrid.appendChild(cell);
    }
  }

  function makeDayCell(dateObj, isOff){
    const dateISO = formatDateISO(dateObj);
    const el = document.createElement('div');
    el.className = 'day';
    if (isOff) el.classList.add('off');

    const num = document.createElement('div');
    num.className = 'dateNum';
    num.textContent = dateObj.getDate();
    el.appendChild(num);

    // dots
    const dotWrap = document.createElement('div');
    dotWrap.className = 'event-dot';
    el.appendChild(dotWrap);

    const dayEvents = Object.values(events).filter(e => e.date === dateISO);
    dayEvents.slice(0,5).forEach(ev => {
      const dot = document.createElement('div');
      dot.className = 'dot ' + (ev.type === 'exam' ? 'exam' : (ev.type === 'holiday' ? 'holiday' : 'event'));
      dot.title = `${ev.title} ${ev.time?(' - '+ev.time):''}`;
      dotWrap.appendChild(dot);
    });

    el.addEventListener('click', ()=> openModalForDate(dateISO));
    return el;
  }

  // open modal
  function openModalForDate(dateISO){
    selectedDateISO = dateISO;
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Novo evento';
    deleteEventBtn.classList.add('hidden');

    evtDate.value = dateISO;
    evtTitle.value = '';
    evtTime.value = '';
    evtDesc.value = '';
    evtType.value = 'event';

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    evtTitle.focus();
    renderEventsListForDate(dateISO);
  }

  function closeModalFn(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    editingId = null;
  }
  closeModal.addEventListener('click', closeModalFn);
  newEventBtn.addEventListener('click', ()=> openModalForDate(formatDateISO(new Date(currentYear,currentMonth,1))));

  // submit form
  eventForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const title = evtTitle.value.trim();
    const date = evtDate.value;
    if(!title || !date) return alert('Título e data são obrigatórios.');
    const time = evtTime.value || '';
    const desc = evtDesc.value || '';
    const type = evtType.value;

    if(editingId){
      events[editingId] = {...events[editingId], title, date, time, desc, type};
    } else {
      const id = uid();
      events[id] = {id, title, date, time, desc, type};
    }
    saveEvents();
    renderCalendar();
    renderEventsListForDate(date);
    closeModalFn();
  });

  // render events sidebar for given date
  function renderEventsListForDate(dateISO){
    eventsList.innerHTML = '';
    const list = Object.values(events).filter(e => e.date === dateISO).sort((a,b)=> (a.time||'') > (b.time||'') ? 1:-1);
    if(list.length===0){
      const li = document.createElement('li');
      li.textContent = 'Sem eventos nesta data.';
      li.style.color = 'var(--muted)';
      eventsList.appendChild(li);
      return;
    }
    list.forEach(ev => {
      const li = document.createElement('li');
      li.className = 'event-item';
      li.innerHTML = `<div class="title">${ev.title}</div>
                      <div class="meta">${ev.date} ${ev.time?(' • '+ev.time):''} • ${ev.type}</div>
                      <div class="meta">${ev.desc || ''}</div>`;
      li.addEventListener('click', ()=> openEditEvent(ev.id));
      eventsList.appendChild(li);
    });
  }

  function openEditEvent(id){
    const ev = events[id];
    if(!ev) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Editar evento';
    deleteEventBtn.classList.remove('hidden');

    evtType.value = ev.type;
    evtTitle.value = ev.title;
    evtDate.value = ev.date;
    evtTime.value = ev.time || '';
    evtDesc.value = ev.desc || '';

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
  }

  deleteEventBtn.addEventListener('click', () => {
    if(!editingId) return;
    if(!confirm('Excluir este evento?')) return;
    delete events[editingId];
    saveEvents();
    renderCalendar();
    renderEventsListForDate(evtDate.value);
    closeModalFn();
  });

  // navigation
  prevBtn.addEventListener('click', ()=> {
    currentMonth--;
    if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  nextBtn.addEventListener('click', ()=> {
    currentMonth++;
    if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  // export/import
  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(events,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nascente-events-2016.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        // merge - keep existing
        Object.keys(parsed).forEach(k => events[k] = parsed[k]);
        saveEvents();
        renderCalendar();
        alert('Importação concluída.');
      }catch(err){
        alert('Arquivo inválido.');
      }
    };
    reader.readAsText(f);
    importFile.value = '';
  });

  // initial prepopulate: add first-day-of-classes if not present
  function ensureInitial(){
    loadEvents();
    const firstClassDate = '2016-02-10';
    const exists = Object.values(events).some(e => e.date === firstClassDate && e.title.toLowerCase().includes('aulas'));
    if(!exists){
      const id = uid();
      events[id] = {id, title: 'Início das aulas (1º ano)', date: firstClassDate, time: '07:00', desc: 'Primeiro dia do ano letivo na Kurohana — aulas em período integral', type: 'event'};
      saveEvents();
    }
  }

  // clicking outside modal closes it
  modal.addEventListener('click', (ev) => {
    if(ev.target === modal) closeModalFn();
  });

  // start
  ensureInitial();
  loadEvents();
  renderCalendar();
  // render events for default shown date
  renderEventsListForDate(formatDateISO(new Date(currentYear,currentMonth,1)));
})();
