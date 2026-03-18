/**
 * formatter.js — Génère le HTML d'extraction formaté (autonome)
 * Produit un fichier HTML complet avec CSS intégré, emojis, tableaux colorés
 */

// eslint-disable-next-line no-unused-vars
const Formatter = (function () {
    'use strict';

    const ELEMENT_EMOJI = {
        'Feu': '\uD83D\uDD34',
        'Bois': '\uD83D\uDFE2',
        'Eau': '\uD83D\uDD35',
        'M\u00E9tal': '\uD83D\uDFE1',
        'Metal': '\uD83D\uDFE1',
        'Terre': '\uD83D\uDFE4'
    };

    function esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function elementClass(text) {
        if (!text) return '';
        const t = text.toLowerCase();
        if (t.includes('feu') || t.includes('fire')) return 'feu';
        if (t.includes('bois') || t.includes('wood')) return 'bois';
        if (t.includes('eau') || t.includes('water')) return 'eau';
        if (t.includes('métal') || t.includes('metal')) return 'metal';
        if (t.includes('terre') || t.includes('earth')) return 'terre';
        return '';
    }

    function addElementEmoji(text) {
        if (!text) return '';
        for (const [name, emoji] of Object.entries(ELEMENT_EMOJI)) {
            if (text.includes(name)) return emoji + ' ' + text;
        }
        return text;
    }

    function kvRow(label, value) {
        if (!value) return '';
        return '<tr><td><strong>' + esc(label) + '</strong></td><td>' + esc(value) + '</td></tr>';
    }

    // ─── BaZi Formatter ──────────────────────────────────────

    function formatBaZi(data, personName) {
        let html = '';

        // Bloc A
        html += blocHeader('A', 'Détails personnels');
        const a = data.blocA || {};
        html += '<table>' +
            kvRow('Nom complet', a.nom_complet) +
            kvRow('Genre', a.genre) +
            kvRow('Date de naissance', a.date_naissance) +
            kvRow('Age', a.age) +
            kvRow('Charte Id', a.charte_id) +
            '</table>';

        // Bloc B
        html += blocHeader('B', 'Données astro-géographiques');
        const b = data.blocB || {};
        html += '<table>';
        for (const [key, val] of Object.entries(b)) {
            if (val) html += kvRow(key.replace(/_/g, ' '), val);
        }
        html += '</table>';

        // Bloc C — 6 Piliers
        html += blocHeader('C', 'Les 6 Piliers');
        const c = data.blocC || {};
        const pilierNames = ['Heure', 'Jour', 'Mois', 'Année', 'Conception', 'Palais de vie'];
        const activePiliers = pilierNames.filter(n => c[n]);

        if (activePiliers.length > 0) {
            html += '<table><tr><th></th>';
            for (const name of activePiliers) html += '<th>' + esc(name) + '</th>';
            html += '</tr>';

            // Tronc
            html += '<tr><td><strong>Tronc</strong></td>';
            for (const name of activePiliers) {
                const p = c[name];
                html += '<td class="' + elementClass(p.tronc_element) + '">' +
                    addElementEmoji(esc(p.tronc || p.tronc_pinyin)) + '</td>';
            }
            html += '</tr>';

            // Element + Polarité
            html += '<tr><td><strong>Élément</strong></td>';
            for (const name of activePiliers) {
                const p = c[name];
                html += '<td class="' + elementClass(p.tronc_element) + '">' +
                    esc(p.tronc_element) + ' ' + esc(p.tronc_polarite) + '</td>';
            }
            html += '</tr>';

            // Aspect
            html += '<tr><td><strong>Aspect</strong></td>';
            for (const name of activePiliers) {
                html += '<td>' + esc(c[name].tronc_aspect) + '</td>';
            }
            html += '</tr>';

            // Branche
            html += '<tr><td><strong>Branche</strong></td>';
            for (const name of activePiliers) {
                const p = c[name];
                const mvClass = p.branche_mv ? ' mv' : '';
                html += '<td class="' + elementClass(p.branche_element) + mvClass + '">' +
                    esc(p.branche || p.branche_pinyin) +
                    (p.branche_animal ? ' (' + esc(p.branche_animal) + ')' : '') +
                    (p.branche_mv ? ' <strong>MV</strong>' : '') + '</td>';
            }
            html += '</tr>';

            // Phase de vie
            html += '<tr><td><strong>Phase de vie</strong></td>';
            for (const name of activePiliers) {
                html += '<td>' + esc(c[name].branche_phase_vie) + '</td>';
            }
            html += '</tr>';

            // Troncs cachés
            html += '<tr><td><strong>Troncs cachés</strong></td>';
            for (const name of activePiliers) {
                html += '<td>' + esc((c[name].troncs_caches || []).join(', ')) + '</td>';
            }
            html += '</tr>';

            // NaYin
            html += '<tr><td><strong>NaYin</strong></td>';
            for (const name of activePiliers) {
                html += '<td>' + esc(c[name].nayin) + '</td>';
            }
            html += '</tr>';

            html += '</table>';
        }

        // Bloc D — Étoiles auxiliaires
        html += blocHeader('D', 'Étoiles auxiliaires');
        const d = data.blocD || {};
        if (Object.keys(d).length > 0) {
            html += '<table><tr><th>Pilier</th><th>Étoiles</th></tr>';
            for (const [pilier, etoiles] of Object.entries(d)) {
                if (etoiles && etoiles.length > 0) {
                    html += '<tr><td><strong>' + esc(pilier) + '</strong></td><td>' +
                        esc(etoiles.join(', ')) + '</td></tr>';
                }
            }
            html += '</table>';
        } else {
            html += '<p><em>Aucune étoile auxiliaire trouvée</em></p>';
        }

        // Bloc E — Relations
        html += blocHeader('E', 'Relations entre branches');
        const e = data.blocE || {};
        if (Object.keys(e).length > 0) {
            html += '<table>';
            for (const [type, val] of Object.entries(e)) {
                html += kvRow(type, val);
            }
            html += '</table>';
        } else {
            html += '<p><em>Aucune relation trouvée</em></p>';
        }

        // Bloc F — Hexagrammes
        html += blocHeader('F', 'Hexagrammes');
        const f = data.blocF || {};
        if (Object.keys(f).length > 0) {
            html += '<table><tr><th>Pilier</th><th>Trigramme haut</th><th>Trigramme bas</th><th>N°</th><th>Nom</th></tr>';
            for (const [pilier, hex] of Object.entries(f)) {
                html += '<tr><td>' + esc(pilier) + '</td><td>' + esc(hex.trigramme_haut) +
                    '</td><td>' + esc(hex.trigramme_bas) + '</td><td>' + esc(hex.numero) +
                    '</td><td>' + esc(hex.nom) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc G
        html += blocHeader('G', 'Groupe / Gua / Famille / Stratagème');
        const g = data.blocG || {};
        html += '<table>' +
            kvRow('Groupe', g.groupe) +
            kvRow('En dehors du Gua', g.en_dehors_du_gua) +
            kvRow('Famille', g.famille) +
            kvRow('Stratagème', g.stratageme) +
            '</table>';

        // Bloc H — Base d'analyse
        html += blocHeader('H', "Base d'analyse");
        const h = data.blocH || {};
        html += '<table>';
        for (const [key, val] of Object.entries(h)) {
            if (val) html += kvRow(key.replace(/_/g, ' '), val);
        }
        html += '</table>';

        // Bloc I — 10 Aspects
        html += blocHeader('I', '10 Aspects');
        const aspects = data.blocI || [];
        if (aspects.length > 0) {
            html += '<table><tr><th>Code</th><th>Nom FR</th><th>Nom CN</th><th>Tronc</th><th>Score</th></tr>';
            for (const asp of aspects) {
                html += '<tr><td>' + esc(asp.code) + '</td><td>' + esc(asp.nom_francais) +
                    '</td><td>' + esc(asp.nom_chinois) + '</td><td>' + esc(asp.tronc) +
                    '</td><td><strong>' + esc(String(asp.score)) + '</strong></td></tr>';
            }
            html += '</table>';
        }

        // Bloc J — 5 Éléments
        html += blocHeader('J', '5 Éléments');
        const elems = data.blocJ || [];
        if (elems.length > 0) {
            html += '<table><tr><th>Élément</th><th>%</th></tr>';
            for (const el of elems) {
                html += '<tr><td class="' + (el.css_class || '') + '">' +
                    (el.emoji || '') + ' ' + esc(el.nom) + '</td><td>' +
                    esc(String(el.pourcentage)) + '%</td></tr>';
            }
            html += '</table>';
        }

        // Bloc K — Analyse intermédiaire
        html += blocHeader('K', 'Analyse intermédiaire');
        const k = data.blocK || {};
        html += '<table>' +
            kvRow('Jours particuliers', k.jours_particuliers) +
            kvRow('Structure', k.structure) +
            kvRow('Bon', k.bon) +
            kvRow('Mauvais', k.mauvais) +
            kvRow('Relations', k.relations) +
            '</table>';

        // Bloc L — Piliers de Chance
        html += blocHeader('L', 'Piliers de Chance');
        const pcs = data.blocL || [];
        if (pcs.length > 0) {
            html += '<table><tr><th>Âge</th><th>Période</th><th>Tronc</th><th>Branche</th><th>Phase</th><th>Cachés</th><th>NaYin</th></tr>';
            for (const pc of pcs) {
                html += '<tr><td>' + esc(pc.age) + '</td><td>' + esc(pc.periode) +
                    '</td><td>' + esc(pc.tronc) + '</td><td>' + esc(pc.branche) +
                    '</td><td>' + esc(pc.phase_vie) + '</td><td>' +
                    esc((pc.troncs_caches || []).join(', ')) +
                    '</td><td>' + esc(pc.nayin) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc M — Étoiles PC
        html += blocHeader('M', 'Étoiles des Piliers de Chance');
        const ePC = data.blocM || [];
        if (ePC.length > 0) {
            html += '<table><tr><th>Pilier</th><th>Étoiles</th></tr>';
            for (const item of ePC) {
                html += '<tr><td>' + esc(item.pilier) + '</td><td>' +
                    esc(item.etoiles.join(', ')) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc N — Relations PC
        html += blocHeader('N', 'Relations des Piliers de Chance');
        const rPC = data.blocN || [];
        if (rPC.length > 0) {
            html += '<table><tr><th>Pilier</th><th>Relations</th></tr>';
            for (const item of rPC) {
                html += '<tr><td>' + esc(item.pilier) + '</td><td>' +
                    esc(item.relations.join(', ')) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc O — Hexagrammes PC
        html += blocHeader('O', 'Hexagrammes des Piliers de Chance');
        const hPC = data.blocO || [];
        if (hPC.length > 0) {
            html += '<table><tr><th>Pilier</th><th>Hexagramme</th><th>Stratagème</th></tr>';
            for (const item of hPC) {
                html += '<tr><td>' + esc(item.pilier) + '</td><td>' +
                    esc(item.hexagramme) + '</td><td>' + esc(item.stratageme) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc P — Liu Nian
        html += blocHeader('P', 'Piliers Annuels (Liu Nian)');
        const ln = data.blocP || [];
        if (ln.length > 0) {
            html += '<table>';
            for (const row of ln) {
                html += '<tr>';
                for (const cell of row) {
                    html += '<td>' + esc(cell) + '</td>';
                }
                html += '</tr>';
            }
            html += '</table>';
        }

        // Bloc Q — Ba Zhai
        html += blocHeader('Q', 'Ba Zhai (8 Demeures)');
        const q = data.blocQ || {};
        html += '<table>' +
            kvRow('Chiffre Gua', q.chiffre_gua) +
            kvRow('Étoile de la vie', q.etoile_vie) +
            kvRow('Groupe', q.groupe) +
            '</table>';

        if ((q.favorables || []).length > 0) {
            html += '<h3>Directions favorables</h3><table><tr><th>Nom</th><th>Direction</th></tr>';
            for (const f2 of q.favorables) {
                html += '<tr style="background:rgba(56,161,105,0.1)"><td>' + esc(f2.nom) +
                    '</td><td>' + esc(f2.direction) + '</td></tr>';
            }
            html += '</table>';
        }

        if ((q.defavorables || []).length > 0) {
            html += '<h3>Directions défavorables</h3><table><tr><th>Nom</th><th>Direction</th></tr>';
            for (const df of q.defavorables) {
                html += '<tr style="background:rgba(229,62,62,0.1)"><td>' + esc(df.nom) +
                    '</td><td>' + esc(df.direction) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc R — QMDJ basique
        html += blocHeader('R', 'Qi Men Dun Jia (basique)');
        const r = data.blocR || {};
        html += '<table>' +
            kvRow('Palais de Destinée', r.palais_destinee) +
            kvRow('Direction', r.direction) +
            kvRow('Tronc de vie', r.tronc_vie) +
            kvRow('Étoile', r.etoile) +
            kvRow('Porte', r.porte) +
            kvRow('Gardien', r.gardien) +
            kvRow('Combinaison', r.combinaison) +
            '</table>';

        return wrapHTML(html, personName, 'BaZi');
    }

    // ─── Zhi Run Formatter ────────────────────────────────────

    function formatZhiRun(data, personName) {
        let html = '';

        // Bloc S1
        html += blocHeader('S1', 'Infos de base');
        const s1 = data.blocS1 || {};
        html += '<table>' +
            kvRow('Structure', s1.structure) +
            kvRow('Tronc meneur', s1.tronc_meneur) +
            kvRow('Envoyé', s1.envoye) +
            kvRow('Porte meneuse', s1.porte_meneuse) +
            kvRow('Étoile meneuse', s1.etoile_meneuse) +
            kvRow('28 Constellations', s1.constellations_28) +
            kvRow('Jia se cache en', s1.jia_se_cache) +
            kvRow('Cheval de Ciel', s1.cheval_ciel) +
            kvRow('Mort et Vide', s1.mort_vide) +
            kvRow('Noble', s1.noble) +
            '</table>';

        // Bloc S2 — 9 Palais
        html += blocHeader('S2', 'Les 9 Palais');
        const s2 = data.blocS2 || {};
        const dirs = ['SE', 'S', 'SO', 'E', 'Centre', 'O', 'NE', 'N', 'NO'];
        if (Object.keys(s2).length > 0) {
            html += '<table><tr><th>Palais</th><th>Tronc</th><th>Étoile</th><th>Porte</th><th>Gardien</th><th>Hexagramme</th></tr>';
            for (const dir of dirs) {
                const p = s2[dir];
                if (!p) continue;
                html += '<tr><td><strong>' + esc(dir) + '</strong></td><td>' +
                    esc(p.tronc) + '</td><td>' + esc(p.etoile) + '</td><td>' +
                    esc(p.porte) + '</td><td>' + esc(p.gardien) + '</td><td>' +
                    esc(p.hexagramme) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc S3
        html += blocHeader('S3', 'Formations de palais');
        const s3 = data.blocS3 || [];
        if (s3.length > 0) {
            html += '<table><tr><th>Nom CN</th><th>Nom FR</th><th>Palais</th><th>Description</th></tr>';
            for (const f of s3) {
                const bg = f.favorable ? 'rgba(56,161,105,0.1)' : 'rgba(229,62,62,0.1)';
                html += '<tr style="background:' + bg + '"><td>' + esc(f.nom_chinois) +
                    '</td><td>' + esc(f.nom_francais) + '</td><td>' + esc(f.palais) +
                    '</td><td>' + esc(f.description) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc S4
        html += blocHeader('S4', 'Formations de troncs');
        const s4 = data.blocS4 || [];
        if (s4.length > 0) {
            html += '<table><tr><th>N°</th><th>Nom CN</th><th>Nom FR</th><th>Description</th></tr>';
            for (const f of s4) {
                html += '<tr><td>' + esc(f.numero) + '</td><td>' + esc(f.nom_chinois) +
                    '</td><td>' + esc(f.nom_francais) + '</td><td>' + esc(f.description) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc S5
        html += blocHeader('S5', 'Formations spéciales');
        const s5 = data.blocS5 || [];
        if (s5.length > 0) {
            html += '<table><tr><th>N°</th><th>Nom CN</th><th>Nom FR</th><th>Description</th></tr>';
            for (const f of s5) {
                html += '<tr><td>' + esc(f.numero) + '</td><td>' + esc(f.nom_chinois) +
                    '</td><td>' + esc(f.nom_francais) + '</td><td>' + esc(f.description) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc S6
        html += blocHeader('S6', 'Stratégies (36 Stratagèmes)');
        const s6 = data.blocS6 || [];
        if (s6.length > 0) {
            html += '<table><tr><th>N°</th><th>Catégorie</th><th>Nom</th><th>Description</th></tr>';
            for (const s of s6) {
                html += '<tr><td>' + esc(s.numero) + '</td><td>' + esc(s.categorie) +
                    '</td><td>' + esc(s.nom) + '</td><td>' + esc(s.description) + '</td></tr>';
            }
            html += '</table>';
        }

        // Bloc S7
        html += blocHeader('S7', 'Informations complémentaires');
        const s7 = data.blocS7 || {};
        html += '<table>' +
            kvRow('3 Victoires', s7.trois_victoires) +
            kvRow('Yi Céleste', s7.yi_celeste) +
            kvRow('Palais intérieurs', s7.palais_interieurs) +
            kvRow('Palais extérieurs', s7.palais_exterieurs) +
            kvRow('Clash jour', s7.clash_jour) +
            kvRow('Clash heure', s7.clash_heure) +
            '</table>';

        return wrapHTML(html, personName, 'Zhi Run');
    }

    // ─── HTML Wrapper ─────────────────────────────────────────

    function blocHeader(code, title) {
        return '<div class="bloc-header">\uD83D\uDD37 BLOC ' + esc(code) + ' \u2014 ' + esc(title) + '</div>\n';
    }

    function wrapHTML(bodyContent, personName, chartType) {
        return '<!DOCTYPE html>\n' +
            '<html lang="fr">\n<head>\n' +
            '<meta charset="UTF-8">\n' +
            '<title>' + esc(chartType) + ' Extraction \u2014 ' + esc(personName || 'Inconnu') + '</title>\n' +
            '<style>\n' +
            'body { font-family: "Segoe UI", sans-serif; max-width: 900px; margin: auto; padding: 20px; background: #fafafa; color: #333; }\n' +
            'h2 { color: #2c5282; border-bottom: 2px solid #d4a373; padding-bottom: 6px; }\n' +
            'h3 { color: #2c5282; margin-top: 12px; }\n' +
            'table { border-collapse: collapse; width: 100%; margin: 10px 0; }\n' +
            'th { background: #2c5282; color: white; padding: 8px; text-align: left; }\n' +
            'td { border: 1px solid #ddd; padding: 6px 8px; }\n' +
            'tr:nth-child(even) { background: #f7f7f7; }\n' +
            '.feu { color: #e53e3e; }\n' +
            '.bois { color: #38a169; }\n' +
            '.eau { color: #3182ce; }\n' +
            '.metal { color: #d69e2e; }\n' +
            '.terre { color: #8b6914; }\n' +
            '.mv { background: #fed7d7; }\n' +
            '.bloc-header { background: #ebf8ff; padding: 10px 14px; margin-top: 24px; border-left: 4px solid #2c5282; font-weight: bold; font-size: 1.1em; }\n' +
            'p em { color: #999; }\n' +
            '</style>\n</head>\n<body>\n' +
            '<h2>' + esc(chartType) + ' Extraction \u2014 ' + esc(personName || 'Inconnu') + '</h2>\n' +
            '<p><em>Généré le ' + new Date().toLocaleString('fr-FR') + '</em></p>\n' +
            bodyContent +
            '\n</body>\n</html>';
    }

    // ─── Public API ───────────────────────────────────────────

    function format(data, personName) {
        if (data.type === 'zhirun') {
            return formatZhiRun(data, personName);
        }
        return formatBaZi(data, personName);
    }

    return { format: format };
})();
