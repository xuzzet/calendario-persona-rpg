(function () {
  "use strict";

  const YEAR = 2016;
  const EVENTS_KEY = "nascente-calendar-official-" + YEAR;
  const SEED_VERSION_KEY = "nascente-official-seed-v3-" + YEAR;

  const MONTHS = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dom = {
    calendarGrid: document.getElementById("calendarGrid"),
    monthLabel: document.getElementById("monthLabel"),
    prevMonth: document.getElementById("prevMonth"),
    nextMonth: document.getElementById("nextMonth"),
    todayBtn: document.getElementById("todayBtn"),
    monthView: document.getElementById("monthView"),
    timelineView: document.getElementById("timelineView"),
    monthViewBtn: document.getElementById("monthViewBtn"),
    timelineViewBtn: document.getElementById("timelineViewBtn"),
    filtersPanel: document.getElementById("filtersPanel"),
    toggleFilters: document.getElementById("toggleFilters"),
    filterCategory: document.getElementById("filterCategory"),
    filterIsland: document.getElementById("filterIsland"),
    filterType: document.getElementById("filterType"),
    upcomingAlert: document.getElementById("upcomingAlert"),
    eventsList: document.getElementById("eventsList"),
    newEventBtn: document.getElementById("newEventBtn"),
    listNewBtn: document.getElementById("listNewBtn"),
    exportBtn: document.getElementById("exportBtn"),
    exportMdBtn: document.getElementById("exportMdBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    modal: document.getElementById("modal"),
    modalTitle: document.getElementById("modalTitle"),
    closeModal: document.getElementById("closeModal"),
    eventForm: document.getElementById("eventForm"),
    deleteEventBtn: document.getElementById("deleteEventBtn"),
    evtType: document.getElementById("evtType"),
    evtCategory: document.getElementById("evtCategory"),
    evtIsland: document.getElementById("evtIsland"),
    evtTitle: document.getElementById("evtTitle"),
    evtStartDate: document.getElementById("evtStartDate"),
    evtEndDate: document.getElementById("evtEndDate"),
    evtTime: document.getElementById("evtTime"),
    evtRule: document.getElementById("evtRule"),
    evtDesc: document.getElementById("evtDesc"),
    evtNpcs: document.getElementById("evtNpcs"),
    evtHook: document.getElementById("evtHook"),
    evtConsequence: document.getElementById("evtConsequence"),
    evtStatus: document.getElementById("evtStatus"),
    evtLore: document.getElementById("evtLore")
  };

  const state = {
    currentMonth: 0,
    selectedDateISO: toISO(new Date(YEAR, 0, 1)),
    editingId: null,
    viewMode: "month",
    filters: {
      category: "all",
      island: "all",
      type: "all"
    },
    events: {}
  };

  function uid() {
    return "evt_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  }

  function toISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function fromISO(iso) {
    const parts = String(iso).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function formatDate(iso) {
    return fromISO(iso).toLocaleDateString("pt-BR");
  }

  function normalizeISOToYear(iso, year) {
    if (!iso) return toISO(new Date(year, 0, 1));
    const d = fromISO(iso);
    d.setFullYear(year);
    return toISO(d);
  }

  function formatMonthLabel(monthIndex) {
    dom.monthLabel.textContent = MONTHS[monthIndex] + " " + YEAR;
  }

  function rangesOverlap(startA, endA, startB, endB) {
    return startA <= endB && endA >= startB;
  }

  function eventSpansDate(evt, dateISO) {
    return evt.startDate <= dateISO && evt.endDate >= dateISO;
  }

  function compareEvents(a, b) {
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if ((a.time || "") !== (b.time || "")) return (a.time || "").localeCompare(b.time || "");
    return (a.title || "").localeCompare(b.title || "");
  }

  function passesFilters(evt) {
    if (state.filters.category !== "all" && evt.category !== state.filters.category) return false;
    if (state.filters.type !== "all" && evt.type !== state.filters.type) return false;
    if (state.filters.island !== "all" && evt.island !== state.filters.island) return false;
    return true;
  }

  function getAllEvents() {
    return Object.keys(state.events).map((k) => state.events[k]);
  }

  function getFilteredEvents() {
    return getAllEvents().filter(passesFilters);
  }

  function eventsForDate(dateISO) {
    return getFilteredEvents().filter((evt) => eventSpansDate(evt, dateISO)).sort(compareEvents);
  }

  function monthRange(monthIndex) {
    const start = toISO(new Date(YEAR, monthIndex, 1));
    const end = toISO(new Date(YEAR, monthIndex + 1, 0));
    return { start, end };
  }

  function ensureEventShape(evt) {
    const startDateRaw = evt.startDate || evt.date;
    const endDateRaw = evt.endDate || evt.date || startDateRaw;
    const startDate = normalizeISOToYear(startDateRaw, YEAR);
    const endDate = normalizeISOToYear(endDateRaw, YEAR);
    return {
      id: evt.id || uid(),
      title: evt.title || "Sem titulo",
      type: evt.type || "event",
      category: evt.category || "civil",
      island: evt.island || "Todas as ilhas",
      startDate,
      endDate,
      date: startDate,
      time: evt.time || "",
      desc: evt.desc || "",
      rule: evt.rule || "",
      lore: Boolean(evt.lore),
      npcs: evt.npcs || "",
      hook: evt.hook || "",
      consequence: evt.consequence || "",
      status: evt.status || "planejado"
    };
  }

  function saveEvents() {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(state.events));
  }

  function loadEvents() {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const normalized = {};
      Object.keys(parsed).forEach((id) => {
        const evt = ensureEventShape(parsed[id]);
        normalized[evt.id] = evt;
      });
      state.events = normalized;
    } catch (err) {
      state.events = {};
    }
  }

  function addEvent(data) {
    const evt = ensureEventShape(data);
    state.events[evt.id] = evt;
  }

  function nthWeekdayOfMonth(year, monthIndex, weekday, nth) {
    const first = new Date(year, monthIndex, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIndex, 1 + offset + (nth - 1) * 7);
  }

  function weekRangeByOrder(year, monthIndex, order) {
    const startDay = 1 + (order - 1) * 7;
    const start = new Date(year, monthIndex, startDay);
    const end = new Date(year, monthIndex, startDay + 6);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    if (end > monthEnd) return { start, end: monthEnd };
    return { start, end };
  }

  function lastWeekRange(year, monthIndex) {
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const start = new Date(year, monthIndex, monthEnd.getDate() - 6);
    return { start, end: monthEnd };
  }

  function endOfMonthRange(year, monthIndex) {
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const start = new Date(year, monthIndex, Math.max(1, monthEnd.getDate() - 4));
    return { start, end: monthEnd };
  }

  function addOfficialEvent(data) {
    addEvent(data);
  }

  function ensureInitialData() {
    const seeded = localStorage.getItem(SEED_VERSION_KEY) === "1";
    if (seeded) return;

    state.events = {};

    const januarySecondWeek = weekRangeByOrder(YEAR, 0, 2);
    const januaryLastWeek = lastWeekRange(YEAR, 0);
    const febEnd = endOfMonthRange(YEAR, 1);
    const marchFirstWeek = weekRangeByOrder(YEAR, 2, 1);
    const marchSecondWeek = weekRangeByOrder(YEAR, 2, 2);
    const marchLastWeek = lastWeekRange(YEAR, 2);
    const aprilSecondWeek = weekRangeByOrder(YEAR, 3, 2);
    const aprilEnd = endOfMonthRange(YEAR, 3);
    const mayThirdWeek = weekRangeByOrder(YEAR, 4, 3);
    const julyLastWeek = lastWeekRange(YEAR, 6);
    const augustThirdWeek = weekRangeByOrder(YEAR, 7, 3);
    const augustEnd = endOfMonthRange(YEAR, 7);
    const octoberFirstWeek = weekRangeByOrder(YEAR, 9, 1);
    const novemberLastWeek = lastWeekRange(YEAR, 10);
    const decemberSecondWeek = weekRangeByOrder(YEAR, 11, 2);
    const decemberThirdWeek = weekRangeByOrder(YEAR, 11, 3);

    addOfficialEvent({
      title: "Ano Novo da Nascente (Shinnenkai / Reveillon)",
      type: "holiday",
      category: "civil",
      island: "Todas as ilhas",
      startDate: toISO(new Date(YEAR, 0, 1)),
      endDate: toISO(new Date(YEAR, 0, 1)),
      desc: "Celebracao com fogos, reunioes familiares e a Primeira Luz da Nascente.",
      lore: true
    });

    addOfficialEvent({
      title: "Semana dos Antepassados",
      type: "event",
      category: "comunidade",
      island: "Todas as ilhas",
      startDate: toISO(januarySecondWeek.start),
      endDate: toISO(januarySecondWeek.end),
      rule: "Segunda semana de janeiro",
      desc: "Visitas aos mais velhos e preservacao de historias familiares."
    });

    addOfficialEvent({
      title: "Dia dos Novos Adultos",
      type: "event",
      category: "civil",
      island: "Hanashima",
      startDate: toISO(nthWeekdayOfMonth(YEAR, 0, 1, 2)),
      endDate: toISO(nthWeekdayOfMonth(YEAR, 0, 1, 2)),
      rule: "Segunda segunda-feira de janeiro",
      desc: "Cerimonia para jovens de 18 anos com discursos de ex-alunos da Kurohana."
    });

    addOfficialEvent({
      title: "Festival das Lanternas do Mar",
      type: "event",
      category: "comunidade",
      island: "Sumirejima",
      startDate: toISO(januaryLastWeek.start),
      endDate: toISO(januaryLastWeek.end),
      rule: "Ultima semana de janeiro",
      desc: "Homenagem aos que partiram apos a Tragedia da Virada.",
      lore: true
    });

    addOfficialEvent({ title: "Setsubun da Nascente", type: "event", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 1, 3)), endDate: toISO(new Date(YEAR, 1, 3)), desc: "Mascaras de oni e rituais de protecao." });
    addOfficialEvent({ title: "Cerimonia de Abertura Escolar", type: "event", category: "escolar", island: "Hanashima", startDate: toISO(new Date(YEAR, 1, 10)), endDate: toISO(new Date(YEAR, 1, 10)), desc: "Inicio oficial das aulas da Academia Kurohana." });
    addOfficialEvent({ title: "Primeira Semana de Provas", type: "exam", category: "escolar", island: "Hanashima", startDate: toISO(febEnd.start), endDate: toISO(febEnd.end), rule: "Final de fevereiro", desc: "Avaliacao de adaptacao dos alunos." });
    addOfficialEvent({ title: "Carnaval da Nascente", type: "event", category: "comunidade", island: "Botan", startDate: toISO(febEnd.start), endDate: toISO(febEnd.end), rule: "Final de fevereiro", desc: "Blocos das quatro ilhas, fantasias e dancas." });

    addOfficialEvent({ title: "Semana dos Clubes", type: "event", category: "clube", island: "Hanashima", startDate: toISO(marchFirstWeek.start), endDate: toISO(marchFirstWeek.end), rule: "Primeira semana de marco", desc: "Apresentacoes de clubes da Kurohana." });
    addOfficialEvent({ title: "Festival Cultural das Quatro Ilhas", type: "event", category: "escolar", island: "Hanashima", startDate: toISO(marchSecondWeek.start), endDate: toISO(marchSecondWeek.end), rule: "Segunda semana de marco", desc: "Turmas representam tradicoes do arquipelago." });
    addOfficialEvent({ title: "Festival da Primavera da Nascente", type: "event", category: "civil", island: "Hanashima", startDate: toISO(new Date(YEAR, 2, 21)), endDate: toISO(new Date(YEAR, 2, 21)), desc: "Hanami com piqueniques brasileiros." });
    addOfficialEvent({ title: "Semana da Comunidade", type: "event", category: "comunidade", island: "Todas as ilhas", startDate: toISO(marchLastWeek.start), endDate: toISO(marchLastWeek.end), rule: "Ultima semana de marco", desc: "Projetos sociais e limpeza de praias." });

    addOfficialEvent({ title: "Fundacao do Arquipelago da Nascente", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 3, 12)), endDate: toISO(new Date(YEAR, 3, 12)), lore: true, desc: "Data oficial da criacao da Nascente moderna." });
    addOfficialEvent({ title: "Festival das Flores", type: "event", category: "civil", island: "Hanashima", startDate: toISO(aprilSecondWeek.start), endDate: toISO(aprilSecondWeek.end), rule: "Segunda semana de abril", desc: "Ruas decoradas com flores e comidas tradicionais." });
    addOfficialEvent({ title: "Feira de Artes da Nascente", type: "event", category: "comunidade", island: "Hanashima", startDate: toISO(aprilEnd.start), endDate: toISO(aprilEnd.end), rule: "Final de abril", desc: "Pintura, literatura, musica e artesanato." });

    addOfficialEvent({ title: "Dia do Trabalho da Nascente", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 4, 1)), endDate: toISO(new Date(YEAR, 4, 1)), desc: "Homenagem aos trabalhadores." });
    addOfficialEvent({ title: "Dia das Familias", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(nthWeekdayOfMonth(YEAR, 4, 0, 2)), endDate: toISO(nthWeekdayOfMonth(YEAR, 4, 0, 2)), rule: "Segundo domingo de maio", desc: "Valorizacao da familia na cultura da Nascente." });
    addOfficialEvent({ title: "Feira Cultural da Kurohana", type: "event", category: "escolar", island: "Hanashima", startDate: toISO(mayThirdWeek.start), endDate: toISO(mayThirdWeek.end), rule: "Terceira semana de maio", desc: "Apresentacoes e exposicoes escolares." });

    addOfficialEvent({ title: "Festa Junina da Nascente", type: "event", category: "comunidade", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 5, 1)), endDate: toISO(new Date(YEAR, 5, 30)), rule: "Junho inteiro", desc: "Quadrilhas, matsuri e barracas tipicas." });
    addOfficialEvent({ title: "Tanabata da Nascente", type: "event", category: "civil", island: "Hanashima", startDate: toISO(new Date(YEAR, 5, 7)), endDate: toISO(new Date(YEAR, 5, 7)), desc: "Desejos em papeis coloridos pendurados em arvores." });
    addOfficialEvent({ title: "Festival das Mares", type: "event", category: "civil", island: "Sumirejima", startDate: toISO(new Date(YEAR, 5, 21)), endDate: toISO(new Date(YEAR, 5, 21)), desc: "Relacao espiritual e pratica com o oceano." });

    addOfficialEvent({ title: "Festival das Estrelas", type: "event", category: "civil", island: "Botan", startDate: toISO(new Date(YEAR, 6, 7)), endDate: toISO(new Date(YEAR, 6, 7)), desc: "Festival noturno com lanternas." });
    addOfficialEvent({ title: "Festival de Verao da Nascente", type: "event", category: "comunidade", island: "Botan", startDate: toISO(julyLastWeek.start), endDate: toISO(julyLastWeek.end), rule: "Final de julho", desc: "Maior festival de verao do arquipelago." });
    addOfficialEvent({ title: "Inicio das Ferias de Verao", type: "holiday", category: "escolar", island: "Todas as ilhas", startDate: toISO(julyLastWeek.start), endDate: toISO(julyLastWeek.end), rule: "Ultima semana de julho", desc: "Pausa escolar de verao." });

    addOfficialEvent({ title: "Obon da Nascente", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 7, 15)), endDate: toISO(new Date(YEAR, 7, 15)), desc: "Homenagem aos mortos e memoria familiar." });
    addOfficialEvent({ title: "Festival das Aguas", type: "event", category: "civil", island: "Sumirejima", startDate: toISO(augustThirdWeek.start), endDate: toISO(augustThirdWeek.end), rule: "Terceira semana de agosto", desc: "Barcos iluminados atravessam a costa." });
    addOfficialEvent({ title: "Retorno das Aulas", type: "event", category: "escolar", island: "Hanashima", startDate: toISO(augustEnd.start), endDate: toISO(augustEnd.end), rule: "Final de agosto", desc: "Retorno apos as ferias." });

    addOfficialEvent({ title: "Campeonato das Quatro Ilhas", type: "event", category: "escolar", island: "Hanashima", startDate: toISO(new Date(YEAR, 8, 1)), endDate: toISO(new Date(YEAR, 8, 30)), rule: "Setembro", desc: "Competicao escolar multiesportiva." });
    addOfficialEvent({ title: "Dia do Respeito aos Anciaos", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(nthWeekdayOfMonth(YEAR, 8, 1, 2)), endDate: toISO(nthWeekdayOfMonth(YEAR, 8, 1, 2)), rule: "Segunda segunda-feira de setembro", desc: "Homenagem aos moradores antigos." });

    addOfficialEvent({ title: "Semana da Historia da Nascente", type: "event", category: "comunidade", island: "Fujiwara", startDate: toISO(octoberFirstWeek.start), endDate: toISO(octoberFirstWeek.end), rule: "Primeira semana de outubro", desc: "Exposicoes e apresentacoes historicas." });
    addOfficialEvent({ title: "Festival das Mascaras da Nascente", type: "event", category: "comunidade", island: "Botan", startDate: toISO(new Date(YEAR, 9, 31)), endDate: toISO(new Date(YEAR, 9, 31)), desc: "Mistura de halloween local e mascaras tradicionais japonesas." });

    addOfficialEvent({ title: "Dia da Cultura", type: "holiday", category: "civil", island: "Hanashima", startDate: toISO(new Date(YEAR, 10, 3)), endDate: toISO(new Date(YEAR, 10, 3)), desc: "Eventos artisticos e culturais." });
    addOfficialEvent({ title: "Dia da Gratidao pelo Trabalho", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 10, 23)), endDate: toISO(new Date(YEAR, 10, 23)), desc: "Homenagem aos profissionais da comunidade." });
    addOfficialEvent({ title: "Festival das Quatro Cozinhas", type: "event", category: "comunidade", island: "Fujiwara", startDate: toISO(novemberLastWeek.start), endDate: toISO(novemberLastWeek.end), rule: "Ultima semana de novembro", desc: "Festival gastronomico das ilhas." });

    addOfficialEvent({ title: "Dia da Tragedia da Virada", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 11, 4)), endDate: toISO(new Date(YEAR, 11, 4)), lore: true, desc: "Dia de memoria com homenagens e aulas historicas." });
    addOfficialEvent({ title: "Provas Finais", type: "exam", category: "escolar", island: "Hanashima", startDate: toISO(decemberSecondWeek.start), endDate: toISO(decemberSecondWeek.end), rule: "Segunda semana de dezembro", desc: "Ultimas avaliacoes do ano escolar." });
    addOfficialEvent({ title: "Cerimonia de Formatura", type: "event", category: "escolar", island: "Hanashima", startDate: toISO(decemberThirdWeek.start), endDate: toISO(decemberThirdWeek.end), rule: "Terceira semana de dezembro", desc: "Encerramento do ano escolar." });
    addOfficialEvent({ title: "Natal da Nascente", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 11, 24)), endDate: toISO(new Date(YEAR, 11, 25)), rule: "24 e 25 de dezembro", desc: "Ceias, presentes e encontros familiares." });
    addOfficialEvent({ title: "Noite da Passagem", type: "holiday", category: "civil", island: "Todas as ilhas", startDate: toISO(new Date(YEAR, 11, 31)), endDate: toISO(new Date(YEAR, 11, 31)), lore: true, desc: "Encerramento do ano com fogos sobre o oceano." });

    saveEvents();
    localStorage.setItem(SEED_VERSION_KEY, "1");
  }

  function openModal(eventObj) {
    state.editingId = eventObj ? eventObj.id : null;
    dom.modalTitle.textContent = eventObj ? "Editar evento" : "Novo evento";
    dom.deleteEventBtn.classList.toggle("hidden", !eventObj);

    const currentISO = state.selectedDateISO;
    const data = eventObj || {
      type: "event",
      category: "civil",
      island: "Todas as ilhas",
      title: "",
      startDate: currentISO,
      endDate: currentISO,
      time: "",
      rule: "",
      desc: "",
      npcs: "",
      hook: "",
      consequence: "",
      status: "planejado",
      lore: false
    };

    dom.evtType.value = data.type;
    dom.evtCategory.value = data.category;
    dom.evtIsland.value = data.island;
    dom.evtTitle.value = data.title;
    dom.evtStartDate.value = data.startDate;
    dom.evtEndDate.value = data.endDate;
    dom.evtTime.value = data.time;
    dom.evtRule.value = data.rule;
    dom.evtDesc.value = data.desc;
    dom.evtNpcs.value = data.npcs;
    dom.evtHook.value = data.hook;
    dom.evtConsequence.value = data.consequence;
    dom.evtStatus.value = data.status;
    dom.evtLore.checked = Boolean(data.lore);

    dom.modal.classList.remove("hidden");
    dom.modal.setAttribute("aria-hidden", "false");
    dom.evtTitle.focus();
  }

  function closeModal() {
    dom.modal.classList.add("hidden");
    dom.modal.setAttribute("aria-hidden", "true");
    state.editingId = null;
  }

  function renderCalendar() {
    formatMonthLabel(state.currentMonth);
    dom.calendarGrid.innerHTML = "";

    const first = new Date(YEAR, state.currentMonth, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(YEAR, state.currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(YEAR, state.currentMonth, 0).getDate();

    for (let i = prevMonthDays - startWeekday + 1; i <= prevMonthDays; i++) {
      const dateObj = new Date(YEAR, state.currentMonth - 1, i);
      dom.calendarGrid.appendChild(makeDayCell(dateObj, true));
    }

    for (let d = 1; d <= daysInMonth; d++) {
      dom.calendarGrid.appendChild(makeDayCell(new Date(YEAR, state.currentMonth, d), false));
    }

    const totalCells = startWeekday + daysInMonth;
    const remain = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remain; d++) {
      dom.calendarGrid.appendChild(makeDayCell(new Date(YEAR, state.currentMonth + 1, d), true));
    }
  }

  function makeDayCell(dateObj, isOff) {
    const dateISO = toISO(dateObj);
    const dayEvents = eventsForDate(dateISO);
    const el = document.createElement("div");
    el.className = "day";
    if (isOff) el.classList.add("off");
    if (state.selectedDateISO === dateISO) el.classList.add("selected");
    if (dayEvents.some((ev) => ev.startDate !== ev.endDate)) el.classList.add("has-span");

    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", dateISO + " com " + dayEvents.length + " evento(s)");

    const num = document.createElement("div");
    num.className = "dateNum";
    num.textContent = String(dateObj.getDate());
    el.appendChild(num);

    const spanTrack = document.createElement("div");
    spanTrack.className = "span-track";
    const spanEvents = dayEvents.filter((ev) => ev.startDate !== ev.endDate).slice(0, 2);
    spanEvents.forEach((ev) => {
      const chip = document.createElement("div");
      chip.className = "span-chip " + ev.type + (ev.lore ? " lore" : "");
      chip.title = ev.title;
      spanTrack.appendChild(chip);
    });
    el.appendChild(spanTrack);

    const dots = document.createElement("div");
    dots.className = "event-dot";
    dayEvents.slice(0, 4).forEach((ev) => {
      const dot = document.createElement("div");
      dot.className = "dot " + ev.type;
      dot.title = ev.title;
      dots.appendChild(dot);
      if (ev.lore) {
        const loreDot = document.createElement("div");
        loreDot.className = "dot lore";
        loreDot.title = "Lore-chave";
        dots.appendChild(loreDot);
      }
    });
    el.appendChild(dots);

    el.addEventListener("click", function () {
      state.selectedDateISO = dateISO;
      renderAll();
    });

    el.addEventListener("dblclick", function () {
      state.selectedDateISO = dateISO;
      openModal(null);
    });

    el.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        state.selectedDateISO = dateISO;
        renderAll();
      }
    });

    return el;
  }

  function renderEventsList() {
    dom.eventsList.innerHTML = "";
    const list = eventsForDate(state.selectedDateISO);

    if (!list.length) {
      const li = document.createElement("li");
      li.className = "event-item";
      li.textContent = "Sem eventos para a data e filtros atuais.";
      dom.eventsList.appendChild(li);
      return;
    }

    list.forEach((ev) => {
      const li = document.createElement("li");
      li.className = "event-item" + (ev.lore ? " lore-item" : "");

      const dateLabel = ev.startDate === ev.endDate ? formatDate(ev.startDate) : formatDate(ev.startDate) + " ate " + formatDate(ev.endDate);
      const ruleLabel = ev.rule ? " | Regra: " + ev.rule : "";

      li.innerHTML =
        '<div class="title-row"><div class="title">' + escapeHtml(ev.title) + '</div>' +
        '<span class="badge' + (ev.lore ? " lore" : "") + '">' + (ev.lore ? "Lore" : ev.status) + '</span></div>' +
        '<div class="meta">' + escapeHtml(ev.category) + ' | ' + escapeHtml(ev.island) + ' | ' + escapeHtml(ev.type) + '</div>' +
        '<div class="meta">Data exata: ' + escapeHtml(dateLabel) + ruleLabel + '</div>' +
        (ev.time ? '<div class="meta">Horario: ' + escapeHtml(ev.time) + '</div>' : "") +
        (ev.desc ? '<div class="meta">' + escapeHtml(ev.desc) + '</div>' : "") +
        (ev.npcs ? '<div class="meta">NPCs: ' + escapeHtml(ev.npcs) + '</div>' : "") +
        (ev.hook ? '<div class="meta">Gancho: ' + escapeHtml(ev.hook) + '</div>' : "") +
        (ev.consequence ? '<div class="meta">Consequencia: ' + escapeHtml(ev.consequence) + '</div>' : "");

      li.addEventListener("click", function () {
        openModal(ev);
      });

      dom.eventsList.appendChild(li);
    });
  }

  function renderTimeline() {
    dom.timelineView.innerHTML = "";
    const events = getFilteredEvents().slice().sort(compareEvents);

    MONTHS.forEach((monthName, monthIndex) => {
      const range = monthRange(monthIndex);
      const monthEvents = events.filter((ev) => rangesOverlap(ev.startDate, ev.endDate, range.start, range.end));

      const block = document.createElement("section");
      block.className = "timeline-month";
      block.innerHTML = "<h4>" + monthName + "</h4>";

      const items = document.createElement("div");
      items.className = "timeline-items";

      if (!monthEvents.length) {
        const empty = document.createElement("div");
        empty.className = "event-item";
        empty.textContent = "Sem eventos para os filtros atuais.";
        items.appendChild(empty);
      } else {
        monthEvents.forEach((ev) => {
          const card = document.createElement("div");
          card.className = "event-item" + (ev.lore ? " lore-item" : "");
          card.innerHTML =
            '<div class="title-row"><div class="title">' + escapeHtml(ev.title) + '</div>' +
            '<span class="badge' + (ev.lore ? " lore" : "") + '">' + escapeHtml(ev.island) + '</span></div>' +
            '<div class="meta">' + escapeHtml(formatDate(ev.startDate)) + (ev.startDate !== ev.endDate ? " ate " + escapeHtml(formatDate(ev.endDate)) : "") + '</div>' +
            (ev.rule ? '<div class="meta">Regra original: ' + escapeHtml(ev.rule) + '</div>' : "") +
            '<div class="meta">Categoria: ' + escapeHtml(ev.category) + ' | Tipo: ' + escapeHtml(ev.type) + '</div>';
          card.addEventListener("click", function () {
            state.currentMonth = fromISO(ev.startDate).getMonth();
            state.selectedDateISO = ev.startDate;
            state.viewMode = "month";
            renderAll();
          });
          items.appendChild(card);
        });
      }

      block.appendChild(items);
      dom.timelineView.appendChild(block);
    });
  }

  function renderUpcomingAlert() {
    const base = fromISO(state.selectedDateISO);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 7);
    const startISO = toISO(base);
    const endISO = toISO(end);

    const upcoming = getFilteredEvents().filter((ev) => ev.lore && rangesOverlap(ev.startDate, ev.endDate, startISO, endISO)).sort(compareEvents);

    if (!upcoming.length) {
      dom.upcomingAlert.classList.add("hidden");
      dom.upcomingAlert.textContent = "";
      return;
    }

    const next = upcoming[0];
    dom.upcomingAlert.classList.remove("hidden");
    dom.upcomingAlert.textContent = "Alerta de lore: " + next.title + " entre " + formatDate(next.startDate) + " e " + formatDate(next.endDate) + ".";
  }

  function renderViewMode() {
    const monthMode = state.viewMode === "month";
    dom.monthView.classList.toggle("hidden", !monthMode);
    dom.timelineView.classList.toggle("hidden", monthMode);
    dom.monthViewBtn.classList.toggle("active", monthMode);
    dom.timelineViewBtn.classList.toggle("active", !monthMode);
  }

  function renderAll() {
    renderViewMode();
    renderCalendar();
    renderEventsList();
    renderTimeline();
    renderUpcomingAlert();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state.events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nascente-events-" + YEAR + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportMarkdown() {
    const events = getAllEvents().slice().sort(compareEvents);
    const lines = [
      "# Calendario Oficial da Nascente (" + YEAR + ")",
      ""
    ];

    MONTHS.forEach((monthName, monthIndex) => {
      const range = monthRange(monthIndex);
      const monthEvents = events.filter((ev) => rangesOverlap(ev.startDate, ev.endDate, range.start, range.end));
      lines.push("## " + monthName);
      if (!monthEvents.length) {
        lines.push("- Sem eventos.");
      } else {
        monthEvents.forEach((ev) => {
          const when = ev.startDate === ev.endDate ? formatDate(ev.startDate) : formatDate(ev.startDate) + " ate " + formatDate(ev.endDate);
          lines.push("- **" + ev.title + "** (" + when + ") [" + ev.category + " | " + ev.island + " | " + ev.type + "]");
          if (ev.rule) lines.push("  - Regra: " + ev.rule);
          if (ev.desc) lines.push("  - Descricao: " + ev.desc);
          if (ev.npcs) lines.push("  - NPCs: " + ev.npcs);
          if (ev.hook) lines.push("  - Gancho: " + ev.hook);
          if (ev.consequence) lines.push("  - Consequencia: " + ev.consequence);
          if (ev.lore) lines.push("  - Lore-chave: sim");
        });
      }
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nascente-calendario-" + YEAR + ".md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const incoming = {};

        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            const evt = ensureEventShape(item);
            incoming[evt.id] = evt;
          });
        } else {
          Object.keys(parsed).forEach((key) => {
            const evt = ensureEventShape(parsed[key]);
            incoming[evt.id] = evt;
          });
        }

        state.events = Object.assign({}, state.events, incoming);
        saveEvents();
        renderAll();
        alert("Importacao concluida.");
      } catch (err) {
        alert("Arquivo invalido para importacao.");
      }
    };
    reader.readAsText(file);
  }

  function clampSelectedDateTo2016() {
    const d = fromISO(state.selectedDateISO);
    d.setFullYear(YEAR);
    state.selectedDateISO = toISO(d);
  }

  function bindEvents() {
    dom.prevMonth.addEventListener("click", function () {
      state.currentMonth = (state.currentMonth + 11) % 12;
      state.selectedDateISO = toISO(new Date(YEAR, state.currentMonth, 1));
      renderAll();
    });

    dom.nextMonth.addEventListener("click", function () {
      state.currentMonth = (state.currentMonth + 1) % 12;
      state.selectedDateISO = toISO(new Date(YEAR, state.currentMonth, 1));
      renderAll();
    });

    dom.todayBtn.addEventListener("click", function () {
      const now = new Date();
      state.currentMonth = now.getMonth();
      const day = Math.min(now.getDate(), new Date(YEAR, now.getMonth() + 1, 0).getDate());
      state.selectedDateISO = toISO(new Date(YEAR, now.getMonth(), day));
      renderAll();
    });

    dom.toggleFilters.addEventListener("click", function () {
      dom.filtersPanel.classList.toggle("collapsed");
    });

    dom.filterCategory.addEventListener("change", function () {
      state.filters.category = dom.filterCategory.value;
      renderAll();
    });

    dom.filterIsland.addEventListener("change", function () {
      state.filters.island = dom.filterIsland.value;
      renderAll();
    });

    dom.filterType.addEventListener("change", function () {
      state.filters.type = dom.filterType.value;
      renderAll();
    });

    dom.monthViewBtn.addEventListener("click", function () {
      state.viewMode = "month";
      renderAll();
    });

    dom.timelineViewBtn.addEventListener("click", function () {
      state.viewMode = "timeline";
      renderAll();
    });

    dom.newEventBtn.addEventListener("click", function () {
      openModal(null);
    });

    dom.listNewBtn.addEventListener("click", function () {
      openModal(null);
    });

    dom.closeModal.addEventListener("click", closeModal);

    dom.modal.addEventListener("click", function (ev) {
      if (ev.target === dom.modal) closeModal();
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !dom.modal.classList.contains("hidden")) closeModal();
    });

    dom.eventForm.addEventListener("submit", function (ev) {
      ev.preventDefault();

      const startDate = dom.evtStartDate.value;
      const endDate = dom.evtEndDate.value;

      if (!dom.evtTitle.value.trim() || !startDate || !endDate) {
        alert("Titulo e periodo sao obrigatorios.");
        return;
      }
      if (endDate < startDate) {
        alert("A data de fim precisa ser igual ou posterior ao inicio.");
        return;
      }

      const eventData = {
        id: state.editingId || uid(),
        title: dom.evtTitle.value.trim(),
        type: dom.evtType.value,
        category: dom.evtCategory.value,
        island: dom.evtIsland.value,
        startDate,
        endDate,
        date: startDate,
        time: dom.evtTime.value || "",
        rule: dom.evtRule.value.trim(),
        desc: dom.evtDesc.value.trim(),
        npcs: dom.evtNpcs.value.trim(),
        hook: dom.evtHook.value.trim(),
        consequence: dom.evtConsequence.value.trim(),
        status: dom.evtStatus.value,
        lore: dom.evtLore.checked
      };

      state.events[eventData.id] = ensureEventShape(eventData);
      state.selectedDateISO = eventData.startDate;
      state.currentMonth = fromISO(eventData.startDate).getMonth();
      saveEvents();
      closeModal();
      renderAll();
    });

    dom.deleteEventBtn.addEventListener("click", function () {
      if (!state.editingId) return;
      if (!confirm("Excluir este evento?")) return;
      delete state.events[state.editingId];
      saveEvents();
      closeModal();
      renderAll();
    });

    dom.exportBtn.addEventListener("click", exportJSON);
    dom.exportMdBtn.addEventListener("click", exportMarkdown);
    dom.exportPdfBtn.addEventListener("click", function () {
      window.print();
    });

    dom.importBtn.addEventListener("click", function () {
      dom.importFile.click();
    });

    dom.importFile.addEventListener("change", function (ev) {
      const file = ev.target.files && ev.target.files[0];
      if (file) importJSON(file);
      dom.importFile.value = "";
    });

    let touchStartX = 0;
    let touchEndX = 0;
    dom.monthView.addEventListener("touchstart", function (ev) {
      touchStartX = ev.changedTouches[0].clientX;
    }, { passive: true });

    dom.monthView.addEventListener("touchend", function (ev) {
      touchEndX = ev.changedTouches[0].clientX;
      const diff = touchEndX - touchStartX;
      if (Math.abs(diff) < 45) return;
      if (diff < 0) {
        state.currentMonth = (state.currentMonth + 1) % 12;
      } else {
        state.currentMonth = (state.currentMonth + 11) % 12;
      }
      state.selectedDateISO = toISO(new Date(YEAR, state.currentMonth, 1));
      renderAll();
    }, { passive: true });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function init() {
    state.currentMonth = 0;
    state.selectedDateISO = toISO(new Date(YEAR, 0, 1));
    state.viewMode = "month";
    loadEvents();
    ensureInitialData();
    clampSelectedDateTo2016();
    bindEvents();
    state.currentMonth = fromISO(state.selectedDateISO).getMonth();
    renderAll();
  }

  init();
})();
