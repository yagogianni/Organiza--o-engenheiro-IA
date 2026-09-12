// public/js/app.js - Main Application Logic
// Status: FASE 1 - Implemented

import { analyzeNewProspect, continueConversation, getProspects, getProspect, deleteProspect, sendMessageNow, getSourcingConfig, saveSourcingConfig, buscarLeadsAgora } from './api.js';
import { getTheme, saveTheme } from './storage-local.js';

console.log('🎯 PROSPEC.AI - App Loading...');

let currentProspects = [];
let currentSourcingNiches = [];

// Initialize theme
initializeTheme();

// Initialize event listeners
function initializeEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab, e.target));
  });

  // Form submission
  const formNovaProspec = document.getElementById('formNovaProspec');
  if (formNovaProspec) {
    formNovaProspec.addEventListener('submit', handleNewProspect);
  }

  // Show/require the "specify segmento" field only when "Outro" is selected
  const segmentoSelect = document.getElementById('segmento');
  if (segmentoSelect) {
    segmentoSelect.addEventListener('change', () => toggleSegmentoOutro(segmentoSelect.value));
  }

  // Pipeline list search/filter
  const searchInput = document.getElementById('searchProspect');
  if (searchInput) {
    searchInput.addEventListener('input', renderFilteredProspectsList);
  }
  const filterSelect = document.getElementById('filterStatus');
  if (filterSelect) {
    filterSelect.addEventListener('change', renderFilteredProspectsList);
  }

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Message copy buttons
  const btnCopiarMensagem = document.getElementById('btnCopiarMensagem');
  if (btnCopiarMensagem) {
    btnCopiarMensagem.addEventListener('click', () => copyToClipboard('mensagem'));
  }

  const btnCopiarAlternativa = document.getElementById('btnCopiarAlternativa');
  if (btnCopiarAlternativa) {
    btnCopiarAlternativa.addEventListener('click', () => copyToClipboard('alternativa'));
  }

  const btnCopiarProximaMensagem = document.getElementById('btnCopiarProximaMensagem');
  if (btnCopiarProximaMensagem) {
    btnCopiarProximaMensagem.addEventListener('click', () => copyToClipboard('proximaMensagem'));
  }

  const btnEnviarAgora = document.getElementById('btnEnviarAgora');
  if (btnEnviarAgora) {
    btnEnviarAgora.addEventListener('click', handleSendNow);
  }

  // Alternative message generation
  const btnAlternativa = document.getElementById('btnAlternativa');
  if (btnAlternativa) {
    btnAlternativa.addEventListener('click', handleGenerateAlternative);
  }

  // Continue conversation
  const btnAnalyzarContinuar = document.getElementById('btnAnalyzarContinuar');
  if (btnAnalyzarContinuar) {
    btnAnalyzarContinuar.addEventListener('click', handleContinueConversation);
  }

  // Automatic sourcing config: add niche, save
  const btnAddNiche = document.getElementById('btnAddNiche');
  if (btnAddNiche) {
    btnAddNiche.addEventListener('click', handleAddNiche);
  }

  const btnSaveSourcingConfig = document.getElementById('btnSaveSourcingConfig');
  if (btnSaveSourcingConfig) {
    btnSaveSourcingConfig.addEventListener('click', handleSaveSourcingConfig);
  }

  const btnBuscarAgora = document.getElementById('btnBuscarAgora');
  if (btnBuscarAgora) {
    btnBuscarAgora.addEventListener('click', handleBuscarAgora);
  }

  console.log('✅ Event listeners initialized');
}

/**
 * Switch between tabs
 */
function switchTab(tabName, clickedBtn) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Add active to clicked button
  if (clickedBtn) {
    clickedBtn.classList.add('active');
  }

  // Load data if switching to continue conversation
  if (tabName === 'continuar-conversa') {
    loadProspectsList();
  }

  // Load data if switching to the "all leads" panel
  if (tabName === 'painel') {
    loadPainel();
  }

  // Load data if switching to the automatic sourcing config panel
  if (tabName === 'sourcing') {
    loadSourcingConfig();
  }
}

