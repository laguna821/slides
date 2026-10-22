from pathlib import Path
import os,sys,json,hashlib,math,platform
for k in ['OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS']: os.environ[k]='1'
P=Path(__file__).parent
sys.path.insert(0,str(P/'tools'/'scientific-deps'))
import numpy as np
import pandas as pd
import scipy
from scipy import stats
import statsmodels
import statsmodels.api as sm
import statsmodels.formula.api as smf
from statsmodels.stats.anova import anova_lm
from statsmodels.stats.oneway import anova_oneway
from statsmodels.stats.multicomp import pairwise_tukeyhsd
from statsmodels.stats.diagnostic import het_breuschpagan
import semopy
OUT=P/'output'
RAW=P/'raw'
OUT.mkdir(exist_ok=True);RAW.mkdir(exist_ok=True)
rng=np.random.default_rng(20261019)
# Fully synthetic: seed and generating equations are part of this published source.
g=np.random.default_rng(821202610)
N=944
age=g.integers(18,91,N)
educ=g.integers(1,8,N)
pid=g.integers(0,7,N)
urban=g.uniform(0,8,N)
choice=(g.random(N)<1/(1+np.exp(-(-1+.32*pid+.009*(age-45))))).astype(int)
base=g.normal(4,1,N)
df=pd.DataFrame({'age':age,'educ':educ,'PID':pid,'vote':choice,
 'logpopul':urban,'TVnews':np.clip(np.rint(1+.025*age+.22*educ+.10*urban+.06*(age-45)*(urban-4)/10+g.normal(0,1.4,N)),0,7),
 'ClinLR':np.clip(np.rint(base+g.normal(0,.7,N)),1,7),
 'DoleLR':np.clip(np.rint(base+.5+g.normal(0,.7,N)),1,7)})
df['party3']=np.select([df.PID<=2,df.PID==3],['Group A','Group B'],default='Group C')
df['education3']=np.select([df.educ<=3,df.educ==4],['Level 1-3','Level 4'],default='Level 5-7')
df['age_band']=pd.cut(df.age,[17,34,54,100],labels=['18–34','35–54','55+'])
df['age10']=df.age/10
df['age_c']=df.age10-df.age10.mean()
df['urban_c']=df.logpopul-df.logpopul.mean()
df.to_csv(RAW/'synthetic-survey.csv',index=False)
M=300
resource=g.normal(0,1,M);engagement=.7*resource+g.normal(0,1,M);outcome=.2*resource+.8*engagement+g.normal(0,1,M)
cov=np.eye(11)*.7
for u,w in [(3,7),(4,6),(4,8),(5,9),(6,10),(8,10)]:cov[u,w]=cov[w,u]=.12
assert np.linalg.eigvalsh(cov).min()>0
err=g.multivariate_normal(np.zeros(11),cov,M)
pd_data=pd.DataFrame(np.column_stack([resource,1.1*resource,.8*resource,engagement,1.2*engagement,.9*engagement,1.1*engagement,outcome,1.2*outcome,.9*outcome,1.1*outcome])+err,columns=['x1','x2','x3','y1','y2','y3','y4','y5','y6','y7','y8'])
pd_data.to_csv(RAW/'synthetic-latent.csv',index=False)
sources={
 'anes':{'name':'가상 학습 설문','n':N,'unit':'synthetic respondents','credit':'Achmage synthetic generator','definition':'독립적인 가상 자료. 실제 인물·정치 조사·기관 성과가 아님. 이전 분석 API의 column ID를 보존하며 PID는 참여군, vote는 프로그램 선택, TVnews는 연습 횟수, ClinLR/DoleLR는 프로그램 A/B 평가, logpopul은 환경 지수이다.','sha256':hashlib.sha256((RAW/'synthetic-survey.csv').read_bytes()).hexdigest()},
 'dem':{'name':'가상 잠재변수 모형','n':M,'unit':'synthetic cases','credit':'Achmage synthetic generator','definition':'자원→참여→성과. ind60/dem60/dem65는 이전 API 변수 ID이며 시점이나 국가가 아니다. 3개 잠재변수, 11개 지표, 생성 시 6개 잔차 공분산 .12.','sha256':hashlib.sha256((RAW/'synthetic-latent.csv').read_bytes()).hexdigest()}}
