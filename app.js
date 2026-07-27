// Calendario oficial do Arquipelago da Nascente
(function(){
  'use strict';
  const YEAR = new Date().getFullYear();
  const EVENTS_KEY = 'nascente-calendar-official-' + YEAR;
  const SEED_VERSION_KEY = 'nascente-official-seed-v2-' + YEAR;

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
  let currentMonth = 0;
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

  function nthWeekdayOfMonth(year, monthIndex, weekday, nth){
    const first = new Date(year, monthIndex, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIndex, 1 + offset + (nth - 1) * 7);
  }

  function lastWeekStartOfMonth(year, monthIndex){
    const lastDay = new Date(year, monthIndex + 1, 0);
    const day = lastDay.getDate();
    return new Date(year, monthIndex, Math.max(1, day - 6));
  }

  function firstWeekStartOfMonth(year, monthIndex){
    return new Date(year, monthIndex, 1);
  }

  function secondWeekStartOfMonth(year, monthIndex){
    return new Date(year, monthIndex, 8);
  }

  function thirdWeekStartOfMonth(year, monthIndex){
    return new Date(year, monthIndex, 15);
  }

  function endOfMonthMarker(year, monthIndex){
    const last = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.max(1, last - 2));
  }

  // init: start with January of the selected year
  (function initState(){
    currentMonth = 0;
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
    a.download = 'nascente-events-' + YEAR + '.json';
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

  // seed official yearly calendar once per year key
  function ensureInitial(){
    loadEvents();
    var alreadySeeded = localStorage.getItem(SEED_VERSION_KEY) === '1';
    if(alreadySeeded) return;

    var changed = false;

    function hasEventExact(title, date){
      var normalizedTitle = String(title || '').trim().toLowerCase();
      return objValues(events).some(function(e){
        return e.date === date && String(e.title || '').trim().toLowerCase() === normalizedTitle;
      });
    }

    function addOfficialEvent(title, dateObj, type, desc){
      var dateISO = typeof dateObj === 'string' ? dateObj : formatDateISO(dateObj);
      if(hasEventExact(title, dateISO)) return;
      var id = uid();
      events[id] = {
        id: id,
        title: title,
        date: dateISO,
        time: '',
        desc: desc || '',
        type: type || 'event'
      };
      changed = true;
    }

    function addMonthDay(title, monthIndex, day, type, desc){
      addOfficialEvent(title, new Date(YEAR, monthIndex, day), type, desc);
    }

    // Janeiro
    addMonthDay('Ano Novo da Nascente (Shinnenkai / Reveillon)', 0, 1, 'holiday', 'Maior celebracao familiar do ano, com a Primeira Luz da Nascente ao amanhecer.');
    addOfficialEvent('Semana dos Antepassados', secondWeekStartOfMonth(YEAR, 0), 'event', 'Marco de inicio da segunda semana de janeiro.');
    addOfficialEvent('Dia dos Novos Adultos', nthWeekdayOfMonth(YEAR, 0, 1, 2), 'event', 'Segunda segunda-feira de janeiro. Cerimonia para jovens de 18 anos.');
    addOfficialEvent('Festival das Lanternas do Mar', lastWeekStartOfMonth(YEAR, 0), 'event', 'Homenagem em Sumirejima durante a ultima semana de janeiro.');

    // Fevereiro
    addMonthDay('Setsubun da Nascente', 1, 3, 'event', 'Festival japones adaptado com rituais de protecao em todas as ilhas.');
    addMonthDay('Cerimonia de Abertura Escolar (Kurohana)', 1, 10, 'event', 'Inicio oficial do ano escolar da Academia Kurohana.');
    addOfficialEvent('Primeira Semana de Provas', endOfMonthMarker(YEAR, 1), 'exam', 'Periodo de avaliacoes no final de fevereiro.');
    addOfficialEvent('Carnaval da Nascente', new Date(YEAR, 1, 28), 'event', 'Blocos das quatro ilhas e festividades em Botan no final de fevereiro.');

    // Marco
    addOfficialEvent('Semana dos Clubes', firstWeekStartOfMonth(YEAR, 2), 'event', 'Apresentacoes e entrada de novos membros nos clubes da Kurohana.');
    addOfficialEvent('Festival Cultural das Quatro Ilhas', secondWeekStartOfMonth(YEAR, 2), 'event', 'Representacoes de culinaria, historia, musica e artes.');
    addMonthDay('Festival da Primavera da Nascente', 2, 21, 'event', 'Hanami com piqueniques nos parques de Hanashima.');
    addOfficialEvent('Semana da Comunidade', lastWeekStartOfMonth(YEAR, 2), 'event', 'Atividades comunitarias em todas as ilhas.');

    // Abril
    addMonthDay('Fundacao do Arquipelago da Nascente', 3, 12, 'holiday', 'Data oficial da criacao da Nascente moderna.');
    addOfficialEvent('Festival das Flores', secondWeekStartOfMonth(YEAR, 3), 'event', 'Celebracoes florais em Hanashima na segunda semana de abril.');
    addOfficialEvent('Feira de Artes da Nascente', endOfMonthMarker(YEAR, 3), 'event', 'Evento de pintura, literatura, musica e artesanato no final de abril.');

    // Maio
    addMonthDay('Dia do Trabalho da Nascente', 4, 1, 'holiday', 'Homenagem aos trabalhadores em todas as ilhas.');
    addOfficialEvent('Dia das Familias', nthWeekdayOfMonth(YEAR, 4, 0, 2), 'holiday', 'Segundo domingo de maio.');
    addOfficialEvent('Feira Cultural da Kurohana', thirdWeekStartOfMonth(YEAR, 4), 'event', 'Grande evento escolar na terceira semana de maio.');

    // Junho
    addOfficialEvent('Festa Junina da Nascente (mes inteiro)', firstWeekStartOfMonth(YEAR, 5), 'event', 'Celebracao que acontece durante todo junho em todas as ilhas.');
    addMonthDay('Tanabata da Nascente', 5, 7, 'event', 'Desejos em papeis coloridos pendurados em arvores.');
    addMonthDay('Festival das Mares', 5, 21, 'event', 'Celebracao da relacao com o oceano em Sumirejima.');

    // Julho
    addMonthDay('Festival das Estrelas', 6, 7, 'event', 'Festival noturno com lanternas e apresentacoes em Botan.');
    addOfficialEvent('Festival de Verao da Nascente', endOfMonthMarker(YEAR, 6), 'event', 'Maior festival de verao no final de julho.');
    addOfficialEvent('Inicio das Ferias de Verao', lastWeekStartOfMonth(YEAR, 6), 'holiday', 'Inicio da pausa escolar na ultima semana de julho.');

    // Agosto
    addMonthDay('Obon da Nascente', 7, 15, 'holiday', 'Homenagem aos mortos com memoria familiar em todas as ilhas.');
    addOfficialEvent('Festival das Aguas', thirdWeekStartOfMonth(YEAR, 7), 'event', 'Barcos iluminados cruzam a costa de Sumirejima.');
    addOfficialEvent('Retorno das Aulas', endOfMonthMarker(YEAR, 7), 'event', 'Retorno da Kurohana apos as ferias.');

    // Setembro
    addOfficialEvent('Campeonato das Quatro Ilhas', firstWeekStartOfMonth(YEAR, 8), 'event', 'Competicao escolar com baseball, arco, artes marciais e atletismo.');
    addOfficialEvent('Dia do Respeito aos Anciaos', nthWeekdayOfMonth(YEAR, 8, 1, 2), 'holiday', 'Segunda segunda-feira de setembro.');

    // Outubro
    addOfficialEvent('Semana da Historia da Nascente', firstWeekStartOfMonth(YEAR, 9), 'event', 'Exposicoes historicas e apresentacoes em Fujiwara.');
    addMonthDay('Festival das Mascaras da Nascente', 9, 31, 'event', 'Mistura de Halloween com mascaras tradicionais japonesas.');

    // Novembro
    addMonthDay('Dia da Cultura', 10, 3, 'holiday', 'Eventos artisticos e culturais em Hanashima.');
    addMonthDay('Dia da Gratidao pelo Trabalho', 10, 23, 'holiday', 'Homenagem aos profissionais da comunidade.');
    addOfficialEvent('Festival das Quatro Cozinhas', lastWeekStartOfMonth(YEAR, 10), 'event', 'Festival gastronomico em Fujiwara na ultima semana de novembro.');

    // Dezembro
    addMonthDay('Dia da Tragedia da Virada', 11, 4, 'holiday', 'Dia oficial de memoria com homenagens nas escolas.');
    addOfficialEvent('Provas Finais (Kurohana)', secondWeekStartOfMonth(YEAR, 11), 'exam', 'Inicio da segunda semana de dezembro.');
    addOfficialEvent('Cerimonia de Formatura', thirdWeekStartOfMonth(YEAR, 11), 'event', 'Encerramento do ano escolar em Hanashima.');
    addMonthDay('Natal da Nascente (24 e 25)', 11, 24, 'holiday', 'Ceias, presentes e encontros familiares em todas as ilhas.');
    addMonthDay('Natal da Nascente (24 e 25)', 11, 25, 'holiday', 'Ceias, presentes e encontros familiares em todas as ilhas.');
    addMonthDay('Noite da Passagem', 11, 31, 'holiday', 'Encerramento do ano com fogos sobre o oceano.');

    if(changed) saveEvents();
    localStorage.setItem(SEED_VERSION_KEY, '1');
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