/**
 * Human-readable labels for the automation status (leads.status).
 * Leads whose status is in PRIORITY_STATUSES need the user's attention.
 */
const STATUS_LABELS = {
  NEW: 'Novo',
  READY_FOR_OUTREACH: 'Pronto pra abordar',
  OUTREACH_ACTIVE: 'Sendo abordado',
  WAITING_RESPONSE: 'Aguardando resposta',
  FOLLOW_UP_1: 'Follow-up 1',
  FOLLOW_UP_2: 'Follow-up 2',
  FOLLOW_UP_3: 'Follow-up 3',
  HUMAN_REVIEW: 'Precisa de você',
  ENGAGED: 'Engajado',
  PAUSED: 'Pausado',
  RESTING: 'Em descanso',
  REACTIVATION: 'Reativação',
  NOT_INTERESTED: 'Não interessado',
  CLOSED: 'Encerrado'
};

const PRIORITY_STATUSES = new Set(['HUMAN_REVIEW']);

/**
 * Load and render the "Todos os Leads" panel: every lead, priority
 * (HUMAN_REVIEW) ones first, with their automation status and pipeline tip.
 */
async function loadPainel() {
  console.log('📋 Carregando painel de leads...');
  const container = document.getElementById('painelTable');
  if (!container) return;

  try {
    const prospects = await getProspects();
    renderPainel(prospects);
  } catch (error) {
    console.error('❌ Erro ao carregar painel:', error);
    container.innerHTML = '<p class="empty-message">Erro ao carregar os leads.</p>';
  }
}