DETAIL={};families=[];audit=[]
def clean(x):
 if isinstance(x,dict): return {str(k):clean(v) for k,v in x.items()}
 if isinstance(x,(list,tuple)):return [clean(v) for v in x]
 if isinstance(x,np.ndarray):return clean(x.tolist())
 if isinstance(x,(np.integer,)):return int(x)
 if isinstance(x,(float,np.floating)):return float(x) if np.isfinite(x) else None
 return x
def ev(key,label,value,unit,ci=None,method='',meaning='',caveat='',source='anes',n=944,extra=None):
 d={'id':key,'label':label,'value':value,'unit':unit,'ci':ci,'n':n,'method':method,'meaning':meaning,'caveat':caveat,'source':source,**(extra or {})};DETAIL[key]=clean(d);return key
def group(a,label):
 a=np.asarray(a);n=len(a);mean=a.mean();se=a.std(ddof=1)/np.sqrt(n);q=stats.t.ppf(.975,n-1)
 return {'label':label,'n':n,'mean':mean,'sd':a.std(ddof=1),'ci':[mean-q*se,mean+q*se],'hist':[(int(v),int((a==v).sum())) for v in np.unique(a)]}
def family(id,name,topic,question,claim,variants,source='anes'):
 families.append({'id':id,'name':name,'topic':topic,'question':question,'claim':claim,'variants':variants,'dataset':source})
def record_model_terms(fit,cols):
 params=np.asarray(fit.params);ci=np.asarray(fit.conf_int());se=np.asarray(fit.bse);pv=np.asarray(fit.pvalues)
 return [{'term':c,'b':params[i],'se':se[i],'lo':ci[i,0],'hi':ci[i,1],'p':pv[i]} for i,c in enumerate(cols)]

# Chi-square, row proportions, adjusted Pearson residuals and bootstrap V.
chi_variants=[]
for vid,rows,values in [('chi3',['Group A','Group B','Group C'],df.party3),('chi7',[str(i) for i in range(7)],df.PID.astype(int).astype(str))]:
 tab=pd.crosstab(values,df.vote).reindex(rows).to_numpy();res=stats.chi2_contingency(tab,correction=False);n=tab.sum();rs=tab.sum(axis=1);cs=tab.sum(axis=0);V=np.sqrt(res.statistic/n)
 probs=tab.ravel()/n; draws=rng.multinomial(n,probs,2000).reshape(2000,*tab.shape);ex=draws.sum(axis=2)[:,:,None]*draws.sum(axis=1)[:,None,:]/n;bs=np.sqrt(np.sum(np.divide((draws-ex)**2,ex,out=np.zeros_like(ex,dtype=float),where=ex>0),axis=(1,2))/n);vci=np.quantile(bs,[.025,.975])
 cells=[]
 for i,row in enumerate(rows):
  for j,col in enumerate(['Program A','Program B']):
   r=(tab[i,j]-res.expected_freq[i,j])/np.sqrt(res.expected_freq[i,j]*(1-rs[i]/n)*(1-cs[j]/n));key=vid+f'-cell-{i}-{j}'
   ev(key,row+' / '+col,int(tab[i,j]),'respondents',method='Pearson χ² independence; no continuity correction',meaning=f'관측 {tab[i,j]}명, 독립 가정 기대 {res.expected_freq[i,j]:.3f}명. 행 비율 {100*tab[i,j]/rs[i]:.2f}%. 조정 잔차 {r:.3f}.',caveat='색은 독립 기대에서의 편차이며 보정된 개별 셀 검정의 유의성 표시가 아니다. 현실 선택가 아니라 가상 프로그램 선택다.',extra={'expected':res.expected_freq[i,j],'residual':r,'rowN':rs[i],'rowPct':100*tab[i,j]/rs[i]})
   cells.append({'row':row,'col':col,'i':i,'j':j,'obs':tab[i,j],'expected':res.expected_freq[i,j],'residual':r,'pct':100*tab[i,j]/rs[i],'key':key})
 vkey=ev(vid+'-V',"Cramér’s V",V,'V',vci,'Multinomial percentile bootstrap,2000 draws,seed20261019','가상 참여 코드과 가상 프로그램 선택의 범주 연관 크기.','합성 표본. 집단 묶는 방식은 사전에 지정한3/7수준 비교이며 원자료 코딩을 유지한다.')
 chi_variants.append({'id':vid,'label':'3개 참여군군' if vid=='chi3' else '원래7수준','kind':'chi','n':int(n),'stat':res.statistic,'df':res.dof,'p':res.pvalue,'effect':V,'effectCI':vci,'rows':rows,'cols':['Program A','Program B'],'cells':cells,'key':vkey})
