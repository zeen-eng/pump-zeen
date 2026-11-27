// خصائص الماء والجو — معادلات تجريبية معروفة
export const G = 9.81;

// الكثافة (كغ/م³) — Tanaka et al. 2001 (صيغة Thiesen المبسطة)
export function density(T) {
  return 1000 * (1 - ((T + 288.9414) / (508929.2 * (T + 68.12963))) * (T - 3.9863) ** 2);
}
// اللزوجة الديناميكية (باسكال·ث) — Vogel
export function viscosity(T) {
  return 2.414e-5 * 10 ** (247.8 / (T + 133.15));
}
// ضغط البخار (باسكال) — Buck 1981
export function vaporPressure(T) {
  return 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
}
// الضغط الجوي مع الارتفاع (باسكال) — الجو القياسي ISA
export function atmPressure(z) {
  return 101325 * (1 - 2.25577e-5 * z) ** 5.25588;
}
export function water(T) {
  return { rho: density(T), mu: viscosity(T), pv: vaporPressure(T) };
}
