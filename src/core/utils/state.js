const VALID_UF = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]);

const STATE_TO_UF = {
  acre:"AC", alagoas:"AL", amapa:"AP", amazonas:"AM",
  bahia:"BA", ceara:"CE", distritofederal:"DF", espiritosanto:"ES",
  goias:"GO", maranhao:"MA", matogrosso:"MT", matogrossodosul:"MS",
  minasgerais:"MG", para:"PA", paraiba:"PB", parana:"PR",
  pernambuco:"PE", piaui:"PI", riodejaneiro:"RJ", riograndedonorte:"RN",
  riograndedosul:"RS", rondonia:"RO", roraima:"RR", santacatarina:"SC",
  saopaulo:"SP", sergipe:"SE", tocantins:"TO",
};

export function normalizeStateToUF(state) {
  const upper = String(state || "").trim().toUpperCase();
  if (VALID_UF.has(upper)) return upper;

  const key = String(state || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");

  return STATE_TO_UF[key] || upper;
}