family('chi','χ² 독립성','관계','가상 참여 코드과 가상 프로그램 선택는 독립적인가?','가상 프로그램 선택의 분포는 가상 참여 코드에 따라 달라진다',chi_variants)

# Group B/Welch and paired comparisons are different designs.
t_variants=[]
for paired in [False,True]:
 if paired:
  a=df.DoleLR.to_numpy();b=df.ClinLR.to_numpy();d=a-b;test=stats.ttest_rel(a,b);dof=len(d)-1;diff=d.mean();se=d.std(ddof=1)/np.sqrt(len(d));gs=[group(b,'Program A 인식'),group(a,'Program B 인식')];effect=diff/d.std(ddof=1);name='Cohen dz';unit='rating points';vid='paired';method='Paired t; DoleLR−ClinLR; numeric1–7 scale'
  idx=rng.integers(0,len(d),(2000,len(d)));db=d[idx];effb=db.mean(axis=1)/db.std(axis=1,ddof=1)
 else:
  a=df.loc[df.vote==1,'age'].to_numpy();b=df.loc[df.vote==0,'age'].to_numpy();test=stats.ttest_ind(a,b,equal_var=False);va=a.var(ddof=1)/len(a);vb=b.var(ddof=1)/len(b);dof=(va+vb)**2/(va*va/(len(a)-1)+vb*vb/(len(b)-1));diff=a.mean()-b.mean();se=np.sqrt(va+vb);gs=[group(b,'Program A 예상'),group(a,'Program B 예상')];sd=np.sqrt(((len(a)-1)*a.var(ddof=1)+(len(b)-1)*b.var(ddof=1))/(len(a)+len(b)-2));J=1-3/(4*(len(a)+len(b))-9);effect=J*diff/sd;name='Hedges g';unit='years';vid='welch';method='Group B Welch t; Program B−Program A expected vote; unequal variances'
  aa=a[rng.integers(0,len(a),(2000,len(a)))];bb=b[rng.integers(0,len(b),(2000,len(b)))];sp=np.sqrt(((len(a)-1)*aa.var(axis=1,ddof=1)+(len(b)-1)*bb.var(axis=1,ddof=1))/(len(a)+len(b)-2));effb=J*(aa.mean(axis=1)-bb.mean(axis=1))/sp
 ci=[diff-stats.t.ppf(.975,dof)*se,diff+stats.t.ppf(.975,dof)*se];eci=np.quantile(effb,[.025,.975]);key=ev(vid+'-difference','Program B−Program A 차이',diff,unit,ci,method,'같은 응답자의 인식 차이.' if paired else '가상 프로그램 선택 집단 간 응답자 평균연령 차이.','인식 척도는1–7 순서형을 수치로 취급한 분석이다. 인식 차이가 실제 프로그램의 객관적 위치나 인과효과를 뜻하지 않는다.' if paired else '비무작위 집단의 평균연령 차이이며 프로그램 선택이 연령을 변화시킨 효과가 아니다.',extra={'t':test.statistic,'df':dof,'p':test.pvalue,'effect':effect,'effectName':name,'effectCI':eci})
 for i,g in enumerate(gs):g['key']=ev(vid+'-group-'+str(i),g['label'],g['mean'],unit,g['ci'],'Within-group t interval','집단 평균과95% 구간.','집단 평균 구간의 겹침은 평균차 검정을 대체하지 않는다.',n=g['n'])
 t_variants.append({'id':vid,'label':'대응 인식 비교' if paired else '독립 Welch 비교','kind':'t','n':944,'unit':unit,'groups':gs,'difference':diff,'ci':ci,'stat':test.statistic,'df':dof,'p':test.pvalue,'effect':effect,'effectName':name,'effectCI':eci,'key':key})
family('t-test','t-test','차이','다른 사람의 차이와 같은 사람 안의 차이는 어떻게 다른가?','비교 설계가 달라지면 차이의 의미도 달라진다',t_variants)