function renderPainel(prospects) {
  const container = document.getElementById('painelTable');
  if (!container) return;

  if (!prospects || prospects.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum lead ainda.</p>';
    return;
  }

  const sorted = [...prospects].sort((a, b) => {
    const aPriority = PRIORITY_STATUSES.has(a.status) ? 0 : 1;
    const bPriority = PRIORITY_STATUSES.has(b.status) ? 0 : 1;
    return aPriority - bPriority;
  });

  const rows = sorted.map(p => {
    const isPriority = PRIORITY_STATUSES.has(p.status);
    const statusLabel = STATUS_LABELS[p.status] || p.status || '-';
    const statusClass = isPriority ? 'status-badge--priority'
      : (p.status === 'RESTING' || p.status === 'CLOSED' || p.status === 'NOT_INTERESTED') ? 'status-badge--resting'
      : '';
    const pipelineText = p.pipeline ? `${p.pipeline.label} — ${p.pipeline.tip}` : '-';

    return `
      <tr class="painel-row ${isPriority ? 'painel-row--priority' : ''}" data-id="${p.id}">
        <td>${p.empresa}</td>
        <td>${p.contato || '-'}</td>
        <td>${p.segmento || '-'}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td class="painel-tip">${pipelineText}</td>
        <td><button class="btn-delete-lead" data-id="${p.id}" data-empresa="${p.empresa}" title="Excluir lead">🗑️</button></td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Empresa</th>
          <th>Contato</th>
          <th>Nicho</th>
          <th>Status</th>
          <th>O que fazer</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  container.querySelectorAll('.painel-row').forEach(row => {
    row.addEventListener('click', () => openLeadFromPainel(row.dataset.id));
  });

  container.querySelectorAll('.btn-delete-lead').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteLead(btn.dataset.id, btn.dataset.empresa);
    });
  });
}

/**
 * Delete a lead (and its history) after confirmation, then refresh the panel.
 */
async function handleDeleteLead(prospectId, empresaNome) {
  const confirmed = confirm(`Excluir "${empresaNome}"? Isso apaga o lead e todo o histórico de conversa. Não pode ser desfeito.`);
  if (!confirmed) return;

  try {
    await deleteProspect(prospectId);
    await loadPainel();
    showNotification(`"${empresaNome}" excluído.`, 'success');
  } catch (error) {
    console.error('❌ Erro ao excluir lead:', error);
    showNotification('Erro ao excluir o lead.', 'error');
  }
}

/**
 * Jump from the "Todos os Leads" panel to a specific lead's conversation,
 * switching tabs and loading it exactly as if picked from the Pipeline list.
 */
async function openLeadFromPainel(prospectId) {
  const targetBtn = document.querySelector('.tab-btn[data-tab="continuar-conversa"]');
  switchTab('continuar-conversa', targetBtn);
  await loadProspectsList();
  const item = document.querySelector(`.prospect-item[data-id="${prospectId}"]`);
  await selectProspect(prospectId, item);
}

/**
 * Show/hide and require the "Especifique o segmento" field based on
 * whether "Outro" is selected in the segmento dropdown.
 */
function toggleSegmentoOutro(segmentoValue) {
  const group = document.getElementById('segmentoOutroGroup');
  const input = document.getElementById('segmentoOutro');
  if (!group || !input) return;

  const isOutro = segmentoValue === 'Outro';
  group.style.display = isOutro ? 'block' : 'none';
  input.required = isOutro;
  if (!isOutro) {
    input.value = '';
  }
}

/**
 * Handle form submission for new prospect
 */
async function handleNewProspect(e) {
  e.preventDefault();

  console.log('📝 Analisando novo prospect...');

  // Get form data
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  // When "Outro" is picked, send the specific segment the user typed
  // instead of the literal word "Outro"
  if (data.segmento === 'Outro') {
    data.segmento = (data.segmentoOutro || '').trim();
  }
  delete data.segmentoOutro;

  // Show loading
  showLoadingSpinner('resultPanel');

  try {
    // Call API
    const result = await analyzeNewProspect(data);

    // Display results
    displayAnalysisResult(result);
  } catch (error) {
    console.error('❌ Erro ao analisar prospect:', error);
    showError('resultPanel', `Erro: ${error.message}`);
  }
}

/**
 * Handle continue conversation
 */
async function handleContinueConversation() {
  console.log('💬 Continuando conversa...');

  const resposta = document.getElementById('newResponse').value;
  if (!resposta.trim()) {
    showError('continueAnalysisResult', 'Por favor, insira a resposta do prospect');
    return;
  }

  // TODO: Get prospect ID from selected item
  const prospectId = getSelectedProspectId();
  if (!prospectId) {
    showError('continueAnalysisResult', 'Selecione um prospect primeiro');
    return;
  }

  // Trava contra clique duplo: um segundo clique enquanto a primeira chamada
  // ainda está em andamento gerava e enfileirava a mensagem duas vezes.
  const btn = document.getElementById('btnAnalyzarContinuar');
  if (btn && btn.disabled) return;
  if (btn) btn.disabled = true;

  try {
    const result = await continueConversation({
      id: prospectId,
      resposta: resposta
    });

    displayContinueAnalysis(result);
  } catch (error) {
    console.error('❌ Erro ao continuar conversa:', error);
    showError('continueAnalysisResult', `Erro: ${error.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Toggle display of the alternative message. The backend already returns
 * "alternativa" alongside "mensagem" in the same /api/analyze call, so this
 * just shows/hides the section already populated by displayAnalysisResult.
 */
function handleGenerateAlternative() {
  const section = document.getElementById('alternativaSection');
  if (!section) return;
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

/**
 * Display analysis results
 */
function displayAnalysisResult(result) {
  // Hide loading
  hideLoadingSpinner('resultPanel');

  // Display all fields
  document.getElementById('estagioBadge').textContent = result.estagio || '';
  document.getElementById('situacaoAtual').textContent = result.situacaoAtual || '';
  document.getElementById('objetivo').textContent = result.objetivo || '';
  document.getElementById('estrategia').textContent = result.estrategia || '';
  document.getElementById('oQueEvitar').textContent = result.oQueEvitar || '';
  document.getElementById('mensagem').textContent = result.mensagem || '';
  document.getElementById('alternativa').textContent = result.alternativa || '';

  // Show result panel
  document.getElementById('resultPanel').style.display = 'block';
  document.getElementById('analysisResult').style.display = 'block';
  document.getElementById('errorMessage').style.display = 'none';
}

/**
 * Display continue analysis
 */
function displayContinueAnalysis(result) {
  document.getElementById('estagioAtualBadge').textContent = result.estagioAtual || '';
  document.getElementById('oQueSgnifica').textContent = result.oQueSgnifica || '';
  document.getElementById('ondeEstamos').textContent = result.ondeEstamos || '';
  document.getElementById('objetivoAgora').textContent = result.objetivoAgora || '';
  document.getElementById('estrategiaAgora').textContent = result.estrategiaAgora || '';
  document.getElementById('oQueNaoFazer').textContent = result.oQueNaoFazer || '';
  document.getElementById('proximaMensagem').textContent = result.proximaMensagem || '';
  document.getElementById('timing').textContent = result.timing || '';

  // Show analysis
  document.getElementById('continueAnalysisResult').style.display = 'block';
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const text = element.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copiado para a área de transferência.');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showNotification('Erro ao copiar', 'error');
  });
}

/**
 * Send the (possibly edited) suggested message for real, via WhatsApp or
 * e-mail, straight from the dashboard - no more copy/paste required.
 */
async function handleSendNow() {
  const id = getSelectedProspectId();
  const statusEl = document.getElementById('statusEnvio');
  if (!id) {
    if (statusEl) statusEl.textContent = 'Selecione um prospect primeiro.';
    return;
  }

  const messageEl = document.getElementById('proximaMensagem');
  const texto = (messageEl?.textContent || '').trim();
  if (!texto) {
    if (statusEl) statusEl.textContent = 'Não há mensagem pra enviar.';
    return;
  }

  const btn = document.getElementById('btnEnviarAgora');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = 'Enviando...';

  try {
    const result = await sendMessageNow(id, texto);
    if (statusEl) {
      statusEl.textContent = `Enviado por ${result.channel === 'whatsapp' ? 'WhatsApp' : 'e-mail'}.`;
      statusEl.style.color = 'var(--success-color)';
    }
  } catch (error) {
    console.error('Erro ao enviar:', error);
    if (statusEl) {
      statusEl.textContent = `Erro ao enviar: ${error.message}`;
      statusEl.style.color = 'var(--error-color)';
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Load prospects list
 */
async function loadProspectsList() {
  console.log('📋 Carregando lista de prospects...');
  try {
    currentProspects = await getProspects();
    renderFilteredProspectsList();
  } catch (error) {
    console.error('❌ Erro ao carregar prospects:', error);
  }
}

/**
 * Apply the search box and pipeline-stage filter to the last-loaded list
 */
function renderFilteredProspectsList() {
  const searchTerm = (document.getElementById('searchProspect')?.value || '').toLowerCase().trim();
  const stageFilter = document.getElementById('filterStatus')?.value || '';

  const filtered = currentProspects.filter(p => {
    const matchesSearch = !searchTerm ||
      p.empresa.toLowerCase().includes(searchTerm) ||
      p.contato.toLowerCase().includes(searchTerm);
    const matchesStage = !stageFilter || (p.pipeline && p.pipeline.stage === stageFilter);
    return matchesSearch && matchesStage;
  });

  displayProspectsList(filtered);
}

/**
 * Display prospects in list
 */
function displayProspectsList(prospects) {
  const list = document.getElementById('prospectsList');
  if (!list) return;

  if (!prospects || prospects.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhum prospect ainda.</p>';
    return;
  }

  list.innerHTML = prospects.map(p => `
    <div class="prospect-item" data-id="${p.id}">
      <div class="prospect-item-header">
        <div class="prospect-item-company">${p.empresa}</div>
        <span class="stage-badge stage-badge--${p.pipeline ? p.pipeline.stage : ''}">${p.pipeline ? p.pipeline.label : ''}</span>
      </div>
      <div class="prospect-item-info">${p.contato} • ${p.cargo}</div>
    </div>
  `).join('');

  // Add click handlers
  list.querySelectorAll('.prospect-item').forEach(item => {
    item.addEventListener('click', () => selectProspect(item.dataset.id, item));
  });
}

/**
 * Select prospect and show conversation
 */
async function selectProspect(prospectId, clickedItem) {
  console.log(`📩 Abrindo prospect: ${prospectId}`);
  try {
    const prospect = await getProspect(prospectId);
    displayConversationDetail(prospect);

    // Update active state
    document.querySelectorAll('.prospect-item').forEach(item => {
      item.classList.remove('active');
    });
    if (clickedItem) {
      clickedItem.classList.add('active');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar prospect:', error);
  }
}

/**
 * Display conversation details
 */
function displayConversationDetail(prospect) {
  // Show detail panel
  document.getElementById('noSelection').style.display = 'none';
  document.getElementById('conversationDetail').style.display = 'block';

  // Display prospect info
  document.getElementById('prospectCompanyName').textContent = prospect.empresa;
  document.getElementById('prospectContactName').textContent = prospect.contato;
  document.getElementById('prospectContactRole').textContent = prospect.cargo;

  // Display pipeline tip
  const tipBanner = document.getElementById('pipelineTipBanner');
  if (tipBanner) {
    if (prospect.pipeline) {
      tipBanner.textContent = `${prospect.pipeline.label}: ${prospect.pipeline.tip}`;
      tipBanner.style.display = 'block';
    } else {
      tipBanner.style.display = 'none';
    }
  }

  // Display conversation history
  const history = document.getElementById('conversationHistory');
  if (prospect.historico && prospect.historico.length > 0) {
    history.innerHTML = prospect.historico.map(msg => `
      <div class="conversation-message ${msg.tipo}">
        <div class="conversation-message-date">${msg.data}</div>
        <div class="conversation-message-text">${msg.conteudo}</div>
      </div>
    `).join('');
  } else {
    history.innerHTML = '<p class="empty-message">Nenhuma conversa ainda</p>';
  }

  // Clear response input
  document.getElementById('newResponse').value = '';
  document.getElementById('continueAnalysisResult').style.display = 'none';
}

/**
 * Show loading spinner
 */
function showLoadingSpinner(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.style.display = 'block';
  document.getElementById('loadingSpinner').style.display = 'flex';
  document.getElementById('analysisResult').style.display = 'none';
}

/**
 * Hide loading spinner
 */
function hideLoadingSpinner(panelId) {
  document.getElementById('loadingSpinner').style.display = 'none';
}

/**
 * Show error message
 */
function showError(panelId, message) {
  const errorElement = document.getElementById('errorMessage');
  if (panelId === 'continueAnalysisResult') {
    const continueError = document.getElementById('continueErrorMessage');
    if (continueError) {
      continueError.textContent = message;
      continueError.style.display = 'block';
    }
  } else {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  hideLoadingSpinner(panelId);
}

/**
 * Show notification
 */
function showNotification(message, type = 'success') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // TODO: Implement toast notifications in Fase 2
}

/**
 * Initialize theme from localStorage
 */
function initializeTheme() {
  const savedTheme = getTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  saveTheme(newTheme);
  updateThemeButton(newTheme);
}

/**
 * Update theme button text
 */
function updateThemeButton(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? 'Claro' : 'Escuro';
  }
}

/**
 * Get selected prospect ID
 */
function getSelectedProspectId() {
  const selected = document.querySelector('.prospect-item.active');
  return selected ? selected.dataset.id : null;
}

/**
 * Load and render the "Prospecção Automática" tab: active niches, region,
 * and today's summary (which niche was searched, how many leads came in).
 */
const RUN_STATUS_ICON = { sucesso: '✅', erro: '❌', nada_novo: 'ℹ️' };

async function loadSourcingConfig() {
  console.log('📡 Carregando configuração de prospecção automática...');
  try {
    const config = await getSourcingConfig();
    currentSourcingNiches = config.niches;
    renderNicheList();
    document.getElementById('sourcingRegion').value = config.region;
    const statusEl = document.getElementById('sourcingStatus');
    const nicheLabel = config.nicheToday || 'nenhum ainda';
    statusEl.textContent = `Nicho de hoje: ${nicheLabel} — leads adicionados hoje: ${config.leadsToday} de ${config.dailyCap}`;

    const lastRunEl = document.getElementById('sourcingLastRun');
    if (config.lastRunAt) {
      const icon = RUN_STATUS_ICON[config.lastRunStatus] || '';
      const dataFormatada = new Date(config.lastRunAt).toLocaleString('pt-BR');
      lastRunEl.textContent = `Última busca (${dataFormatada}): ${icon} ${config.lastRunMessage}`;
    } else {
      lastRunEl.textContent = 'Última busca: nenhuma ainda — clique em "Buscar Agora" pra testar.';
    }
    return config;
  } catch (error) {
    console.error('❌ Erro ao carregar configuração de sourcing:', error);
    return null;
  }
}

function renderNicheList() {
  const container = document.getElementById('sourcingNicheList');
  if (currentSourcingNiches.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum nicho ativo ainda.</p>';
    return;
  }
  container.innerHTML = '';
  currentSourcingNiches.forEach(niche => {
    const chip = document.createElement('span');
    chip.className = 'niche-chip';
    chip.textContent = niche;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.title = `Remover ${niche}`;
    removeBtn.addEventListener('click', () => handleRemoveNiche(niche));
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

function handleAddNiche() {
  const input = document.getElementById('sourcingNewNiche');
  const niche = input.value.trim();
  if (!niche || currentSourcingNiches.includes(niche)) {
    input.value = '';
    return;
  }
  currentSourcingNiches.push(niche);
  renderNicheList();
  input.value = '';
}

function handleRemoveNiche(niche) {
  currentSourcingNiches = currentSourcingNiches.filter(n => n !== niche);
  renderNicheList();
}

async function handleSaveSourcingConfig() {
  const region = document.getElementById('sourcingRegion').value.trim();
  const messageEl = document.getElementById('sourcingSaveMessage');
  try {
    const saved = await saveSourcingConfig({ niches: currentSourcingNiches, region });
    messageEl.textContent = `Salvo! Região confirmada: ${saved.resolvedRegion}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 5000);
  } catch (error) {
    messageEl.textContent = `Erro: ${error.message}`;
    messageEl.style.display = 'block';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function handleBuscarAgora() {
  const btn = document.getElementById('btnBuscarAgora');
  if (btn && btn.disabled) return;
  if (btn) { btn.disabled = true; }
  const messageEl = document.getElementById('sourcingSaveMessage');
  try {
    // Salva o que está na tela antes de buscar - senão "Buscar Agora" busca
    // com a última configuração salva, ignorando silenciosamente qualquer
    // nicho/região digitado e ainda não salvo.
    const region = document.getElementById('sourcingRegion').value.trim();
    await saveSourcingConfig({ niches: currentSourcingNiches, region });

    const before = await getSourcingConfig();
    await buscarLeadsAgora();
    messageEl.textContent = 'Busca disparada! Aguardando resultado...';
    messageEl.style.display = 'block';

    // A busca roda em segundo plano no n8n (Overpass pode levar até uns 30s,
    // com retry em caso de sobrecarga) - fica de olho até o resultado mudar,
    // em vez de deixar o usuário sem saber o que aconteceu.
    const maxTentativas = 20;
    for (let tentativa = 0; tentativa < maxTentativas; tentativa++) {
      if (btn) btn.textContent = `Buscando... (${tentativa + 1}/${maxTentativas})`;
      await sleep(3000);
      const depois = await loadSourcingConfig();
      if (depois && depois.lastRunAt && depois.lastRunAt !== before.lastRunAt) {
        messageEl.style.display = 'none';
        return;
      }
    }
    messageEl.textContent = 'Ainda não veio o resultado - a busca pode estar demorando mais que o normal. Recarregue a página em um minuto pra conferir.';
  } catch (error) {
    messageEl.textContent = `Erro: ${error.message}`;
    messageEl.style.display = 'block';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Buscar Agora'; }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

console.log('✅ PROSPEC.AI - App Ready!');
