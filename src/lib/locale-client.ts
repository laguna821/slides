const strings:Record<string,string>={
  "밝은 화면으로 전환": "Switch to light mode",
  "어두운 화면으로 전환": "Switch to dark mode",
  "복사했습니다.": "Copied.",
  "본문을 불러오지 못했습니다. Markdown 저장을 이용해 주세요.": "Could not load the text. Please use Save Markdown.",
  "문단 링크 복사": "Copy section link",
  "코드 복사": "Copy code",
  " 확대": " — enlarge",
  " 구간 보기": " — view segment",
  " 포스터 보기": " — view poster",
  " 읽기": " — read",
  "검색 데이터를 불러오지 못했습니다. 전체 자료를 둘러보거나 새로고침해 주세요.": "Could not load search data. Browse all resources or refresh.",
  "이 영상 길이에 맞게 구간을 다시 지정해 주세요.": "Please choose a segment within this video’s duration.",
  "영상을 불러오지 못했습니다. 원본 영상 링크를 이용해 주세요.": "Could not load the video. Please use the original video link.",
  "영상을 불러오지 못했습니다.": "Could not load the video.",
  "전체 영상을 재생합니다.": "Playing the full video.",
  "재생을 시작하지 못했습니다.": "Could not start playback.",
  "플레이어의 전체화면 버튼을 사용해 주세요.": "Please use the player’s fullscreen button.",
  "영상": "Video",
  "아래 내용을 선택해 복사해 주세요.": "Select and copy the content below.",
  "구간을 확인해 주세요.": "Please check the segment."
};
export const isEnglish=()=>document.documentElement.lang==='en';
export const ui=(s:string)=>isEnglish()?(strings[s]||s):s;
