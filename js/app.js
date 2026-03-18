/**
 * app.js — Logique UI, drag & drop, extraction, stockage GitHub
 */

(function () {
    'use strict';

    // ─── State ────────────────────────────────────────────────

    let currentFile = null;       // { name, content (string) }
    let extractionHTML = null;    // Generated HTML string
    let extractionData = null;    // Parsed data object

    // ─── DOM Refs ─────────────────────────────────────────────

    const configToggle = document.getElementById('configToggle');
    const configPanel = document.getElementById('configPanel');
    const configArrow = document.getElementById('configArrow');
    const githubToken = document.getElementById('githubToken');
    const githubRepo = document.getElementById('githubRepo');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const configStatus = document.getElementById('configStatus');

    const personSelect = document.getElementById('personSelect');
    const addPersonBtn = document.getElementById('addPersonBtn');
    const fileType = document.getElementById('fileType');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileNameEl = document.getElementById('fileName');

    const extractBtn = document.getElementById('extractBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const storeBtn = document.getElementById('storeBtn');
    const actionStatus = document.getElementById('actionStatus');

    const previewArea = document.getElementById('previewArea');
    const previewFrame = document.getElementById('previewFrame');

    const refreshFilesBtn = document.getElementById('refreshFilesBtn');
    const filesStatus = document.getElementById('filesStatus');
    const filesList = document.getElementById('filesList');

    // Tab elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // ─── Init ─────────────────────────────────────────────────

    function init() {
        loadConfig();
        loadPersons();
        setupEventListeners();
    }

    // ─── Config ───────────────────────────────────────────────

    function loadConfig() {
        githubToken.value = localStorage.getItem('bazi_github_token') || '';
        githubRepo.value = localStorage.getItem('bazi_github_repo') || '';
    }

    function saveConfig() {
        localStorage.setItem('bazi_github_token', githubToken.value.trim());
        localStorage.setItem('bazi_github_repo', githubRepo.value.trim());
        showStatus(configStatus, 'Configuration sauvegardée', 'success');
    }

    // ─── Persons ──────────────────────────────────────────────

    function loadPersons() {
        const persons = getPersons();
        personSelect.innerHTML = '<option value="">-- Choisir --</option>';
        for (const p of persons) {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            personSelect.appendChild(opt);
        }
    }

    function getPersons() {
        try {
            return JSON.parse(localStorage.getItem('bazi_persons') || '[]');
        } catch (_e) {
            return [];
        }
    }

    function addPerson() {
        const name = prompt('Nom de la personne :');
        if (!name || !name.trim()) return;
        const persons = getPersons();
        const clean = name.trim();
        if (!persons.includes(clean)) {
            persons.push(clean);
            localStorage.setItem('bazi_persons', JSON.stringify(persons));
        }
        loadPersons();
        personSelect.value = clean;
    }

    // ─── Event Listeners ──────────────────────────────────────

    function setupEventListeners() {
        // Config
        configToggle.addEventListener('click', function () {
            configPanel.classList.toggle('visible');
            configArrow.textContent = configPanel.classList.contains('visible') ? '\u25B2' : '\u25BC';
        });
        saveConfigBtn.addEventListener('click', saveConfig);

        // Tabs
        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                const tab = btn.getAttribute('data-tab');
                tabBtns.forEach(function (b) { b.classList.remove('active'); });
                tabContents.forEach(function (c) { c.classList.remove('active'); });
                btn.classList.add('active');
                document.getElementById('tab-' + tab).classList.add('active');
            });
        });

        // Person
        addPersonBtn.addEventListener('click', addPerson);

        // File input
        dropZone.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', handleFileSelect);

        // Drag & drop
        dropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', function () {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                readFile(e.dataTransfer.files[0]);
            }
        });

        // Buttons
        extractBtn.addEventListener('click', doExtract);
        downloadBtn.addEventListener('click', doDownload);
        storeBtn.addEventListener('click', doStore);
        refreshFilesBtn.addEventListener('click', doRefreshFiles);
    }

    // ─── File Handling ────────────────────────────────────────

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            readFile(e.target.files[0]);
        }
    }

    function readFile(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentFile = { name: file.name, content: e.target.result };
            fileNameEl.textContent = file.name;
            fileNameEl.style.display = 'block';
            extractBtn.disabled = false;
            downloadBtn.disabled = true;
            storeBtn.disabled = true;
            extractionHTML = null;
            extractionData = null;
            previewArea.classList.remove('visible');
            showStatus(actionStatus, 'Fichier chargé : ' + file.name, 'info');
        };
        reader.readAsText(file, 'utf-8');
    }

    // ─── Extraction ───────────────────────────────────────────

    function doExtract() {
        if (!currentFile) return;

        const type = fileType.value;
        const person = personSelect.value || 'Inconnu';

        try {
            if (type === 'bazi') {
                extractionData = BaZiParser.parse(currentFile.content);
            } else if (type === 'zhirun') {
                extractionData = ZhiRunParser.parse(currentFile.content);
            } else {
                // QMDJ — use BaZi parser as fallback (similar structure)
                extractionData = BaZiParser.parse(currentFile.content);
                extractionData.type = 'qmdj';
            }

            extractionHTML = Formatter.format(extractionData, person);

            // Show preview
            previewFrame.srcdoc = extractionHTML;
            previewArea.classList.add('visible');

            downloadBtn.disabled = false;
            storeBtn.disabled = false;

            showStatus(actionStatus, 'Extraction réussie !', 'success');
        } catch (err) {
            showStatus(actionStatus, 'Erreur d\'extraction : ' + err.message, 'error');
        }
    }

    // ─── Download ─────────────────────────────────────────────

    function doDownload() {
        if (!extractionHTML) return;
        const person = personSelect.value || 'Inconnu';
        const type = fileType.value;
        const typeLabel = type === 'bazi' ? 'BaZi' : (type === 'zhirun' ? 'ZhiRun' : 'QMDJ');
        const filename = typeLabel + '_Extraction_' + person + '.html';

        const blob = new Blob([extractionHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ─── GitHub Storage ───────────────────────────────────────

    function getGitHubConfig() {
        const token = localStorage.getItem('bazi_github_token') || '';
        const repo = localStorage.getItem('bazi_github_repo') || '';
        if (!token || !repo) return null;
        return { token: token, repo: repo };
    }

    async function githubPutFile(config, path, content, message) {
        const url = 'https://api.github.com/repos/' + config.repo + '/contents/' + path;

        // Check if file exists (to get SHA for update)
        let sha = null;
        try {
            const resp = await fetch(url, {
                headers: { 'Authorization': 'token ' + config.token }
            });
            if (resp.ok) {
                const data = await resp.json();
                sha = data.sha;
            }
        } catch (_e) {
            // File does not exist, that's fine
        }

        const body = {
            message: message,
            content: btoa(unescape(encodeURIComponent(content)))
        };
        if (sha) body.sha = sha;

        const resp = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'token ' + config.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const err = await resp.json().catch(function () { return {}; });
            throw new Error('GitHub API: ' + (err.message || resp.statusText));
        }

        return resp.json();
    }

    async function doStore() {
        if (!currentFile || !extractionHTML) return;

        const config = getGitHubConfig();
        if (!config) {
            showStatus(actionStatus, 'Configurez votre token et repo GitHub d\'abord', 'error');
            return;
        }

        const person = (personSelect.value || 'inconnu').toLowerCase().replace(/\s+/g, '_');
        const type = fileType.value;
        const typeLabel = type === 'bazi' ? 'BaZi' : (type === 'zhirun' ? 'ZhiRun' : 'QMDJ');

        const sourcePath = 'data/' + person + '/source/' + currentFile.name;
        const extractionPath = 'data/' + person + '/extraction/' + typeLabel + '_Extraction_' + personSelect.value + '.html';

        storeBtn.disabled = true;
        showStatus(actionStatus, 'Upload en cours...', 'info');

        try {
            await githubPutFile(config, sourcePath, currentFile.content,
                'Add source: ' + currentFile.name);
            await githubPutFile(config, extractionPath, extractionHTML,
                'Add extraction: ' + typeLabel + ' for ' + personSelect.value);

            showStatus(actionStatus, 'Fichiers stockés sur GitHub !', 'success');
        } catch (err) {
            showStatus(actionStatus, 'Erreur GitHub : ' + err.message, 'error');
        } finally {
            storeBtn.disabled = false;
        }
    }

    // ─── File Listing ─────────────────────────────────────────

    async function doRefreshFiles() {
        const config = getGitHubConfig();
        if (!config) {
            showStatus(filesStatus, 'Configurez votre token et repo GitHub d\'abord', 'error');
            return;
        }

        showStatus(filesStatus, 'Chargement...', 'info');

        try {
            const persons = await listDirectory(config, 'data');
            if (persons.length === 0) {
                filesList.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128193;</div><p>Aucun fichier stocké</p></div>';
                showStatus(filesStatus, '', '');
                return;
            }

            let html = '';
            for (const person of persons) {
                if (person.type !== 'dir') continue;
                html += '<div class="person-group"><h3>' + escHTML(person.name) + '</h3><div class="file-list">';

                // List source and extraction
                for (const subDir of ['source', 'extraction']) {
                    const files = await listDirectory(config, person.path + '/' + subDir);
                    for (const file of files) {
                        if (file.type !== 'file') continue;
                        const badge = subDir === 'source' ? 'badge-source' : 'badge-extraction';
                        const badgeLabel = subDir === 'source' ? 'Source' : 'Extraction';
                        html += '<div class="file-item">' +
                            '<div class="file-info">' +
                            '<span class="file-type-badge ' + badge + '">' + badgeLabel + '</span>' +
                            '<span>' + escHTML(file.name) + '</span>' +
                            '</div>' +
                            '<div class="file-actions">' +
                            '<button class="btn btn-secondary btn-sm" onclick="App.downloadGitHubFile(\'' +
                            escAttr(file.path) + '\', \'' + escAttr(file.name) + '\')">Telecharger</button>' +
                            '<button class="btn btn-danger btn-sm" onclick="App.deleteGitHubFile(\'' +
                            escAttr(file.path) + '\')">Supprimer</button>' +
                            '</div></div>';
                    }
                }

                html += '</div></div>';
            }

            filesList.innerHTML = html;
            showStatus(filesStatus, '', '');
        } catch (err) {
            showStatus(filesStatus, 'Erreur : ' + err.message, 'error');
        }
    }

    async function listDirectory(config, path) {
        const url = 'https://api.github.com/repos/' + config.repo + '/contents/' + path;
        const resp = await fetch(url, {
            headers: { 'Authorization': 'token ' + config.token }
        });
        if (!resp.ok) {
            if (resp.status === 404) return [];
            throw new Error('GitHub API: ' + resp.statusText);
        }
        return resp.json();
    }

    async function downloadGitHubFile(path, name) {
        const config = getGitHubConfig();
        if (!config) return;

        try {
            const url = 'https://api.github.com/repos/' + config.repo + '/contents/' + path;
            const resp = await fetch(url, {
                headers: { 'Authorization': 'token ' + config.token }
            });
            const data = await resp.json();
            const content = decodeURIComponent(escape(atob(data.content)));

            const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            alert('Erreur : ' + err.message);
        }
    }

    async function deleteGitHubFile(path) {
        if (!confirm('Supprimer ce fichier ?')) return;

        const config = getGitHubConfig();
        if (!config) return;

        try {
            const url = 'https://api.github.com/repos/' + config.repo + '/contents/' + path;
            const resp = await fetch(url, {
                headers: { 'Authorization': 'token ' + config.token }
            });
            const data = await resp.json();

            await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'token ' + config.token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Delete: ' + path,
                    sha: data.sha
                })
            });

            doRefreshFiles();
        } catch (err) {
            alert('Erreur : ' + err.message);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────

    function showStatus(el, message, type) {
        if (!message) {
            el.style.display = 'none';
            el.classList.remove('visible');
            return;
        }
        el.textContent = message;
        el.className = 'status visible status-' + type;
    }

    function escHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escAttr(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ─── Public API (for inline event handlers) ───────────────

    window.App = {
        downloadGitHubFile: downloadGitHubFile,
        deleteGitHubFile: deleteGitHubFile
    };

    // ─── Start ────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