# Correlation matrix; ordinal sensitivity. Raw bubbles preserve coincident observations.
columns=['age','TVnews','educ','logpopul'];arr=df[columns].to_numpy();corr_variants=[]
for rank in [False,True]:
 x=stats.rankdata(arr,axis=0) if rank else arr;rmat=np.corrcoef(x,rowvar=False);pairs=[]
 boot=[]
 if rank:
  for batch in range(8):
   ix=rng.integers(0,len(arr),(250,len(arr)));z=stats.rankdata(arr[ix],axis=1);z=z-z.mean(axis=1,keepdims=True);ss=np.sum(z*z,axis=1);boot.extend([np.sum(z[:,:,i]*z[:,:,j],axis=1)/np.sqrt(ss[:,i]*ss[:,j]) for i in [] for j in []])
   vals=np.stack([np.sum(z[:,:,i]*z[:,:,j],axis=1)/np.sqrt(ss[:,i]*ss[:,j]) for i in range(4) for j in range(i+1,4)],axis=1);boot.append(vals)
  boot=np.concatenate(boot,axis=0)
 k=0;vid='spearman' if rank else 'pearson'
 for i in range(4):
  for j in range(i+1,4):
   r=rmat[i,j];ci=np.quantile(boot[:,k],[.025,.975]) if rank else np.tanh(np.arctanh(r)+np.array([-1,1])*stats.norm.ppf(.975)/np.sqrt(len(arr)-3));key=ev(vid+'-'+columns[i]+'-'+columns[j],columns[i]+' × '+columns[j],r,'ρ' if rank else 'r',ci,'Rank-pair bootstrap2000' if rank else 'Pearson/Fisher-z normal interval','같은944명의 두 측정치 간 연관.','수치 코딩된 순서형 척도를 포함한다. 상관은 인과가 아니며 여러 쌍의 구간은 동시 신뢰구간이 아니다.',extra={'variables':[columns[i],columns[j]]});pairs.append({'i':i,'j':j,'r':r,'ci':ci,'key':key});k+=1
 bubbles=[]
 for k,((age,news),g) in enumerate(df.groupby(['age','TVnews'])):
  key='bubble-'+str(k)
  if not rank:ev(key,f'{age:g}세 · 주 {news:g}회',len(g),'respondents',method='Observed joint count; no jitter or imputation',meaning='동일한 연령과 연습 이용 횟수를 보고한 실제 관측의 수. 점 면적은 이 빈도에 비례한다.',caveat='개별 응답자 추정치나 해당 점만의 유의성 검정이 아니다.')
  bubbles.append({'x':age,'y':news,'count':len(g),'key':key})
 corr_variants.append({'id':vid,'label':'Spearman 순위' if rank else 'Pearson 수치','kind':'correlation','n':944,'columns':columns,'pairs':pairs,'bubbles':bubbles,'key':vid+'-age-TVnews'})
family('correlation','Correlation','관계','연령·연습 횟수·교육·환경 지수는 어떻게 함께 움직이는가?','연관의 크기와 측정 수준을 함께 읽는다',corr_variants)

# Regression and conditional predictions. Same coefficients; uncertainty changes.
fit=smf.ols('TVnews ~ age10 + educ + logpopul + C(party3)',data=df).fit();regvars=[]
for robust in [False,True]:
 f=fit.get_robustcov_results(cov_type='HC3',use_t=True) if robust else fit;cols=fit.model.exog_names;vid='reg-hc3' if robust else 'reg-ols';coef=record_model_terms(f,cols);cov=np.asarray(f.cov_params());xbar=fit.model.exog.mean(axis=0);pred=[]
 for age in np.linspace(df.age.min(),df.age.max(),60):
  xx=xbar.copy();xx[cols.index('age10')]=age/10;v=xx@np.asarray(f.params);se=np.sqrt(xx@cov@xx);q=stats.t.ppf(.975,f.df_resid);pred.append({'x':age,'y':v,'lo':v-q*se,'hi':v+q*se})
 for c in coef:c['key']=ev(vid+'-'+c['term'],c['term'],c['b'],'times/week per term unit',[c['lo'],c['hi']],'OLS '+('HC3 robust t' if robust else 'classical t')+f'; df={f.df_resid:g}','연습 이용 횟수와 해당 설명변수의 조건부 선형 연관. age10은10년,educ는1–7 코드,logpopul은 synthetic environment index.','교육 코드는 간격척도가 아니며 선형처리 가정이 있다. 선택된 자료의 관측적 평균 연관이고 연습 횟수은0–7로 제한된다. CI는 평균 반응의 구간이며 새 관측의 예측구간이 아니다.',extra={'se':c['se'],'p':c['p'],'formula':fit.model.formula})
 regvars.append({'id':vid,'label':'HC3 강건 오차' if robust else '고전적 표준오차','kind':'regression','n':944,'coef':coef,'predictions':pred,'r2':fit.rsquared,'df':fit.df_resid,'bpP':het_breuschpagan(fit.resid,fit.model.exog)[1],'maxCook':np.max(fit.get_influence().cooks_distance[0]),'key':vid+'-age10'})
