export function validateClip(start: number, end: number, duration: number) {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    end > duration
  )
    throw Error('시작은 0 이상, 끝은 시작보다 크고 영상 길이 이하여야 합니다.');
  return { start, end };
}
