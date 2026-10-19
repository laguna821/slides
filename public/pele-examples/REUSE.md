# Reusing these examples

These are actual production sources, not a live editor. Relationship maps use Pele 1.6.0 and Mermaid flowchart syntax. The conference slide statistics are separately authored SVG. Scientific calculation is upstream of both renderers.

Each condition has `source.pele`, `data.json`, and `figure-branch.txt`. The formatted branch preserves the original statements; its leading `else if` becomes `if` after extraction from the family chain. `svg-helpers.txt` contains shared plotting functions. The original `figures.mjs.txt` is unchanged, and `semantic-models.mjs.txt` supplies evidence-role mapping.

To reproduce the original chart generator in a separate local project:

1. Pin Pele 1.6.0 in that project's package manager. Save the two `.mjs.txt` files as `figures.mjs` and `semantic-models.mjs` in one directory.
2. Create `output/` beside them and save the shared `analyses.json` there. Per-condition `data.json` is a subset for inspection; the full generator needs the shared family and details records.
3. Run `node figures.mjs /absolute/path/to/the/pinned/pele/module.mjs`. Supply the actual ESM entry from the pinned distribution, not an assumed CDN latest version.
4. The generator writes scientific SVG, native Pele SVG, source and AST outputs. It does not regenerate the CMDS presentation, compute new statistical estimates or supply slide navigation and popups. Those belong to their respective hosts.

Replace estimates, intervals, sample, units and methods together. Changing a number in the diagram source is not statistical estimation. Match font measurement to the font used at display time, then review the actual target size. Original scientific graphics use Pretendard Variable; this portfolio's surrounding UI uses Achmage SameTone.

Data: public-domain statsmodels ANES96 subset (944 respondents, unweighted exploratory analysis) and the semopy Political Democracy example (75 countries). They are separate samples. Expected vote is not actual vote; TV news is times/week. Correlation, regression and model paths do not establish causality. Parameter Monte Carlo draws are not a nonparametric bootstrap.

The skill is version 0.7.0, review-draft. Publishing these examples does not activate or install an OS skill.

Pele: https://pele.run/