family('regression','Regression','관계','다른 변수를 함께 고려한 연령의 연관은 남는가?','계수와 모형 조건을 묶어서 해석한다',regvars)

# One-way ANOVA: actual distributions plus familywise contrasts.
labels=['Level 1-3','Level 4','Level 5-7'];groups=[df.loc[df.education3==x,'TVnews'].to_numpy() for x in labels];mean=df.TVnews.mean();eta=sum(len(g)*(g.mean()-mean)**2 for g in groups)/np.sum((df.TVnews-mean)**2);anova_vars=[]
for welch in [True,False]:
 vid='anova-welch' if welch else 'anova-classic';res=anova_oneway(groups,use_var='unequal' if welch else 'equal',welch_correction=True);gg=[group(a,l) for a,l in zip(groups,labels)];cons=[];mse=sum(np.sum((g-g.mean())**2) for g in groups)/(944-3)
 for i in range(3):
  for j in range(i+1,3):
   ai,aj=groups[i],groups[j];diff=aj.mean()-ai.mean();vi=ai.var(ddof=1)/len(ai);vj=aj.var(ddof=1)/len(aj);dof=(vi+vj)**2/(vi*vi/(len(ai)-1)+vj*vj/(len(aj)-1)) if welch else 941;se=np.sqrt((vi+vj)/2) if welch else np.sqrt(mse*(1/len(ai)+1/len(aj))/2);qv=abs(diff)/se;pv=stats.studentized_range.sf(qv,3,dof);qc=stats.studentized_range.ppf(.95,3,dof);ci=[diff-qc*se,diff+qc*se];key=ev(vid+f'-contrast-{i}-{j}',labels[j]+' − '+labels[i],diff,'times/week',ci,'Games–Howell family3' if welch else 'Tukey HSD family3','교육3집단 중 두 집단의 연습 횟수 평균 차이.','전체 F검정만으로 이 쌍의 차이를 판단하지 않는다. 신뢰구간은 선택한 비교법의 다중비교 보정을 반영한다. 무가중·탐색적 비교.',extra={'pAdjusted':pv,'df':dof});cons.append({'label':f'{j+1} − {i+1}','b':diff,'lo':ci[0],'hi':ci[1],'p':pv,'key':key})
 for i,g in enumerate(gg):g['key']=ev(vid+'-group-'+str(i),labels[i],g['mean'],'times/week',g['ci'],'Within-group t CI','해당 교육집단의 실제 분포와 평균.','표시한 평균 CI는 집단별 pointwise 구간이며 옆의 보정된 쌍별 차이 구간과 다르다.',n=g['n'])
 anova_vars.append({'id':vid,'label':'Welch + Games–Howell' if welch else '고전적 F + Tukey','kind':'anova','n':944,'F':res.statistic,'df':res.df,'p':res.pvalue,'eta2Descriptive':eta,'groups':gg,'contrasts':cons,'key':cons[0]['key']})
family('anova','One-way ANOVA','차이','교육집단의 연습 횟수 평균은 어떻게 다른가?','전체 차이와 보정된 집단 간 차이를 분리한다',anova_vars)

