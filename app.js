// Calendar app for "Arquipélago da Nascente" - year 2016
(function(){
  'use strict';
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
  const side = document.querySelector('.side');
  const toggleSideBtn = document.getElementById('toggleSide');
  const fabBtn = document.getElementById('fab');
  const mobileSheet = document.getElementById('mobileEventsSheet');
  const listNewBtn = document.getElementById('listNewBtn');
  let mobileSheetHandler = null;

  // state
  let currentMonth = 1; // February (0-based will be converted)
  let currentYear = YEAR;
  let events = {}; // keyed by id
  let selectedDateISO = null;
  let editingId = null;
  // modal focus trap helpers
  let lastFocusedElement = null;
  let modalKeyHandler = null;

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
  function formatTime(t){
    if(!t) return '';
    // expect HH:MM
    try{
      const dt = new Date('1970-01-01T' + t);
      return dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    }catch(e){
      return t;
    }
  }
  function isSameISO(a,b){
    if(!a || !b) return false;
    try{
      // compare first 10 chars (yyyy-mm-dd)
      return String(a).slice(0,10) === String(b).slice(0,10);
    }catch(e){
      return a === b;
    }
  }
  // Cross-browser helpers
  // Object.values fallback for older browsers (IE11)
  function objValues(obj){
    if(Object.values) return Object.values(obj);
    var ks = Object.keys(obj||{}), res = [];
    for(var i=0;i<ks.length;i++) res.push(obj[ks[i]]);
    return res;
  }
  // Element.closest() fallback
  function closest(el, selector){
    if(!el) return null;
    var matches = (el.matches || el.msMatchesSelector || el.webkitMatchesSelector);
    while(el && el !== document){
      if(el.nodeType === 1 && matches && matches.call(el, selector)) return el;
      el = el.parentElement;
    }
    return null;
  }
  // passive event listener feature detect
  var supportsPassive = false;
  try{
    var opts = Object.defineProperty({}, 'passive', { get: function(){ supportsPassive = true; } });
    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
  }catch(e){}
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
    if(selectedDateISO === dateISO) el.classList.add('selected');

    // make day cell accessible/focusable
    el.tabIndex = 0;
    el.setAttribute('role','button');

    const num = document.createElement('div');
    num.className = 'dateNum';
    num.textContent = dateObj.getDate();
    el.appendChild(num);

    // dots
    const dotWrap = document.createElement('div');
    dotWrap.className = 'event-dot';
    el.appendChild(dotWrap);

  const dayEvents = objValues(events).filter(function(e){ return isSameISO(e.date, dateISO); });
    dayEvents.slice(0,5).forEach(ev => {
      const dot = document.createElement('div');
      dot.className = 'dot ' + (ev.type === 'exam' ? 'exam' : (ev.type === 'holiday' ? 'holiday' : 'event'));
      dot.title = `${ev.title} ${ev.time?(' - '+ev.time):''}`;
      dotWrap.appendChild(dot);
    });

    // aria label with count of events
    el.setAttribute('aria-label', `${dateISO} — ${dayEvents.length} evento${dayEvents.length===1?'':'s'}`);

    // single click selects the date (shows events). double-click opens modal (desktop).
    el.addEventListener('click', ()=> selectDate(dateISO));
    el.addEventListener('dblclick', ()=> openModalForDate(dateISO));
    // keyboard activation (Enter/Space)
    el.addEventListener('keydown', (ev) => {
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        selectDate(dateISO);
      }
    });
    // long-press for mobile to open modal
    let pressTimer = null;
    const pressHold = 600; // ms
    function startPress(e){
      // ignore non-primary mouse buttons
      if(e.type === 'mousedown' && e.button !== 0) return;
      pressTimer = setTimeout(()=>{ openModalForDate(dateISO); }, pressHold);
    }
    function cancelPress(){ if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; } }
    try{
      el.addEventListener('touchstart', startPress, supportsPassive ? {passive:true} : false);
    }catch(e){
      // fallback for very old browsers
      el.addEventListener('touchstart', startPress);
    }
    el.addEventListener('touchmove', cancelPress);
    el.addEventListener('touchend', cancelPress);
    el.addEventListener('touchcancel', cancelPress);
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', cancelPress);
    el.addEventListener('mouseleave', cancelPress);
    return el;
  }

  // select a date (do not immediately open modal)
  // Always show the desktop side panel and render its events list.
  // This makes mobile behave the same as desktop (side panel visible, no bottom sheet).
  function selectDate(dateISO){
    selectedDateISO = dateISO;
    // ensure side panel is visible
    if(side && side.classList.contains('collapsed')){
      side.classList.remove('collapsed');
      if(toggleSideBtn) toggleSideBtn.textContent = '✕';
    }
    // render the events list into the side panel
    renderEventsListForDate(dateISO);
    // re-render calendar to update selected state
    renderCalendar();
  }

  function renderMobileEventsSheet(dateISO){
    if(!mobileSheet) return;
  const list = objValues(events).filter(function(e){ return isSameISO(e.date, dateISO); }).sort(function(a,b){ return (a.time||'') > (b.time||'') ? 1 : -1; });
    // friendly header (weekday, day month)
    let headerDate = dateISO;
    try{
      const d = new Date(dateISO + 'T00:00:00');
      headerDate = d.toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'short'});
    }catch(e){}
  let html = `<div class="sheet-header"><strong>${headerDate}</strong><div><button type="button" class="close-sheet" aria-label="Fechar">✕</button><button type="button" id="sheetNew" class="primary" style="margin-left:8px">+ Novo</button></div></div>`;
    if(list.length===0){
      html += `<div style="color:var(--muted);">Sem eventos nesta data.</div>`;
    } else {
      html += '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">';
      list.forEach(ev => {
        const t = ev.time ? formatTime(ev.time) : '';
        html += `<li class="event-item" data-id="${ev.id}"><div class="title">${ev.title}</div><div class="meta">${t?(' • '+t):''} • ${ev.type}</div><div class="meta">${ev.desc||''}</div></li>`;
      });
      html += '</ul>';
    }
    mobileSheet.innerHTML = html;
    // animated open: show and add open class
    mobileSheet.classList.remove('hidden');
    // force reflow then open
    void mobileSheet.offsetWidth;
    mobileSheet.classList.add('open');

    // attach delegated listener on mobileSheet (remove previous if any)
    if(mobileSheetHandler) mobileSheet.removeEventListener('click', mobileSheetHandler);
    mobileSheetHandler = function(e){
      var close = closest(e.target, '.close-sheet');
      if(close){
        mobileSheet.classList.remove('open');
        (function(){
          var onEnd = function(){ mobileSheet.classList.add('hidden'); mobileSheet.removeEventListener('transitionend', onEnd); };
          mobileSheet.addEventListener('transitionend', onEnd);
        })();
        return;
      }
      var newBtn = closest(e.target, '#sheetNew');
      if(newBtn){
        mobileSheet.classList.remove('open');
        (function(){
          var onEnd2 = function(){ mobileSheet.classList.add('hidden'); mobileSheet.removeEventListener('transitionend', onEnd2); openModalForDate(dateISO); };
          mobileSheet.addEventListener('transitionend', onEnd2);
        })();
        return;
      }
      var item = closest(e.target, '.event-item');
      if(item){
        openEditEvent(item.getAttribute('data-id'));
        return;
      }
    };
    mobileSheet.addEventListener('click', mobileSheetHandler);
  }

  // header list +Novo button (desktop) — open modal for selected date
  if(listNewBtn){
    listNewBtn.addEventListener('click', ()=>{
      const date = selectedDateISO || formatDateISO(new Date(currentYear,currentMonth,1));
      openModalForDate(date);
    });
  }

  // Floating Action Button (mobile) — open new event for selected date
  if(fabBtn){
    fabBtn.addEventListener('click', ()=>{
      const date = selectedDateISO || formatDateISO(new Date());
      if(mobileSheet && mobileSheet.classList.contains('open')){
        mobileSheet.classList.remove('open');
  (function(){ var onEnd3 = function(){ mobileSheet.classList.add('hidden'); mobileSheet.removeEventListener('transitionend', onEnd3); }; mobileSheet.addEventListener('transitionend', onEnd3); })();
      }
      openModalForDate(date);
    });
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
    // hide mobile sheet if open (animated)
    if(mobileSheet && mobileSheet.classList.contains('open')){
      mobileSheet.classList.remove('open');
  (function(){ var onEnd4 = function(){ mobileSheet.classList.add('hidden'); mobileSheet.removeEventListener('transitionend', onEnd4); }; mobileSheet.addEventListener('transitionend', onEnd4); })();
    }
    // setup focus trap
    lastFocusedElement = document.activeElement;
    const focusable = modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const focusables = Array.prototype.slice.call(focusable).filter(el=> !el.disabled && el.offsetParent !== null);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length-1];
    modalKeyHandler = function(e){
      if(e.key === 'Tab'){
        if(focusables.length === 0){ e.preventDefault(); return; }
        if(e.shiftKey){ // backward
          if(document.activeElement === firstFocusable){
            e.preventDefault(); lastFocusable.focus();
          }
        } else { // forward
          if(document.activeElement === lastFocusable){
            e.preventDefault(); firstFocusable.focus();
          }
        }
      } else if(e.key === 'Escape'){
        closeModalFn();
      }
    };
    document.addEventListener('keydown', modalKeyHandler);
    // focus first field
    evtTitle.focus();
    renderEventsListForDate(dateISO);
  }

  function closeModalFn(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    editingId = null;
    if(modalKeyHandler) document.removeEventListener('keydown', modalKeyHandler);
    if(lastFocusedElement) lastFocusedElement.focus();
  }
  if(closeModal) closeModal.addEventListener('click', closeModalFn);
  if(newEventBtn) newEventBtn.addEventListener('click', function(){ openModalForDate(formatDateISO(new Date(currentYear,currentMonth,1))); });

  // toggle side panel (mobile)
  if(toggleSideBtn){
    toggleSideBtn.addEventListener('click', ()=>{
      if(!side) return;
      side.classList.toggle('collapsed');
      toggleSideBtn.textContent = side.classList.contains('collapsed') ? '☰' : '✕';
    });
  }

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
      var prev = events[editingId] || {};
      var merged = {};
      for(var kk in prev) if(Object.prototype.hasOwnProperty.call(prev,kk)) merged[kk]=prev[kk];
      merged.title = title;
      merged.date = date;
      merged.time = time;
      merged.desc = desc;
      merged.type = type;
      events[editingId] = merged;
    } else {
      var id = uid();
      events[id] = {id: id, title: title, date: date, time: time, desc: desc, type: type};
    }
    saveEvents();
    renderCalendar();
    renderEventsListForDate(date);
    closeModalFn();
    // hide mobile sheet after saving (animate) on mobile
    if(mobileSheet && window.innerWidth <= 600){
      if(mobileSheet.classList.contains('open')){
        mobileSheet.classList.remove('open');
  (function(){ var onEnd5 = function(){ mobileSheet.classList.add('hidden'); mobileSheet.removeEventListener('transitionend', onEnd5); }; mobileSheet.addEventListener('transitionend', onEnd5); })();
      } else {
        mobileSheet.classList.add('hidden');
      }
    }
  });

  // render events sidebar for given date
  function renderEventsListForDate(dateISO){
    eventsList.innerHTML = '';
  var list = objValues(events).filter(function(e){ return isSameISO(e.date, dateISO); }).sort(function(a,b){ return (a.time||'') > (b.time||'') ? 1 : -1; });
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
      const t = ev.time ? formatTime(ev.time) : '';
      li.innerHTML = `<div class="title">${ev.title}</div>
                      <div class="meta">${t?(' • '+t):''} • ${ev.type}</div>
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
    // hide mobile sheet if open
    if(mobileSheet && mobileSheet.classList.contains('open')){
      mobileSheet.classList.remove('open');
      mobileSheet.addEventListener('transitionend', ()=> mobileSheet.classList.add('hidden'), {once:true});
    }
    // setup focus trap for edit modal
    lastFocusedElement = document.activeElement;
    const focusable = modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    const focusables = Array.prototype.slice.call(focusable).filter(el=> !el.disabled && el.offsetParent !== null);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length-1];
    modalKeyHandler = function(e){
      if(e.key === 'Tab'){
        if(focusables.length === 0){ e.preventDefault(); return; }
        if(e.shiftKey){ // backward
          if(document.activeElement === firstFocusable){
            e.preventDefault(); lastFocusable.focus();
          }
        } else { // forward
          if(document.activeElement === lastFocusable){
            e.preventDefault(); firstFocusable.focus();
          }
        }
      } else if(e.key === 'Escape'){
        closeModalFn();
      }
    };
    document.addEventListener('keydown', modalKeyHandler);
    evtTitle.focus();
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
  if(prevBtn) prevBtn.addEventListener('click', function(){
    currentMonth--;
    if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    // keep selection within the shown month (use first day if needed)
    selectedDateISO = formatDateISO(new Date(currentYear,currentMonth,1));
    renderCalendar();
    renderEventsListForDate(selectedDateISO);
  });
  if(nextBtn) nextBtn.addEventListener('click', function(){
    currentMonth++;
    if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    selectedDateISO = formatDateISO(new Date(currentYear,currentMonth,1));
    renderCalendar();
    renderEventsListForDate(selectedDateISO);
  });

  // export/import
  if(exportBtn) exportBtn.addEventListener('click', function(){
    var blob = new Blob([JSON.stringify(events,null,2)], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'nascente-events-2016.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  if(importBtn) importBtn.addEventListener('click', function(){ if(importFile) importFile.click(); });
  if(importFile) importFile.addEventListener('change', function(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        const incoming = {};
        // support array or object
        if(Array.isArray(parsed)){
          for(var i=0;i<parsed.length;i++){
            var item = parsed[i];
            if(!item || !item.title || !item.date) throw new Error('Formato inválido');
            var id = item.id || uid();
            // shallow copy
            var copy = {};
            for(var k in item) if(Object.prototype.hasOwnProperty.call(item,k)) copy[k]=item[k];
            copy.id = id;
            incoming[id] = copy;
          }
        } else if(parsed && typeof parsed === 'object'){
          // if object has keys like id->{...} or is map
          var vals = objValues(parsed);
          if(vals.length && vals[0] && vals[0].title && vals[0].date){
            for(var j=0;j<vals.length;j++){
              var item2 = vals[j];
              var id2 = item2.id || uid();
              var copy2 = {};
              for(var kk in item2) if(Object.prototype.hasOwnProperty.call(item2,kk)) copy2[kk]=item2[kk];
              copy2.id = id2;
              incoming[id2] = copy2;
            }
          } else {
            throw new Error('Formato inválido');
          }
        } else throw new Error('Formato inválido');

        // merge
        Object.keys(incoming).forEach(k => events[k] = incoming[k]);
        saveEvents();
        renderCalendar();
        alert('Importação concluída.');
      }catch(err){
        console.error(err);
        alert('Arquivo inválido. Use o export padrão ou verifique o formato.');
      }
    };
    reader.readAsText(f);
    importFile.value = '';
  });

  // initial prepopulate: add first-day-of-classes if not present
  function ensureInitial(){
    loadEvents();
    const firstClassDate = '2016-02-10';
  var exists = objValues(events).some(function(e){ return e.date === firstClassDate && (e.title || '').toLowerCase().indexOf('aulas') !== -1; });
    if(!exists){
      var id = uid();
      events[id] = {id: id, title: 'Início das aulas (1º ano)', date: firstClassDate, time: '07:00', desc: 'Primeiro dia do ano letivo na Kurohana — aulas em período integral', type: 'event'};
      saveEvents();
    }
  }

  // clicking outside modal closes it
  if(modal) modal.addEventListener('click', function(ev){ if(ev.target === modal) closeModalFn(); });

  // start
  ensureInitial();
  renderCalendar();
  // initial selection: first day of current shown month
  selectedDateISO = formatDateISO(new Date(currentYear,currentMonth,1));
  renderEventsListForDate(selectedDateISO);
})();
