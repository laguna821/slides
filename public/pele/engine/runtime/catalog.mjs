// Original Achmage selection guidance and small synthetic fixtures, checked against Pele 1.6.0.
// Budgets guide composition; they are not parser limits or claims of universal readability.
const rows=[
 ['flowchart','흐름과 판단','과정','어느 조건에서 다음 단계가 달라지는가','순서가 없는 단순 목록',9,360,'방향·그룹 간 연결을 확인한다.','단계별 목록',`flowchart TB
 A[질문 정의] --> B{근거 충분}
 B -->|예| C[조건부 채택]
 B -->|아니오| D[보완 요청]
 %% @key: C
 %% @aux: D`],
 ['sequence','메시지 순서','과정','누가 누구에게 언제 요청하는가','조직의 정적인 소속 관계',4,560,'자기 호출과 긴 메시지는 겹침을 직접 확인한다.','메시지 순서 표',`sequenceDiagram
 participant A as 연구자
 participant B as 검토자
 A->>B: 근거 제출
 B-->>A: 보완 의견
 A->>B: 수정 자료`],
 ['class','객체 구조','시스템','객체의 속성과 의존 관계는 무엇인가','실제 처리 순서',6,560,'속성이 많으면 핵심 클래스와 상세 표를 분리한다.','속성·관계 표',`classDiagram
 class Study {
 +String title
 +review()
 }
 class Evidence {
 +String source
 }
 Study "1" --> "many" Evidence`],
 ['state','상태 전이','과정','어떤 사건이 상태를 바꾸는가','단순 일정',7,360,'종료·재진입 조건을 라벨로 남긴다.','전이 표',`stateDiagram-v2
 [*] --> 접수
 접수 --> 검토: 자료 확보
 검토 --> 보완: 근거 부족
 보완 --> 검토: 재제출
 검토 --> 완료: 승인
 완료 --> [*]`],
 ['er','데이터 관계','시스템','개체 간 수량 관계는 무엇인가','속성 값의 크기 비교',5,760,'카디널리티와 긴 속성이 좁은 화면에서 혼잡하다.','개체·키·관계 표',`erDiagram
 STUDY ||--o{ EVIDENCE : includes
 STUDY {
 int id PK
 string title
 }
 EVIDENCE {
 int id PK
 string source
 }`],
 ['pie','부분과 전체','수량','서로 배타적인 항목의 구성비는 얼마인가','음수·겹치는 범주·미세한 차이',5,360,'전체 분모를 명시한다. 정확한 비교는 막대와 표가 낫다.','구성비 표',`pie showData
 title 검토 상태
 "완료" : 18
 "보완" : 8
 "대기" : 4`],
 ['gantt','작업 일정','시간','작업 기간과 의존 관계는 무엇인가','기한이 없는 아이디어 목록',8,640,'기준일을 고정하고 실제 날짜와 기간을 함께 검토한다.','일정 표',`gantt
 title 자료 검토 일정
 dateFormat YYYY-MM-DD
 section 검토
 수집 :a, 2026-10-01, 3d
 분석 :b, after a, 4d
 작성 :c, after b, 2d`],
 ['gitGraph','분기 이력','시간','분기가 어디서 갈라지고 합쳐졌는가','일반 조직도',8,560,'분기 색 위 글자 대비와 병합 순서를 확인한다.','커밋·분기 목록',`gitGraph
 commit id: "초안"
 branch review
 checkout review
 commit id: "검토"
 checkout main
 merge review
 commit id: "발행"`],
 ['mindmap','개념 확장','구조','중심 개념을 어떤 갈래로 나눌 것인가','인과·수량·정확한 시간 순서',12,360,'계층과 연상의 차이를 설명하고 긴 가지는 분리한다.','계층 목록',`mindmap
 root((근거))
  정량
   표본
   불확실성
  정성
   맥락
   반례`],
 ['timeline','사건 연표','시간','주요 사건이 어떤 순서로 발생했는가','기간과 의존성을 동시에 비교',6,480,'시점 간 간격이 실제 기간을 비례 표현한다고 해석하지 않는다.','사건 표',`timeline
 title 검토 기록
 2026년 8월 : 질문 정의
 2026년 9월 : 자료 수집
 2026년 10월 : 비교 검토`],
 ['journey','경험 단계','과정','단계별 경험은 어떻게 달라지는가','검증되지 않은 감정을 객관 수치로 제시',6,560,'점수 척도와 응답 주체를 명시한다.','단계·경험 표',`journey
 title 자료 이용 경험
 section 준비
 질문 찾기: 3: 연구자
 자료 읽기: 4: 연구자
 section 판단
 근거 대조: 2: 연구자
 결과 공유: 4: 연구자`],
 ['xychart','축과 수량','수량','같은 척도에서 값은 어떻게 달라지는가','서로 다른 분모·단위의 무설명 결합',8,480,'축 라벨이 생략될 수 있다. 원자료 표와 표시 라벨을 대조한다.','원자료 표',`xychart-beta
 x-axis ["1분기","2분기","3분기","4분기"]
 y-axis "검토 건수" 0 --> 40
 bar [12,24,20,32]`],
 ['quadrantChart','두 기준 분류','판단','두 기준에서 항목은 어느 위치인가','실측치가 없는 위치를 정밀 순위로 해석',6,560,'축 정의·정규화 기준과 구두점 문법을 확인한다.','두 기준 평가표',`quadrantChart
 title 과제 검토
 x-axis 낮은 준비 --> 높은 준비
 y-axis 낮은 가치 --> 높은 가치
 quadrant-1 우선 검토
 quadrant-2 준비 보강
 quadrant-3 보류
 quadrant-4 선택 수행
 연구: [0.7,0.8]
 교육: [0.3,0.7]`],
 ['requirement','요구와 검증','시스템','어떤 요소가 요구사항을 충족하는가','단순 할 일 목록',4,760,'긴 설명과 관계 유형을 표로 함께 제공한다.','요구·검증 추적표',`requirementDiagram
 requirement evidence {
 id: 1
 text: Source must be traceable
 risk: high
 verifymethod: inspection
 }
 element record {
 type: document
 }
 record - satisfies -> evidence`],
 ['c4','시스템 경계','시스템','사용자와 시스템 경계는 어디인가','상세 호출 순서',6,640,'추상화 수준을 하나로 맞추고 경계 의미를 설명한다.','시스템·연결 목록',`C4Context
 Person(researcher, "연구자")
 System(library, "근거 라이브러리")
 System_Ext(source, "원문 저장소")
 Rel(researcher, library, "조회")
 Rel(library, source, "원문 연결")`],
 ['sankey','유량 이동','수량','어디에서 어디로 얼마나 이동했는가','한글 이름 필수·보존되지 않는 흐름량',6,640,'Pele 1.6.0은 ASCII 입력을 요구한다. 한글 원자료를 임의 영문화하지 않는다.','한글 흐름 표',`sankey-beta
 Collected,Reviewed,24
 Collected,Pending,6
 Reviewed,Accepted,18
 Reviewed,Revision,6`],
 ['block','영역 배치','구조','고정된 자리와 묶음을 어떻게 보여줄 것인가','자동 배치가 더 적절한 큰 관계망',9,480,'열 수와 줄바꿈은 작성자가 설계한다.','구역 목록',`block-beta
 columns 3
 A["질문"] B["근거"] C["판단"]
 D["범위"] E["반례"] F["한계"]`],
 ['packet','필드 구조','시스템','정해진 비트 구간을 어떻게 나누는가','일반적인 화면 배치',8,480,'비트 범위의 연속성과 중복을 확인한다.','필드·범위 표',`packet-beta
 0-7: "식별자"
 8-15: "상태"
 16-31: "자료 길이"`],
 ['kanban','작업 상태판','과정','어떤 작업이 어느 상태에 있는가','상태 이동의 조건 설명',9,560,'정적 그림에는 실제 드래그·저장 기능이 없다.','상태별 작업 목록',`kanban
 todo[접수]
  a[원문 확보]
 doing[검토]
  b[근거 대조]
 done[완료]
  c[질문 정의]`],
 ['architecture','서비스 연결','시스템','서비스와 저장소가 어떻게 연결되는가','비기술 독자에게 추상 기호만 제시',6,640,'포트 방향과 그룹 연결을 확인한다.','서비스 연결표',`architecture-beta
 service api(server)[API]
 service db(database)[자료]
 api:R --> L:db`],
 ['radar','다기준 윤곽','수량','같은 척도의 여러 기준이 어떻게 다른가','면적만으로 우열을 단정',6,480,'축 순서·범위에 따라 인상이 달라진다. 수치를 병기한다.','기준별 점수 표',`radar-beta
 axis a["명료성"], b["근거"], c["재현성"]
 curve x["초안"]{3,4,2}
 curve y["수정"]{4,4,4}
 max 5
 min 0`],
 ['treemap','계층 구성비','수량','계층별 부분의 크기는 얼마인가','작은 항목도 반드시 읽혀야 하는 지면',8,640,'작은 타일과 라벨이 사라질 수 있다. 모든 항목을 표에 남긴다.','계층별 수량 표',`treemap-beta
 "검토"
  "완료": 18
  "보완": 8
  "대기": 4`],
 ['agentflow','에이전트 작업','과정','입력과 판단이 어떤 역할을 거치는가','실제 자동 실행이 있다고 오인할 설명',7,480,'다이어그램은 실행 권한이나 실제 연결 증거가 아니다.','역할·입출력 표',`agentflow-beta TB
 a["질문 접수"] --> b["근거 검토"]
 b --> c["사람의 판단"]`],
 ['usecase','사용자 목표','시스템','누가 시스템에서 무엇을 달성하는가','화면 이동 순서를 설명',6,560,'사용자 역할과 기능을 구별한다.','역할·목표 표',`usecase-beta
 direction LR
 actor User("연구자")
 systemBoundary "라이브러리"
  Search("근거 찾기")
  Review("원문 검토")
 end
 User --> Search
 User --> Review`],
 ['railroad','문법 경로','구조','입력이 어떤 조합으로 유효해지는가','실행 순서나 확률',5,480,'반복과 선택의 의미를 설명한다.','EBNF 원문',`railroad-ebnf-beta
 query = "find" name [ "in" collection ] ;`],
 ['treeView','계층 목록','구조','파일과 항목이 어디에 속하는가','여러 부모를 갖는 관계망',12,360,'깊은 들여쓰기를 줄이되 계층을 숨기지 않는다.','중첩 목록',`treeView-beta
├── 원문/
├── 분석/
└── 결과/
    └── 보고서.md`],
 ['venn','집합의 겹침','구조','범주가 어디서 겹치는가','정밀한 면적 비교나 많은 집합',3,480,'겹침 라벨과 정량 면적의 보장 범위를 구별한다.','교집합 표',`venn-beta
 set A["연구"]
 set B["교육"]
 union A,B["근거 활용"]`],
 ['cynefin','상황 분류','판단','문제에 어떤 대응 방식이 필요한가','확정적인 인과 분석',5,760,'분류는 해석이며 점수나 순위가 아니다.','영역별 판단표',`cynefin-beta
 title 문제의 성격
 complex
  "새로운 현상"
 complicated
  "전문 검토"
 clear
  "확인된 절차"
 chaotic
  "즉각 대응"
 confusion
  "추가 파악"`],
 ['wardley','가치와 성숙도','판단','사용자 가치와 구성요소의 성숙도는 무엇인가','근거 없는 좌표의 객관화',6,640,'좌표는 판단 기준과 근거를 함께 기록한다.','구성요소 평가표',`wardley-beta
 title 근거 서비스
 anchor Reader [0.95, 0.7]
 component Review [0.65, 0.4]
 component Storage [0.2, 0.85]
 Reader -> Review
 Review -> Storage`],
 ['swimlane','역할별 과정','과정','어떤 역할이 어느 단계에 책임지는가','책임 구분이 필요 없는 짧은 절차',8,640,'좁은 화면에서도 역할과 단계 대응을 확인한다.','책임·단계 표',`swimlane-beta LR
 subgraph 연구자
  A[자료 제출]
 end
 subgraph 검토자
  B[근거 확인]
  C[판단 기록]
 end
 A --> B --> C`],
 ['ishikawa','원인 후보','판단','문제에 기여할 원인은 무엇인가','검증된 인과 효과로 주장',10,640,'후보 원인과 확인된 원인을 글로 구분한다.','원인 후보 목록',`ishikawa-beta
    재작업 증가
    자료
        출처 누락
        분모 차이
    절차
        검토 지연
    소통
        기준 불명확`],
 ['eventmodeling','사건과 명령','시스템','명령이 어떤 사건과 화면 변화를 만드는가','단순 연표',6,640,'시간 프레임과 명령·사건을 혼동하지 않는다.','명령·사건 표',`eventmodeling
 tf 01 ui ReviewForm
 tf 02 cmd SubmitEvidence
 tf 03 evt EvidenceSubmitted`],
 ['info','렌더러 진단','진단','설치된 엔진이 응답하는가','콘텐츠 도표로 사용',1,360,'엔진 진단은 전체 기능 검증이 아니다.','버전 manifest',`info`]
];
const recent=new Set(['agentflow','usecase','railroad','treeView','venn','cynefin','wardley','swimlane','ishikawa','eventmodeling']);
export const catalog=rows.map(([id,name,purpose,use,avoid,budget,minWidth,limits,fallback,source])=>({id,name,purpose,use,avoid,budget,minWidth,limits,fallback,source,surfaces:minWidth>560?['web','report','image']:['web','slide','report','note','image'],noteCompatibility:recent.has(id)?'호스트 Mermaid 버전 확인 필수; SVG 대체 권장':'호스트 버전별 문법 확인; 이 PC의 실제 Obsidian은 미검증',exampleData:'가상 자료',official:`https://pele.run/examples/${id==='treeView'?'treeview':id==='gitGraph'?'gitgraph':id==='quadrantChart'?'quadrant':id}`}));