# Unbalanced factorial ANOVA with explicit sum contrasts, Type III and HC3.
two=smf.ols('TVnews ~ C(party3, Sum) * C(age_band, Sum)',data=df).fit();two_vars=[]
from patsy import build_design_matrices
for robust in [False,True]:
 vid='two-hc3' if robust else 'two-classic';table=anova_lm(two,typ=3,robust='hc3' if robust else None);f=two.get_robustcov_results(cov_type='HC3',use_t=True) if robust else two;cv=np.asarray(f.cov_params());cells=[]
 for party in ['Group A','Group B','Group C']:
  for band in ['18–34','35–54','55+']:
   xx=np.asarray(build_design_matrices([two.model.data.design_info],pd.DataFrame({'party3':[party],'age_band':[band]}))[0])[0];m=xx@np.asarray(f.params);se=np.sqrt(xx@cv@xx);q=stats.t.ppf(.975,f.df_resid);n=int(((df.party3==party)&(df.age_band==band)).sum());key=ev(vid+'-'+party+'-'+band,party+' / '+band,m,'times/week',[m-q*se,m+q*se],'Full interaction cell mean; '+('HC3' if robust else 'pooled residual variance')+' t CI','해당 참여군·연령 셀의 모형 평균. 포화된 두 요인 상호작용 셀 구조로 원 셀 평균과 같다.','불균형 셀 크기와 작은 Group B 셀의 불확실성을 함께 읽는다. 선이 교차하는 모양만으로 상호작용 유의성을 판단하지 않는다.',n=n);cells.append({'party':party,'band':band,'mean':m,'lo':m-q*se,'hi':m+q*se,'n':n,'key':key})
 terms=[{'term':idx,'F':r['F'],'p':r['PR(>F)'],'df':r['df']} for idx,r in table.iterrows() if idx not in ['Intercept','Residual']]
 two_vars.append({'id':vid,'label':'HC3 joint F' if robust else 'Type III F','kind':'two-way','n':944,'terms':terms,'dfResidual':f.df_resid,'cells':cells,'key':cells[0]['key']})
family('two-way','Two-way ANOVA','조건','참여군과 연령의 조합에 따라 연습 횟수이 다른가?','집단 조합의 차이와 상호작용 검정을 함께 읽는다',two_vars)

# Continuous moderation: parameter covariance preserved in slopes and bands.
mod=smf.ols('TVnews ~ age_c * urban_c + educ + C(party3)',data=df).fit();mod_vars=[]
for robust in [False,True]:
 vid='mod-hc3' if robust else 'mod-classic';f=mod.get_robustcov_results(cov_type='HC3',use_t=True) if robust else mod;cols=mod.model.exog_names;bb=np.asarray(f.params);cv=np.asarray(f.cov_params());ix=cols.index('age_c');iz=cols.index('urban_c');ij=cols.index('age_c:urban_c');q=stats.t.ppf(.975,f.df_resid);slopes=[];curves=[];jn=[];xbar=mod.model.exog.mean(axis=0)
 for k,z in enumerate(np.quantile(df.urban_c,[.1,.5,.9])):
  ss=bb[ix]+bb[ij]*z;sv=np.sqrt(cv[ix,ix]+2*z*cv[ix,ij]+z*z*cv[ij,ij]);ci=[ss-q*sv,ss+q*sv];key=ev(vid+'-slope-'+str(k),['작은 도시 P10','중간 P50','큰 도시 P90'][k],ss,'times/week per10years',ci,'Conditional slope; full coefficient covariance; '+('HC3' if robust else 'classical')+' t CI','환경 지수 조건에서 연령10년과 연습 횟수의 조건부 연관.','실제 logpopul의10/50/90분위에서 계산한다. 별도 집단의 유의성 차이를 상호작용 검정으로 대체하지 않는다.',extra={'urban_c':z,'urbanLog':z+df.logpopul.mean()});slopes.append({'label':['P10','P50','P90'][k],'b':ss,'lo':ci[0],'hi':ci[1],'key':key});curve=[]
  for age in np.linspace(df.age.min(),df.age.max(),50):
   xx=xbar.copy();xx[ix]=age/10-df.age10.mean();xx[iz]=z;xx[ij]=xx[ix]*z;m=xx@bb;se=np.sqrt(xx@cv@xx);curve.append({'x':age,'y':m,'lo':m-q*se,'hi':m+q*se,'key':key})
  curves.append(curve)
 for z in np.linspace(df.urban_c.min(),df.urban_c.max(),100):
  ss=bb[ix]+bb[ij]*z;se=np.sqrt(cv[ix,ix]+2*z*cv[ix,ij]+z*z*cv[ij,ij]);jn.append({'x':z+df.logpopul.mean(),'y':ss,'lo':ss-q*se,'hi':ss+q*se})
 poly=[bb[ij]**2-q*q*cv[ij,ij],2*(bb[ix]*bb[ij]-q*q*cv[ix,ij]),bb[ix]**2-q*q*cv[ix,ix]];roots=np.roots(poly);roots=[float(z.real+df.logpopul.mean()) for z in roots if abs(z.imag)<1e-8 and df.urban_c.min()<=z.real<=df.urban_c.max()]
 ikey=ev(vid+'-interaction','연령 × 환경 지수',bb[ij],'interaction coefficient',[bb[ij]-q*np.sqrt(cv[ij,ij]),bb[ij]+q*np.sqrt(cv[ij,ij])],'OLS interaction; '+('HC3' if robust else 'classical')+' t','환경 지수 한 로그단위에 따른 연령 기울기의 변화.','0을 포함하는 구간은 상호작용이 없다는 입증이 아니다. 관측 범위의 pointwise 추론이며 전체 연속범위의 동시 검정이 아니다.',extra={'p':float(np.asarray(f.pvalues)[ij])})
 mod_vars.append({'id':vid,'label':'HC3 조건부 효과' if robust else '고전적 조건부 효과','kind':'moderation','n':944,'slopes':slopes,'curves':curves,'jn':jn,'jnRoots':roots,'interaction':DETAIL[ikey],'key':ikey})
