import {
  SIM_LIMITS, WEIGHT_NAMES, type ConfigurationRequest, type SimStrategy, type SimulationRequest, type WeightName,
} from '../../../api/simulations';

/** Form state keeps every field as text so the admin can type freely; it is validated and converted on run. */
export interface ConfigDraft {
  key: number;
  name: string;
  strategy: SimStrategy;
  technicians: string; // empty = all technicians
  weights: Record<WeightName, string>;
}
export interface RunDraft { lastIncidents: string; speedUp: string; configs: ConfigDraft[] }

export interface ConfigErrors { name?: string; technicians?: string; weights?: Partial<Record<WeightName, string>>; weightSum?: string }
export interface RunErrors { lastIncidents?: string; speedUp?: string; configs: ConfigErrors[]; count?: string }

export const effectiveName = (c: ConfigDraft, i: number) => c.name.trim() || `Configuration ${i + 1}`;
const isNum = (s: string) => s.trim() !== '' && Number.isFinite(Number(s));

export function validateRun(d: RunDraft): RunErrors {
  const L = SIM_LIMITS;
  const e: RunErrors = { configs: [] };
  if (!isNum(d.lastIncidents) || !Number.isInteger(Number(d.lastIncidents)) || Number(d.lastIncidents) < L.incidentsMin || Number(d.lastIncidents) > L.incidentsMax) {
    e.lastIncidents = `Whole number from ${L.incidentsMin} to ${L.incidentsMax}`;
  }
  if (!isNum(d.speedUp) || Number(d.speedUp) < L.speedUpMin || Number(d.speedUp) > L.speedUpMax) {
    e.speedUp = `Number from ${L.speedUpMin} to ${L.speedUpMax}`;
  }
  if (d.configs.length < 1 || d.configs.length > L.maxConfigurations) e.count = `Use 1 to ${L.maxConfigurations} configurations`;
  e.configs = d.configs.map((c) => {
    const ce: ConfigErrors = {};
    const idx = d.configs.indexOf(c);
    const eff = effectiveName(c, idx);
    if (eff.length > L.nameMax) ce.name = `At most ${L.nameMax} characters`;
    else if (d.configs.some((o, j) => j !== idx && effectiveName(o, j) === eff)) ce.name = 'Names must differ so the results can be told apart';
    if (c.technicians.trim() !== '') {
      const n = Number(c.technicians);
      if (!isNum(c.technicians) || !Number.isInteger(n) || n < L.techniciansMin || n > L.techniciansMax) {
        ce.technicians = `Whole number from ${L.techniciansMin} to ${L.techniciansMax}, or empty for everyone`;
      }
    }
    let sum = 0;
    let allOk = true;
    for (const w of WEIGHT_NAMES) {
      const v = c.weights[w];
      if (!isNum(v) || Number(v) < 0 || Number(v) > 1) {
        (ce.weights ??= {})[w] = 'Number from 0 to 1';
        allOk = false;
      } else sum += Number(v);
    }
    if (allOk && Math.abs(sum - 1) > L.weightSumTolerance) ce.weightSum = `The five weights must add up to 1.0 (now ${Math.round(sum * 10000) / 10000})`;
    return ce;
  });
  return e;
}

export const hasErrors = (e: RunErrors) =>
  !!e.lastIncidents || !!e.speedUp || !!e.count ||
  e.configs.some((c) => c.name || c.technicians || c.weights || c.weightSum);

export function toRequest(d: RunDraft): SimulationRequest {
  return {
    lastIncidents: Number(d.lastIncidents),
    speedUp: Number(d.speedUp),
    configurations: d.configs.map((c): ConfigurationRequest => ({
      name: effectiveName(c, d.configs.indexOf(c)),
      strategy: c.strategy,
      weights: Object.fromEntries(WEIGHT_NAMES.map((w) => [w, Number(c.weights[w])])) as Record<WeightName, number>,
      technicians: c.technicians.trim() === '' ? undefined : Number(c.technicians),
    })),
  };
}
