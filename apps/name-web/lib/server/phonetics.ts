// MVP §3: this service's adopted initial-consonant table, not a universal naming rule.
export const PHONETICS_VERSION = 'initial-adjacent-undirected-v1';
const initials = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const elements = [...'목목화화화화수수수금금토금금금목화수토'];
const generating = ['목화', '화토', '토금', '금수', '수목'];

export function phonetics(name: string) {
  if (!/^[가-힣]{1,7}$/.test(name)) throw new Error('INVALID_HANGUL_NAME');
  const syllables = [...name].map(character => {
    const index = Math.floor((character.codePointAt(0)! - 0xac00) / 588);
    return { character, initial: initials[index], element: elements[index] };
  });
  const pairs = syllables.slice(1).map((right, index) => {
    const left = syllables[index];
    const relation = left.element === right.element ? '동일 오행'
      : generating.includes(left.element + right.element) || generating.includes(right.element + left.element) ? '상생' : '상극';
    return { left: left.character, right: right.character, relation };
  });
  return { syllables, pairs, conflicts: pairs.filter(pair => pair.relation === '상극').length };
}
