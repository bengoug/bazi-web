/**
 * parser-zhirun.js — Extracteur HTML Zhi Run (QMDJ Destinée)
 * Parse le HTML sauvegardé depuis chinesemetasoft.com/QiMenDunJia
 * Extrait les blocs S1→S7
 */

// eslint-disable-next-line no-unused-vars
const ZhiRunParser = (function () {
    'use strict';

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
            }
        }
        return null;
    }

    function getTableRows(table) {
        return table ? Array.from(table.querySelectorAll('tr')) : [];
    }

    function getCells(row) {
        return row ? Array.from(row.querySelectorAll('td, th')) : [];
    }

    // ─── Bloc S1 — Infos de base ──────────────────────────────

    function parseS1(doc) {
        return {
            structure: findCellValue(doc, 'Structure') || findCellValueContains(doc, 'Structure'),
            tronc_meneur: findCellValue(doc, 'Tronc meneur') || findCellValueContains(doc, 'Tronc meneur'),
            envoye: findCellValue(doc, 'Envoyé') || findCellValueContains(doc, 'Envoy'),
            porte_meneuse: findCellValue(doc, 'Porte meneuse') || findCellValueContains(doc, 'Porte meneuse'),
            etoile_meneuse: findCellValue(doc, 'Etoile meneuse') || findCellValueContains(doc, 'Etoile meneuse') || findCellValueContains(doc, 'toile meneuse'),
            constellations_28: findCellValue(doc, '28 Constellations') || findCellValueContains(doc, '28 Constellation'),
            jia_se_cache: findCellValue(doc, 'Jia se cache en') || findCellValueContains(doc, 'Jia se cache'),
            cheval_ciel: findCellValue(doc, 'Cheval de Ciel') || findCellValueContains(doc, 'Cheval de Ciel'),
            mort_vide: findCellValue(doc, 'Mort et Vide') || findCellValueContains(doc, 'Mort et Vide') || findCellValueContains(doc, 'Mort et vide'),
            noble: findCellValue(doc, 'Noble') || findCellValueContains(doc, 'Noble')
        };
    }

    // ─── Bloc S2 — Les 9 Palais ──────────────────────────────

    function parseS2(doc) {
        const palais = {};
        const directions = ['SE', 'S', 'SO', 'E', 'Centre', 'O', 'NE', 'N', 'NO'];

        // The 9 palaces are typically in a 3x3 grid table
        const tables = doc.querySelectorAll('table');
        for (const table of tables) {
            const rows = getTableRows(table);
            // Look for a 3x3 grid structure (or variations)
            if (rows.length >= 3) {
                const firstRowCells = getCells(rows[0]);
                // Check if cells contain palace-like content (tronc, etoile, porte, etc.)
                let isPalaceGrid = false;
                for (const cell of firstRowCells) {
                    const text = cell.textContent.trim();
                    // Palace cells often contain multiple lines with star/door/deity names
                    if (text.length > 10 && (text.includes('\n') || cell.querySelector('br'))) {
                        isPalaceGrid = true;
                        break;
                    }
                }

                if (isPalaceGrid) {
                    // Map grid positions to directions
                    // Standard: row0=[SE, S, SO], row1=[E, Centre, O], row2=[NE, N, NO]
                    const dirGrid = [
                        ['SE', 'S', 'SO'],
                        ['E', 'Centre', 'O'],
                        ['NE', 'N', 'NO']
                    ];

                    for (let r = 0; r < Math.min(rows.length, 3); r++) {
                        const cells = getCells(rows[r]);
                        for (let c = 0; c < Math.min(cells.length, 3); c++) {
                            const dir = dirGrid[r] && dirGrid[r][c];
                            if (!dir) continue;
                            const cellText = cells[c].innerHTML;
                            // Extract components from cell
                            const lines = cells[c].textContent.split(/\n/).map(l => l.trim()).filter(Boolean);
                            palais[dir] = {
                                tronc: lines[0] || '',
                                etoile: lines[1] || '',
                                porte: lines[2] || '',
                                gardien: lines[3] || '',
                                hexagramme: lines[4] || '',
                                raw: cellText
                            };
                        }
                    }
                    if (Object.keys(palais).length > 0) break;
                }
            }
        }

        // Fallback: look for individual palace data by direction name
        if (Object.keys(palais).length === 0) {
            for (const dir of directions) {
                const val = findCellValue(doc, dir);
                if (val) {
                    palais[dir] = { raw: val };
                }
            }
        }

        return palais;
    }

    // ─── Bloc S3 — Formations de palais ──────────────────────

    function parseS3(doc) {
        const formations = [];
        const table = findSectionTable(doc, 'Formation de palais') ||
                      findSectionTable(doc, 'Formations de palais') ||
                      findSectionTable(doc, 'Palace Formation');

        if (!table) return formations;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            formations.push({
                nom_chinois: textContent(cells[0]),
                nom_francais: cells[1] ? textContent(cells[1]) : '',
                palais: cells[2] ? textContent(cells[2]) : '',
                description: cells[3] ? textContent(cells[3]) : '',
                favorable: cells[3] ? !textContent(cells[3]).toLowerCase().includes('défavorable') &&
                                      !textContent(cells[3]).toLowerCase().includes('defavorable') : true
            });
        }

        return formations;
    }

    // ─── Bloc S4 — Formations de troncs ──────────────────────

    function parseS4(doc) {
        const formations = [];
        const table = findSectionTable(doc, 'Formation de tronc') ||
                      findSectionTable(doc, 'Formations de troncs') ||
                      findSectionTable(doc, 'Stem Formation');

        if (!table) return formations;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            formations.push({
                numero: textContent(cells[0]),
                nom_chinois: cells[1] ? textContent(cells[1]) : '',
                nom_francais: cells[2] ? textContent(cells[2]) : '',
                description: cells[3] ? textContent(cells[3]) : ''
            });
        }

        return formations;
    }

    // ─── Bloc S5 — Formations spéciales ──────────────────────

    function parseS5(doc) {
        const formations = [];
        const table = findSectionTable(doc, 'Formation sp') ||
                      findSectionTable(doc, 'Formations spéciales') ||
                      findSectionTable(doc, 'Special Formation');

        if (!table) return formations;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            formations.push({
                numero: textContent(cells[0]),
                nom_chinois: cells[1] ? textContent(cells[1]) : '',
                nom_francais: cells[2] ? textContent(cells[2]) : '',
                description: cells[3] ? textContent(cells[3]) : ''
            });
        }

        return formations;
    }

    // ─── Bloc S6 — Stratégies (36 Stratagèmes) ──────────────

    function parseS6(doc) {
        const strategies = [];
        const table = findSectionTable(doc, 'Strat') ||
                      findSectionTable(doc, '36 Stratag') ||
                      findSectionTable(doc, 'Strategem');

        if (!table) return strategies;

        const rows = getTableRows(table);
        for (let r = 1; r < rows.length; r++) {
            const cells = getCells(rows[r]);
            if (cells.length < 2) continue;
            strategies.push({
                numero: textContent(cells[0]),
                categorie: cells[1] ? textContent(cells[1]) : '',
                nom: cells[2] ? textContent(cells[2]) : '',
                description: cells[3] ? textContent(cells[3]) : ''
            });
        }

        return strategies;
    }

    // ─── Bloc S7 — Informations complémentaires ──────────────

    function parseS7(doc) {
        return {
            trois_victoires: findCellValue(doc, '3 Victoires') || findCellValueContains(doc, '3 Victoires') || findCellValueContains(doc, 'Trois Victoires'),
            yi_celeste: findCellValue(doc, 'Yi Céleste') || findCellValueContains(doc, 'Yi C'),
            palais_interieurs: findCellValue(doc, 'Palais intérieurs') || findCellValueContains(doc, 'Palais int'),
            palais_exterieurs: findCellValue(doc, 'Palais extérieurs') || findCellValueContains(doc, 'Palais ext'),
            clash_jour: findCellValue(doc, 'Clash jour') || findCellValueContains(doc, 'Clash jour'),
            clash_heure: findCellValue(doc, 'Clash heure') || findCellValueContains(doc, 'Clash heure')
        };
    }

    // ─── Main Parse Function ──────────────────────────────────

    function parse(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        return {
            type: 'zhirun',
            blocS1: parseS1(doc),
            blocS2: parseS2(doc),
            blocS3: parseS3(doc),
            blocS4: parseS4(doc),
            blocS5: parseS5(doc),
            blocS6: parseS6(doc),
            blocS7: parseS7(doc)
        };
    }

    return { parse: parse };
})();
