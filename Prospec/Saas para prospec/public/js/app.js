// public/js/app.js - Main Application Logic
// Status: FASE 1 - Implemented

import { analyzeNewProspect, continueConversation, getProspects, getProspect } from './api.js';
import { getTheme, saveTheme } from './storage-local.js';

console.log('🎯 PROSPEC.AI - App Loading...');

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

  try {
    const result = await continueConversation({
      id: prospectId,
      resposta: resposta
    });

    displayContinueAnalysis(result);
  } catch (error) {
    console.error('❌ Erro ao continuar conversa:', error);
    showError('continueAnalysisResult', `Erro: ${error.message}`);
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
    showNotification('✅ Copiado para a área de transferência!');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showNotification('❌ Erro ao copiar', 'error');
  });
}

/**
 * Load prospects list
 */
async function loadProspectsList() {
  console.log('📋 Carregando lista de prospects...');
  try {
    const prospects = await getProspects();
    displayProspectsList(prospects);
  } catch (error) {
    console.error('❌ Erro ao carregar prospects:', error);
  }
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
      <div class="prospect-item-company">${p.empresa}</div>
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
    btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  }
}

/**
 * Get selected prospect ID
 */
function getSelectedProspectId() {
  const selected = document.querySelector('.prospect-item.active');
  return selected ? selected.dataset.id : null;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

console.log('✅ PROSPEC.AI - App Ready!');
