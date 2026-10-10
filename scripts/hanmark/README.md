# Pinned HanMark compositor

MIT HanMark2.7.0, source revision3db078d75851ae8d94dcc96eff45a6fad1102d63. Original file hashes are in provenance.json; LICENSE is retained. These are the pure DOM layout/measurement/table modules, not the Obsidian plugin or an activated OS skill.

Site adaptation: compositor height and column/float origin respect a measured first-page title inset; following pages retain170×252.9mm. A minimal diagnostics translator replaces host i18n. Reader DOM normalization and the branded print profile live outside these modules. Upgrade deliberately with full source/order/geometry/PDF regression tests; never replace from a live plugin bundle at build time.
