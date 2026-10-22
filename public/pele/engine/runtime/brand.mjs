// Achmage-authored tokens. Colour roles stay separate from data meaning.
export const VERSION='1.0.0-rc.2';
export const FONTS={sametone:{family:'Achmage SameTone',file:'AchmageSameTone-1.000.woff2'},pretendard:{family:'Pretendard',file:'PretendardVariable.woff2'}};
export const THEMES={
 light:{bg:'#ffffff',fg:'#16334a',muted:'#526778',line:'#526778',surface:'#eef5fb','surface-alt':'#dfedf5',border:'#6c879b',accent:'#007F86',critical:'#a23737',error:'#a23737',series:['#0066B3','#007F86','#002E6E','#6c4b85','#8b551c','#366b4b','#8c425c','#475f86']},
 dark:{bg:'#001A44',fg:'#F4F7FC',muted:'#b4cadf',line:'#a9c3dc',surface:'#102f55','surface-alt':'#1b4266',border:'#8daac5',accent:'#5ddcd1',critical:'#ffb8b0',error:'#ffb8b0',series:['#77b7ec','#5ddcd1','#a3bdf7','#ceb5e7','#e4bd80','#95d4ac','#e5afc4','#b6c8e4']}
};
export const PROFILES={web:{width:960,fontSize:18,autoDirection:true},slide:{width:1200,fontSize:24,autoDirection:false},report:{width:760,fontSize:18,autoDirection:false},note:{width:640,fontSize:18,autoDirection:true},image:{width:960,fontSize:20,autoDirection:false}};
export function tokens(theme='light',font='sametone'){
 if(!THEMES[theme]||!FONTS[font])throw Error('알 수 없는 테마 또는 폰트');
 const {series,...base}=THEMES[theme];
 return {...Object.fromEntries(Object.entries(base).map(([k,v])=>['--pele-'+k,v])),...Object.fromEntries(series.map((v,i)=>['--pele-series-'+(i+1),v])),'--pele-font':`"${FONTS[font].family}"`,'--pele-font-mono':`"${FONTS[font].family}"`};
}
export const declarations=(theme,font)=>Object.entries(tokens(theme,font)).map(([k,v])=>`${k}:${v}`).join(';');
export const semanticCSS=`.achmage-key>rect,.achmage-key>path,.achmage-key>polygon{stroke:var(--pele-accent);stroke-width:3}.achmage-interpretation>rect,.achmage-interpretation>polygon{stroke-dasharray:5 3}.achmage-aux>rect,.achmage-aux>polygon{fill:var(--pele-surface-alt)}.achmage-data-marker{stroke:var(--pele-bg);stroke-width:2}`;
export function svgStyle(theme='light',font='sametone'){return `.pele{${declarations(theme,font)};background:var(--pele-bg)}${semanticCSS}`;}
