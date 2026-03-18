/**
 * parser-bazi.js — Extracteur HTML BaZi depuis chinesemetasoft.com
 * Parse le HTML sauvegardé et extrait les blocs A→R
 */

// eslint-disable-next-line no-unused-vars
const BaZiParser = (function () {
    'use strict';

    // ─── Helpers ───────────────────────────────────────────────

    function textContent(el) {
        return el ? el.textContent.trim() : '';
    }

    function findCellValue(doc, label) {
        const cells = doc.querySelectorAll('td, th');
        for (const cell of cells) {
            if (cell.textContent.trim() === label) {
                const next = cell.nextElementSibling;
                if (next) return next.textContent.trim();
            }
        }
        return '';
    }

    function findCellValueContains(doc, label) {
        const cells = doc.querySelectorAll('td, th');
        for (const cell of cells) {
            if (cell.textContent.trim().includes(label)) {
                const next = cell.nextElementSibling;
                if (next) return next.textContent.trim();
            }
        }
        return '';
    }

    function findSectionTable(doc, sectionLabel) {
        const allElements = doc.querySelectorAll('td, th, h2, h3, h4, span, div, b, strong');
        for (const el of allElements) {
            if (el.textContent.trim().includes(sectionLabel)) {
                let parent = el.closest('table');
                if (parent) return parent;
                let sibling = el.nextElementSibling;
                while (sibling) {
                    if (sibling.tagName === 'TABLE') return sibling;
                    const tbl = sibling.querySelector('table');
                    if (tbl) return tbl;
                    sibling = sibling.nextElementSibling;
                }
                parent = el.parentElement;
                while (parent) {
                    const tbl = parent.querySelector('table');
                    if (tbl && tbl !== el.closest('table')) return tbl;
                    const nextTbl = parent.nextElementSibling;
                    if (nextTbl && nextTbl.tagName === 'TABLE') return nextTbl;
                    if (nextTbl) {
                        const inner = nextTbl.querySelector('table');
                        if (inner) return inner;
                    }
                    parent = parent.parentElement;
                }
            }
        }
        return null;
    }

    function extractTrunkFromImg(el) {
        if (!el) return '';
        const img = el.querySelector('img');
        if (img) {
            const alt = img.getAttribute('alt') || '';
            if (alt) return alt.replace(/\.(png|jpg|gif)$/i, '');
            const src = img.getAttribute('src') || '';
            const match = src.match(/\/([^/]+)\.(png|jpg|gif)$/i);
            if (match) return match[1];
        }
        return textContent(el);
    }

    function getTableRows(table) {
        if (!table) return [];
        return Array.from(table.querySelectorAll('tr'));
    }

    function getCells(row) {
        if (!row) return [];
        return Array.from(row.querySelectorAll('td, th'));
    }

    // ─── Bloc A — Détails personnels ──────────────────────────

    function parseBlockA(doc) {
        return {
            nom_complet: findCellValue(doc, 'Nom complet') || findCellValueContains(doc, 'Nom'),
            genre: findCellValue(doc, 'Genre'),
            date_naissance: findCellValue(doc, 'Date de naissance'),
            age: findCellValue(doc, 'Age'),
            charte_id: findCellValue(doc, 'Charte Id') || findCellValue(doc, 'Chart Id')
        };
    }

    // ─── Bloc B — Données astro-géographiques ─────────────────

    function parseBlockB(doc) {
        const fields = [
            'Type de calendrier', 'Lieu', 'Zone de temps', 'Longitude',
            'Heure locale', 'Equation de l\'heure', 'Geo Compensation',
            'DST', 'Heure solaire', 'Jie Qi', 'Date de départ', 'Date de fin'
        ];
        const result = {};
        for (const f of fields) {
            const key = f.replace(/['\s]/g, '_').toLowerCase();
            result[key] = findCellValue(doc, f) || findCellValueContains(doc, f);
        }
        return result;
    }

    // ─── Bloc C — Les 6 Piliers ───────────────────────────────

    function parseBlockC(doc) {
        const pilierNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
        const piliers = {};

        // Find the main chart table (6 pillars)
        // Look for a table containing pillar headers
        const tables = doc.querySelectorAll('table');
        let chartTable = null;

        for (const table of tables) {
            const headerRow = table.querySelector('tr');
            if (!headerRow) continue;
            const cells = getCells(headerRow);
            const headerTexts = cells.map(c => c.textContent.trim());
            // Check if this row contains pillar names
            const hasPillars = pilierNames.some(name =>
                headerTexts.some(t => t.includes(name))
            );
            if (hasPillars && headerTexts.length >= 4) {
                chartTable = table;
                break;
            }
        }

        if (!chartTable) return piliers;

        const rows = getTableRows(chartTable);
        if (rows.length < 2) return piliers;

        // Determine column mapping from header
        const headerCells = getCells(rows[0]);
        const colMap = {};
        headerCells.forEach((cell, idx) => {
            const text = cell.textContent.trim();
            for (const name of pilierNames) {
                if (text.includes(name)) {
                    colMap[name] = idx;
                    break;
                }
            }
        });

        // Parse each row
        for (const name of pilierNames) {
            if (!(name in colMap)) continue;
            piliers[name] = {
                tronc: '',
                tronc_pinyin: '',
                tronc_element: '',
                tronc_polarite: '',
                tronc_aspect: '',
                branche: '',
                branche_pinyin: '',
                branche_animal: '',
                branche_element: '',
                branche_phase_vie: '',
                branche_mv: false,
                troncs_caches: [],
                nayin: ''
            };
        }

        // Extract trunks (typically row index 1 or row labeled "Tronc")
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length === 0) continue;
            const rowLabel = cells[0] ? cells[0].textContent.trim().toLowerCase() : '';

            // Tronc row
            if (rowLabel.includes('tronc') && !rowLabel.includes('cach')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        const trunk = extractTrunkFromImg(cells[idx]);
                        piliers[name].tronc = trunk;
                        piliers[name].tronc_pinyin = trunk;
                    }
                }
            }

            // Branch row
            if (rowLabel.includes('branche') || rowLabel.includes('branch')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        const text = textContent(cells[idx]);
                        piliers[name].branche = text;
                        piliers[name].branche_pinyin = text;
                        // Check for MV
                        if (cells[idx].innerHTML.includes('MV') || text.includes('MV')) {
                            piliers[name].branche_mv = true;
                        }
                    }
                }
            }

            // Element Tronc
            if (rowLabel.includes('element') || rowLabel.includes('élément')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        piliers[name].tronc_element = textContent(cells[idx]);
                    }
                }
            }

            // Polarité
            if (rowLabel.includes('polarit')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        piliers[name].tronc_polarite = textContent(cells[idx]);
                    }
                }
            }

            // Aspect (ShiShen)
            if (rowLabel.includes('aspect') || rowLabel.includes('shishen')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        piliers[name].tronc_aspect = textContent(cells[idx]);
                    }
                }
            }

            // Animal
            if (rowLabel.includes('animal')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        piliers[name].branche_animal = textContent(cells[idx]);
                    }
                }
            }

            // Phase de vie
            if (rowLabel.includes('phase') || rowLabel.includes('florissant') ||
                rowLabel.includes('prospère') || rowLabel.includes('12 etape')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        piliers[name].branche_phase_vie = textContent(cells[idx]);
                    }
                }
            }

            // Troncs cachés
            if (rowLabel.includes('cach') || rowLabel.includes('hidden')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        const val = textContent(cells[idx]);
                        if (val) piliers[name].troncs_caches = val.split(/[,\s]+/).filter(Boolean);
                    }
                }
            }

            // NaYin
            if (rowLabel.includes('nayin') || rowLabel.includes('na yin')) {
                for (const name of pilierNames) {
                    const idx = colMap[name];
                    if (idx !== undefined && cells[idx]) {
                        piliers[name].nayin = textContent(cells[idx]);
                    }
                }
            }
        }

        return piliers;
    }

    // ─── Bloc D — Étoiles auxiliaires ─────────────────────────

    function parseBlockD(doc) {
        const etoiles = {};
        const pilierNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];

        // Look for section with "Etoiles auxiliaires" or AP codes
        const table = findSectionTable(doc, 'toiles auxiliaires') ||
                      findSectionTable(doc, 'Auxiliary Stars') ||
                      findSectionTable(doc, 'AP001');

        if (!table) return etoiles;

        const rows = getTableRows(table);
        // Try to find column mapping
        const headerCells = getCells(rows[0] || document.createElement('tr'));
        const colMap = {};
        headerCells.forEach((cell, idx) => {
            const text = cell.textContent.trim();
            for (const name of pilierNames) {
                if (text.includes(name)) {
                    colMap[name] = idx;
                    break;
                }
            }
        });

        for (const name of pilierNames) {
            etoiles[name] = [];
        }

        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            for (const name of pilierNames) {
                const idx = colMap[name];
                if (idx !== undefined && cells[idx]) {
                    const val = textContent(cells[idx]);
                    if (val) etoiles[name].push(val);
                }
            }
        }

        return etoiles;
    }

    // ─── Bloc E — Relations entre branches ────────────────────

    function parseBlockE(doc) {
        const relations = {};
        const types = [
            '3 Harmonies', 'Combo de 6', 'Punition', 'Clash',
            'Destruction', 'Préjudice', 'Combo des Troncs', 'Clash des Troncs'
        ];

        for (const type of types) {
            const val = findCellValue(doc, type) || findCellValueContains(doc, type);
            if (val) {
                // Parse tags like [H], [J], [M], [A]
                relations[type] = val;
            }
        }

        return relations;
    }

    // ─── Bloc F — Hexagrammes ─────────────────────────────────

    function parseBlockF(doc) {
        const hexagrammes = {};
        const table = findSectionTable(doc, 'Hexagramme') ||
                      findSectionTable(doc, 'hexagramme') ||
                      findSectionTable(doc, 'Trigramme');

        if (!table) return hexagrammes;

        const rows = getTableRows(table);
        const headerCells = getCells(rows[0] || document.createElement('tr'));
        const pilierNames = ['Heure', 'Jour', 'Mois', 'Année'];

        const colMap = {};
        headerCells.forEach((cell, idx) => {
            const text = cell.textContent.trim();
            for (const name of pilierNames) {
                if (text.includes(name)) {
                    colMap[name] = idx;
                    break;
                }
            }
        });

        for (const name of pilierNames) {
            hexagrammes[name] = { trigramme_haut: '', trigramme_bas: '', numero: '', nom: '' };
        }

        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            const label = cells[0] ? cells[0].textContent.trim().toLowerCase() : '';
            for (const name of pilierNames) {
                const idx = colMap[name];
                if (idx === undefined || !cells[idx]) continue;
                const val = textContent(cells[idx]);
                if (label.includes('haut') || label.includes('upper')) {
                    hexagrammes[name].trigramme_haut = val;
                } else if (label.includes('bas') || label.includes('lower')) {
                    hexagrammes[name].trigramme_bas = val;
                } else if (label.includes('num') || label.includes('no')) {
                    hexagrammes[name].numero = val;
                } else if (label.includes('nom') || label.includes('name')) {
                    hexagrammes[name].nom = val;
                }
            }
        }

        return hexagrammes;
    }

    // ─── Bloc G — Groupe/Gua/Famille/Stratagème ──────────────

    function parseBlockG(doc) {
        return {
            groupe: findCellValue(doc, 'Groupe') || findCellValueContains(doc, 'Groupe'),
            en_dehors_du_gua: findCellValue(doc, 'En dehors du Gua') || findCellValueContains(doc, 'Gua'),
            famille: findCellValue(doc, 'Famille'),
            stratageme: findCellValue(doc, 'Stratagème') || findCellValue(doc, 'Stratageme')
        };
    }

    // ─── Bloc H — Base d'analyse ──────────────────────────────

    function parseBlockH(doc) {
        const fields = [
            'Maître du Jour', 'Noble', 'Intelligence', 'Cheval de Ciel',
            'Fleur de Pêcher', 'Solitaire', 'Docteur Céleste',
            'Etoile de la maladie', 'Mort et vide', 'Dieu Utile',
            'He Luo Li Shu', 'Saison', 'Par saison',
            'Score fortifiant', 'Score affaiblissant'
        ];

        const result = {};
        for (const f of fields) {
            const key = f.replace(/[\s']/g, '_').toLowerCase();
            result[key] = findCellValue(doc, f) || findCellValueContains(doc, f);
        }

        // Fort / Faible
        const fort = findCellValue(doc, 'Fort') || findCellValueContains(doc, 'Fort');
        const faible = findCellValue(doc, 'Faible') || findCellValueContains(doc, 'Faible');
        result.force = fort ? 'Fort' : (faible ? 'Faible' : '');

        return result;
    }

    // ─── Bloc I — 10 Aspects ──────────────────────────────────

    function parseBlockI(doc) {
        const aspects = [];
        const table = findSectionTable(doc, '10 Aspects') ||
                      findSectionTable(doc, 'Aspects') ||
                      findSectionTable(doc, 'Ten Gods');

        if (!table) return aspects;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 3) continue;
            const aspect = {
                code: textContent(cells[0]),
                nom_francais: textContent(cells[1]),
                nom_chinois: cells[2] ? textContent(cells[2]) : '',
                tronc: cells[3] ? textContent(cells[3]) : '',
                score: cells[4] ? parseFloat(textContent(cells[4])) || 0 : 0
            };
            if (aspect.code) aspects.push(aspect);
        }

        // Sort by score descending
        aspects.sort((a, b) => b.score - a.score);
        return aspects;
    }

    // ─── Bloc J — 5 Éléments ──────────────────────────────────

    function parseBlockJ(doc) {
        const elements = [];
        const elementMap = {
            'Feu': { emoji: '\uD83D\uDD34', color: 'feu' },
            'Bois': { emoji: '\uD83D\uDFE2', color: 'bois' },
            'Eau': { emoji: '\uD83D\uDD35', color: 'eau' },
            'Métal': { emoji: '\uD83D\uDFE1', color: 'metal' },
            'Metal': { emoji: '\uD83D\uDFE1', color: 'metal' },
            'Terre': { emoji: '\uD83D\uDFE4', color: 'terre' }
        };

        // Search for percentage patterns in the document
        const cells = doc.querySelectorAll('td');
        for (const cell of cells) {
            const text = cell.textContent.trim();
            // Pattern: "XX% - Type - Element" or similar
            const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
            if (match) {
                for (const [elemName, info] of Object.entries(elementMap)) {
                    if (text.includes(elemName)) {
                        elements.push({
                            nom: elemName,
                            pourcentage: parseFloat(match[1]),
                            emoji: info.emoji,
                            css_class: info.color
                        });
                        break;
                    }
                }
            }
        }

        // Also try finding via table structure
        if (elements.length === 0) {
            const table = findSectionTable(doc, 'Elément') ||
                          findSectionTable(doc, 'Element') ||
                          findSectionTable(doc, '5 Elements');
            if (table) {
                const rows = getTableRows(table);
                for (let r = 1; r < rows.length; r++) {
                    const cells2 = getCells(rows[r]);
                    if (cells2.length < 2) continue;
                    const name = textContent(cells2[0]);
                    const pctText = textContent(cells2[1]);
                    const pctMatch = pctText.match(/(\d+(?:\.\d+)?)/);
                    const info = elementMap[name];
                    if (info && pctMatch) {
                        elements.push({
                            nom: name,
                            pourcentage: parseFloat(pctMatch[1]),
                            emoji: info.emoji,
                            css_class: info.color
                        });
                    }
                }
            }
        }

        return elements;
    }

    // ─── Bloc K — Analyse intermédiaire ───────────────────────

    function parseBlockK(doc) {
        return {
            jours_particuliers: findCellValue(doc, 'Jours particuliers') || findCellValueContains(doc, 'Jours particuliers'),
            structure: findCellValue(doc, 'Structure') || findCellValueContains(doc, 'Structure'),
            bon: findCellValue(doc, 'Bon'),
            mauvais: findCellValue(doc, 'Mauvais'),
            relations: findCellValue(doc, 'Relations') || findCellValueContains(doc, 'Relations')
        };
    }

    // ─── Bloc L — Piliers de Chance ───────────────────────────

    function parseBlockL(doc) {
        const piliers = [];
        const table = findSectionTable(doc, 'Pilier de Chance') ||
                      findSectionTable(doc, 'Piliers de Chance') ||
                      findSectionTable(doc, 'Luck Pillar') ||
                      findSectionTable(doc, 'Da Yun');

        if (!table) return piliers;

        const rows = getTableRows(table);
        if (rows.length < 2) return piliers;

        // Try to determine structure from headers
        const headerCells = getCells(rows[0]);
        const headers = headerCells.map(c => c.textContent.trim().toLowerCase());

        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;

            const pc = {
                age: '',
                periode: '',
                tronc: '',
                branche: '',
                phase_vie: '',
                troncs_caches: [],
                nayin: ''
            };

            // Map cells based on header labels
            cells.forEach((cell, idx) => {
                const h = headers[idx] || '';
                const val = textContent(cell);
                if (h.includes('age') || h.includes('âge')) pc.age = val;
                else if (h.includes('period') || h.includes('période')) pc.periode = val;
                else if (h.includes('tronc') && !h.includes('cach')) pc.tronc = extractTrunkFromImg(cell);
                else if (h.includes('branche') || h.includes('branch')) pc.branche = val;
                else if (h.includes('phase')) pc.phase_vie = val;
                else if (h.includes('cach') || h.includes('hidden')) {
                    pc.troncs_caches = val.split(/[,\s]+/).filter(Boolean);
                }
                else if (h.includes('nayin') || h.includes('na yin')) pc.nayin = val;
            });

            // Fallback: positional
            if (!pc.tronc && cells.length >= 3) {
                pc.age = textContent(cells[0]);
                pc.tronc = extractTrunkFromImg(cells[1]);
                pc.branche = textContent(cells[2]);
            }

            if (pc.tronc || pc.branche) piliers.push(pc);
        }

        return piliers;
    }

    // ─── Bloc M — Étoiles PC ──────────────────────────────────

    function parseBlockM(doc) {
        const etoilesPC = [];
        // Search for tables after the luck pillars section with star data
        const table = findSectionTable(doc, 'toiles des Piliers de Chance') ||
                      findSectionTable(doc, 'Luck Pillar Stars');

        if (!table) return etoilesPC;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            etoilesPC.push({
                pilier: textContent(cells[0]),
                etoiles: Array.from(cells).slice(1).map(c => textContent(c)).filter(Boolean)
            });
        }

        return etoilesPC;
    }

    // ─── Bloc N — Relations PC ────────────────────────────────

    function parseBlockN(doc) {
        const relationsPC = [];
        const table = findSectionTable(doc, 'Relations des Piliers de Chance') ||
                      findSectionTable(doc, 'Luck Pillar Relations');

        if (!table) return relationsPC;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            relationsPC.push({
                pilier: textContent(cells[0]),
                relations: Array.from(cells).slice(1).map(c => textContent(c)).filter(Boolean)
            });
        }

        return relationsPC;
    }

    // ─── Bloc O — Hexagrammes PC ──────────────────────────────

    function parseBlockO(doc) {
        const hexPC = [];
        const table = findSectionTable(doc, 'Hexagrammes des Piliers') ||
                      findSectionTable(doc, 'Luck Pillar Hexagram');

        if (!table) return hexPC;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            hexPC.push({
                pilier: textContent(cells[0]),
                hexagramme: textContent(cells[1]),
                stratageme: cells[2] ? textContent(cells[2]) : ''
            });
        }

        return hexPC;
    }

    // ─── Bloc P — Piliers annuels (Liu Nian) ──────────────────

    function parseBlockP(doc) {
        const liuNian = [];
        const table = findSectionTable(doc, 'Liu Nian') ||
                      findSectionTable(doc, 'Piliers Annuels') ||
                      findSectionTable(doc, 'Annual Pillar');

        if (!table) return liuNian;

        const rows = getTableRows(table);
        for (const row of rows) {
            const cells = getCells(row);
            const rowData = cells.map(c => textContent(c));
            if (rowData.some(v => v)) liuNian.push(rowData);
        }

        return liuNian;
    }

    // ─── Bloc Q — Ba Zhai (8 Demeures) ────────────────────────

    function parseBlockQ(doc) {
        const baZhai = {
            chiffre_gua: findCellValue(doc, 'Chiffre Gua') || findCellValueContains(doc, 'Chiffre Gua'),
            etoile_vie: findCellValue(doc, 'Etoile de la vie') || findCellValueContains(doc, 'Etoile de la vie'),
            groupe: findCellValue(doc, 'Groupe') || '',
            favorables: [],
            defavorables: []
        };

        const favorableNames = ['Sheng Qi', 'Tian Yi', 'Yan Nian', 'Fu Wei'];
        const defavorableNames = ['Huo Hai', 'Wu Gui', 'Liu Sha', 'Jue Ming'];

        for (const name of favorableNames) {
            const dir = findCellValue(doc, name) || findCellValueContains(doc, name);
            if (dir) baZhai.favorables.push({ nom: name, direction: dir });
        }

        for (const name of defavorableNames) {
            const dir = findCellValue(doc, name) || findCellValueContains(doc, name);
            if (dir) baZhai.defavorables.push({ nom: name, direction: dir });
        }

        return baZhai;
    }

    // ─── Bloc R — QMDJ basique ────────────────────────────────

    function parseBlockR(doc) {
        return {
            palais_destinee: findCellValue(doc, 'Palais de Destinée') || findCellValueContains(doc, 'Palais de Destin'),
            direction: findCellValue(doc, 'Direction'),
            tronc_vie: findCellValue(doc, 'Tronc de vie') || findCellValueContains(doc, 'Tronc de vie'),
            etoile: findCellValue(doc, 'Etoile') || findCellValueContains(doc, 'Etoile'),
            porte: findCellValue(doc, 'Porte'),
            gardien: findCellValue(doc, 'Gardien'),
            combinaison: findCellValue(doc, 'Combinaison')
        };
    }

    // ─── Main Parse Function ──────────────────────────────────

    function parse(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        return {
            type: 'bazi',
            blocA: parseBlockA(doc),
            blocB: parseBlockB(doc),
            blocC: parseBlockC(doc),
            blocD: parseBlockD(doc),
            blocE: parseBlockE(doc),
            blocF: parseBlockF(doc),
            blocG: parseBlockG(doc),
            blocH: parseBlockH(doc),
            blocI: parseBlockI(doc),
            blocJ: parseBlockJ(doc),
            blocK: parseBlockK(doc),
            blocL: parseBlockL(doc),
            blocM: parseBlockM(doc),
            blocN: parseBlockN(doc),
            blocO: parseBlockO(doc),
            blocP: parseBlockP(doc),
            blocQ: parseBlockQ(doc),
            blocR: parseBlockR(doc)
        };
    }

    return { parse: parse };
})();