family('moderation','Interaction / Moderation','조건','환경 지수에 따라 연령의 기울기가 달라지는가?','조건부 기울기와 상호작용 자체의 불확실성을 구분한다',mod_vars)

# SEM actual-data fit, reference comparison and latent indirect association.
desc="""ind60 =~ x1 + x2 + x3
dem60 =~ y1 + y2 + y3 + y4
dem65 =~ y5 + y6 + y7 + y8
dem60 ~ a*ind60
dem65 ~ c*ind60 + b*dem60
y1 ~~ y5
y2 ~~ y4 + y6
y3 ~~ y7
y4 ~~ y8
y6 ~~ y8"""
(RAW/'sem-model.txt').write_text(desc,encoding='utf-8')
sem_variants=[];models={}
for reduced in [False,True]:
 dd='\n'.join(x for x in desc.splitlines() if '~~' not in x) if reduced else desc
 m=semopy.Model(dd);res=m.fit(pd_data,obj='MLW',solver='SLSQP',options={'ftol':1e-12,'maxiter':1000});assert res.success
 models[reduced]=m;ins=m.inspect(std_est=True);fits=semopy.calc_stats(m).iloc[0].to_dict();vid='sem-reduced' if reduced else 'sem-full';pars=[]
 for i,row in ins.iterrows():
  raw=row['Estimate'];se=row['Std. Err'];fixed=isinstance(se,str);ci=None if fixed else [raw-1.96*se,raw+1.96*se];name=row['lval']+' '+row['op']+' '+row['rval'];key=ev(vid+'-param-'+str(i),name,raw,'unstandardized B',ci,'MLW/SLSQP; expected-Fisher normal CI' if not fixed else 'Fixed identification parameter','측정 적재량/구조 경로/공분산/분산을 op와 변수 역할로 구분한다.','모형 적합은 인과 식별을 뜻하지 않는다. 그래프의 잔차 공분산과 총 공분산을 혼동하지 않는다. 첫 적재량은1고정이며 유의성 검정을 붙이지 않는다.',source='dem',n=300,extra={'standardized':row.get('Est. Std'),'fixed':fixed,'se':None if fixed else se,'op':row['op'],'lval':row['lval'],'rval':row['rval']});pars.append({**DETAIL[key],'b':raw,'key':key})
 sem_variants.append({'id':vid,'label':'잔차 공분산6개 포함' if not reduced else '잔차 공분산 생략','kind':'sem','n':300,'fit':fits,'params':pars,'converged':bool(res.success),'iterations':int(res.n_it),'minimumVariance':float(min(ins.loc[(ins.op=='~~')&(ins.lval==ins.rval),'Estimate'])),'key':vid+'-param-0'})
