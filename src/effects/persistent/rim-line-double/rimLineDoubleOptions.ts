import { clamp, clamp01, mergeOptions } from '../../../core/effectConfig'
import {
  RIM_LINE_SHADER_DEFAULTS,
  resolveRimLineShaderOptions,
  type ResolvedRimLineShaderOptions,
  type RimLineShaderOptions,
} from '../rim-line/rimLineShaderOptions'

export interface RimLineDoubleOptions extends RimLineShaderOptions {
  intensity?: number
  oppositeOffset?: number
}

export interface ResolvedRimLineDoubleOptions extends ResolvedRimLineShaderOptions {
  intensity: number
  oppositeOffset: number
}

export const RIM_LINE_DOUBLE_DEFAULTS: ResolvedRimLineDoubleOptions = {
  ...RIM_LINE_SHADER_DEFAULTS,
  intensity: 0.78,
  oppositeOffset: 0.5,
}

export function resolveRimLineDoubleOptions(
  options: RimLineDoubleOptions | undefined,
): ResolvedRimLineDoubleOptions {
  const shader = resolveRimLineShaderOptions(options)
  const merged = mergeOptions(RIM_LINE_DOUBLE_DEFAULTS, options)

  return {
    ...shader,
    intensity: clamp(merged.intensity, 0, 2),
    oppositeOffset: clamp01(merged.oppositeOffset),
  }
}
