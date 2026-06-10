# 🏮 Calculateur BaZi (八字)

Calculateur des **Quatre Piliers du Destin** entièrement côté client — aucun serveur ni API requis.
Ouvrez simplement `index.html` dans un navigateur (ou hébergez-le sur GitHub Pages).

## Fonctionnalités

- **Quatre Piliers** (année, mois, jour, heure) : troncs célestes et branches terrestres, avec pinyin, élément et polarité Yin/Yang
- **Troncs cachés** (藏干) de chaque branche, avec leur Dix Dieux
- **Dix Dieux** (十神) calculés par rapport au Maître du Jour
- **Na Yin** (纳音) des 60 binômes, avec traduction française
- **Étoiles symboliques** (神煞) : Noble Céleste 天乙贵人, Fleur de Pêcher 桃花, Cheval Voyageur 驿马, Hua Gai 华盖, Wen Chang 文昌, Lu Shen 禄神, Yang Ren 羊刃, Vide 空亡
- **Piliers de Chance** (大运 Da Yun) avec âge de départ exact et sens direct/inverse selon le genre
- **Années** (流年 Liu Nian) affichées au clic sur chaque pilier de chance
- **Cinq Éléments** (五行) : répartition des 8 caractères
- **Force du Maître du Jour** (estimation pondérée par la branche du mois)
- Tai Yuan 胎元, Vide 空亡, animal de l'année

## Précision astronomique

Les termes solaires (节气) sont calculés par la longitude solaire apparente
(algorithme de Meeus), précis à quelques minutes — les frontières d'année
(Li Chun 立春) et de mois sont donc exactes pour un usage courant.
L'heure Zi tardive (23 h – minuit) est rattachée au jour suivant.