m=models[False];active=[name for name,v in m.parameters.items() if v.active];ix=[active.index(k) for k in ['a','b','c']];theta=m.param_vals[ix];cov=m.calc_fim(inverse=True)[1][np.ix_(ix,ix)];assert np.linalg.eigvalsh(cov).min()>0
a,b,c=theta;draw=rng.multivariate_normal(theta,cov,size=200000,check_valid='raise');ind=draw[:,0]*draw[:,1];tot=draw[:,2]+ind;med_vars=[]
for mc in [True,False]:
 vid='med-mc' if mc else 'med-delta';ee=[]
 for label,val,grad,sim in [('간접 a×b',a*b,np.array([b,a,0]),ind),('직접 c′',c,np.array([0,0,1]),draw[:,2]),('총 c′+a×b',c+a*b,np.array([b,a,1]),tot)]:
  se=np.sqrt(grad@cov@grad);ci=np.quantile(sim,[.025,.975]) if mc else [val-1.96*se,val+1.96*se];key=ev(vid+'-'+str(len(ee)),label,val,'latent-scale B',ci,'Parametric Monte Carlo200000,expected-Fisher covariance,seed20261019' if mc else 'First-order delta normal CI,full covariance','ind60 → dem60 → dem65의 모형상 간접 연관 및 직접/총 연관.','정규모수 근사에 기반하며 비모수 bootstrap이 아니다. 관측자료의 동시점 ind60/dem60 경로는 인과적 매개를 식별하지 않는다. 측정모형과 잔차 공분산6개를 포함한 동일 SEM에서 계산했다.',source='dem',n=300,extra={'seDelta':se,'a':a,'b':b,'cPrime':c,'covABC':cov});ee.append({'label':label,'b':val,'lo':ci[0],'hi':ci[1],'key':key})
 med_vars.append({'id':vid,'label':'Monte Carlo 구간' if mc else 'Delta-method 구간','kind':'mediation','n':300,'effects':ee,'a':a,'b':b,'c':c,'key':ee[0]['key']})
family('mediation','Mediation','구조','가상 자원와 이후 가상 참여·성과의 간접 연결은 어떻게 추정되는가?','간접 연결의 구간을 인과적 매개의 입증과 구분한다',med_vars,'dem')
family('sem','SEM','구조','측정 모형과 잔차 구조를 함께 보면 무엇이 달라지는가?','구조 경로와 측정·잔차 모형을 함께 읽는다',sem_variants,'dem')

versions={x.__name__:x.__version__ for x in [np,pd,scipy,statsmodels,semopy]}
full=sem_variants[0]['fit'];reduced=sem_variants[1]['fit']
audit.extend([
 {'check':'SEM full/reduced convergence','pass':all(x['converged'] for x in sem_variants)},
 {'check':'SEM positive residual variances','pass':all(x['minimumVariance']>0 for x in sem_variants)},
 {'check':'SEM dimensions','pass':full['DoF']==35 and reduced['DoF']-full['DoF']==6},
 {'check':'nested ML objective','pass':reduced['chi2']>=full['chi2']-1e-6},
 {'check':'OLS normal equations','pass':bool(np.max(np.abs(fit.model.exog.T@fit.resid))<1e-7)},
 {'check':'same regression point estimates','pass':bool(np.allclose([c['b'] for c in regvars[0]['coef']],[c['b'] for c in regvars[1]['coef']]))},
 {'check':'chi squared independent formula','pass':all(abs(v['stat']-sum((c['obs']-c['expected'])**2/c['expected'] for c in v['cells']))<1e-8 for v in chi_variants)},
 {'check':'all factorial cells conserve N','pass':all(sum(c['n'] for c in v['cells'])==len(df) for v in two_vars)},
 {'check':'mediation identities','pass':all(abs(v['effects'][0]['b']+v['effects'][1]['b']-v['effects'][2]['b'])<1e-12 for v in med_vars)}
])
out=clean({'version':'synthetic-complete-1','seed':20261019,'datasets':sources,'families':families,'details':DETAIL,'versions':versions,'analysisScope':'Fully synthetic data; numerical and rendering verification only. No empirical claims. Generator seed821202610; analysis seed20261019.','referenceChecks':audit})
(OUT/'analyses.json').write_text(json.dumps(out,ensure_ascii=False,allow_nan=False,separators=(',',':')),encoding='utf-8')
(P/'analysis-reference-checks.json').write_text(json.dumps(clean(audit),ensure_ascii=False,indent=2),encoding='utf-8')
(P/'versions.json').write_text(json.dumps(versions,indent=2),encoding='utf-8')
print(json.dumps({'families':len(families),'variants':sum(len(x['variants']) for x in families),'evidence':len(DETAIL),'n':[len(df),len(pd_data)],'checks':clean(audit),'versions':versions}))
assert all(x['pass'] for x in audit)
